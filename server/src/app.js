import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { User, Profile, Attempt, Question } from './models.js';
import { careers, resources, skillNames } from './catalog.js';
import {
  registration,
  credentials,
  profileInput,
  startInput,
  answerInput,
  questionInput,
  parse,
} from './validation.js';
import { analytics, guidance } from './guidance.js';
import { getQuestions } from './quiz-provider.js';
import { ensureEnrollment, mountEnrollmentRoutes, requireSubscription } from './enrollment.js';
import { createPayments } from './payments.js';
import { approvedSkillNames, validateApprovedSkills, mountSkillRequests, skillDomains } from './skill-requests.js';

const fail = (status, message) => Object.assign(new Error(message), { status });
const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role });
const publicProfile = (p) => ({ ...p.toObject(), version: p.__v });
function publicAttempt(a) {
  const obj = a.toObject ? a.toObject() : a;
  if (obj.status === 'submitted') return obj;
  return {
    ...obj,
    questions: obj.questions.map(({ skill, prompt, options }) => ({ skill, prompt, options })),
  };
}
export function createApp(options) {
  const app = express();
  const payments = createPayments(options);
  app.disable('x-powered-by');
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          'script-src': ["'self'", 'https://checkout.razorpay.com'],
          'frame-src': ["'self'", 'https://*.razorpay.com'],
          'connect-src': ["'self'", 'https://*.razorpay.com'],
          'style-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:', 'https://*.razorpay.com'],
          'upgrade-insecure-requests': options.secure ? [] : null,
        },
      },
      strictTransportSecurity: options.secure ? undefined : false,
    }),
  );
  // Signed provider webhook needs raw bytes and is deliberately separate from
  // browser CSRF protection. Every other mutation retains the original checks.
  app.post('/api/billing/webhook', express.raw({ type: 'application/json', limit: '100kb' }), payments.webhook);
  app.use(express.json({ limit: '100kb' }), cookieParser());
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    // Cross-origin forms cannot supply this header; cross-origin scripts get no CORS grant.
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
      req.get('X-Requested-With') !== 'PathPilot'
    )
      return next(fail(403, 'Missing request protection header.'));
    if (req.get('Sec-Fetch-Site') === 'cross-site')
      return next(fail(403, 'Cross-site requests are not allowed.'));
    next();
  });
  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      limit: options.rateLimit ?? 180,
      // Per-instance demo limiter; do not trust arbitrary client-supplied forwarding chains.
      // createApp is lazily initialized once per warm Vercel function, then cached.
      ...(options.serverless ? { validate: { xForwardedForHeader: false, creationStack: false } } : {}),
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { message: 'Too many requests. Please wait a minute.' },
    }),
  );
  const authLimit = rateLimit({
    windowMs: 15 * 60_000,
    limit: options.authLimit ?? 30,
    ...(options.serverless ? { validate: { xForwardedForHeader: false, creationStack: false } } : {}),
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message: 'Too many sign-in attempts. Try again in 15 minutes.' },
  });
  const cookie = {
    httpOnly: true,
    secure: options.secure,
    sameSite: 'strict',
    path: '/api',
    maxAge: 8 * 60 * 60 * 1000,
  };
  function setSession(res, u) {
    res.cookie(
      'pilot_session',
      jwt.sign({ sub: String(u._id) }, options.jwtSecret, {
        expiresIn: '8h',
        issuer: 'path-pilot',
        audience: 'path-pilot-web',
      }),
      cookie,
    );
  }
  async function auth(req, res, next) {
    let payload;
    try {
      payload = jwt.verify(req.cookies.pilot_session || '', options.jwtSecret, {
        algorithms: ['HS256'],
        issuer: 'path-pilot',
        audience: 'path-pilot-web',
      });
    } catch {
      return next(fail(401, 'Please sign in to continue.'));
    }
    const user = await User.findById(payload.sub);
    if (!user) return next(fail(401, 'Please sign in to continue.'));
    req.user = user;
    next();
  }
  const admin = (req, res, next) =>
    req.user.role === 'admin' ? next() : next(fail(403, 'Administrator access is required.'));
  const student = (req, res, next) =>
    req.user.role === 'student' ? next() : next(fail(403, 'A student account is required.'));
  async function profileFor(user) {
    return Profile.findOneAndUpdate(
      { user },
      { $setOnInsert: { user } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
  function objectId(req, res, next) {
    if (!mongoose.isValidObjectId(req.params.id))
      return next(fail(400, 'Invalid record identifier.'));
    next();
  }

  app.get('/api/health', (req, res) =>
    res
      .status(mongoose.connection.readyState === 1 ? 200 : 503)
      .json({ status: mongoose.connection.readyState === 1 ? 'ok' : 'database unavailable' }),
  );
  app.post('/api/auth/register', authLimit, async (req, res) => {
    const input = parse(registration, req.body);
    const user = await User.create({
      ...input,
      passwordHash: await bcrypt.hash(input.password, 12),
      role: 'student',
    });
    await ensureEnrollment(user);
    setSession(res, user);
    res.status(201).json(publicUser(user));
  });
  app.post('/api/auth/login', authLimit, async (req, res) => {
    const { email, password } = parse(credentials, req.body);
    const user = await User.findOne({ email }).select('+passwordHash');
    // Dummy comparison reduces obvious user-enumeration timing differences.
    const valid = await bcrypt.compare(
      password,
      user?.passwordHash ?? '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW',
    );
    if (!user || !valid) throw fail(401, 'Email or password is incorrect.');
    setSession(res, user);
    res.json(publicUser(user));
  });
  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('pilot_session', {
      httpOnly: true,
      secure: options.secure,
      sameSite: 'strict',
      path: '/api',
    });
    res.status(204).end();
  });
  app.get('/api/auth/me', auth, (req, res) => res.json(publicUser(req.user)));
  app.get('/api/catalog', auth, (req, res, next) => req.user.role === 'admin' ? next() : requireSubscription(req, res, next), async (req, res) => res.json({ careers, resources, skillNames: await approvedSkillNames(), skillDomains }));
  app.get('/api/profile', auth, student, requireSubscription, async (req, res) =>
    res.json(publicProfile(await profileFor(req.user._id))),
  );
  app.put('/api/profile', auth, student, requireSubscription, async (req, res) => {
    const { version, ...data } = parse(profileInput, req.body);
    await validateApprovedSkills([...data.skills.map(s => s.name), ...data.topics.map(t => t.skill)]);
    const p = await Profile.findOneAndUpdate(
      { user: req.user._id, __v: version },
      { $set: data, $inc: { __v: 1 } },
      { new: true, runValidators: true },
    );
    if (!p)
      throw fail(409, 'This profile changed in another tab. Reload the page before saving again.');
    res.json(publicProfile(p));
  });
  app.get('/api/analytics', auth, student, requireSubscription, async (req, res) => {
    const [p, a] = await Promise.all([
      profileFor(req.user._id),
      Attempt.find({ user: req.user._id, status: 'submitted' }).lean(),
    ]);
    res.json(analytics(p, a));
  });
  app.get('/api/guidance', auth, student, requireSubscription, async (req, res) => {
    const [p, a] = await Promise.all([
      profileFor(req.user._id),
      Attempt.find({ user: req.user._id, status: 'submitted' }).lean(),
    ]);
    res.json(guidance(p, a));
  });
  app.get('/api/tests', auth, student, requireSubscription, async (req, res) => {
    const groups = await Question.aggregate([
      { $match: { active: true } },
      { $group: { _id: '$skill', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    res.json({ groups, externalEnabled: options.externalEnabled });
  });
  app.get('/api/attempts', auth, student, requireSubscription, async (req, res) =>
    res.json(
      await Attempt.find({ user: req.user._id })
        .select('-questions -answers')
        .sort({ createdAt: -1 })
        .limit(200)
        .lean(),
    ),
  );
  app.post('/api/attempts', auth, student, requireSubscription, async (req, res) => {
    const { source, skill } = parse(startInput, req.body);
    if (skill !== 'Mixed') await validateApprovedSkills([skill]);
    const data = await getQuestions(source, skill, {
      externalEnabled: options.externalEnabled,
      fetchFn: options.fetchFn,
    });
    if (!data.questions.length)
      throw fail(
        503,
        'No active questions for this skill. Choose Mixed or ask an administrator to add questions.',
      );
    const attempt = await Attempt.create({
      ...data,
      user: req.user._id,
      title:
        source === 'external' && data.source === 'Open Trivia DB'
          ? 'Computer fundamentals'
          : `${skill} practice`,
      total: data.questions.length,
    });
    res.status(201).json(publicAttempt(attempt));
  });
  app.get('/api/attempts/:id', auth, student, requireSubscription, objectId, async (req, res) => {
    const a = await Attempt.findOne({ _id: req.params.id, user: req.user._id });
    if (!a) throw fail(404, 'Attempt not found.');
    res.json(publicAttempt(a));
  });
  app.post('/api/attempts/:id/submit', auth, student, requireSubscription, objectId, async (req, res) => {
    const { answers } = parse(answerInput, req.body);
    const a = await Attempt.findOne({ _id: req.params.id, user: req.user._id });
    if (!a) throw fail(404, 'Attempt not found.');
    if (a.status === 'submitted') throw fail(409, 'This test has already been submitted.');
    if (
      answers.length !== a.questions.length ||
      answers.some((v, i) => v >= a.questions[i].options.length)
    )
      throw fail(400, 'Answer every question before submitting.');
    const correct = a.questions.reduce((n, q, i) => n + (answers[i] === q.correctIndex ? 1 : 0), 0);
    const result = await Attempt.findOneAndUpdate(
      { _id: a._id, user: req.user._id, status: 'in-progress' },
      {
        $set: {
          answers,
          correct,
          score: Math.round((correct / a.total) * 100),
          status: 'submitted',
          submittedAt: new Date(),
        },
      },
      { new: true },
    );
    if (!result) throw fail(409, 'This test has already been submitted.');
    res.json(publicAttempt(result));
  });
  mountEnrollmentRoutes(app, { auth, admin });
  mountSkillRequests(app, { auth, student, admin });
  payments.mount(app, { auth, student, admin, profileFor });
  app.get('/api/admin/overview', auth, admin, async (req, res) => {
    const [students, questions, attempts, average] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      Question.countDocuments({ active: true }),
      Attempt.countDocuments({ status: 'submitted' }),
      Attempt.aggregate([
        { $match: { status: 'submitted' } },
        { $group: { _id: null, value: { $avg: '$score' } } },
      ]),
    ]);
    res.json({ students, questions, attempts, averageScore: Math.round(average[0]?.value ?? 0) });
  });
  app.get('/api/admin/students', auth, admin, async (req, res) =>
    res.json(
      await User.find({ role: 'student' })
        .select('name email createdAt')
        .sort({ createdAt: -1 })
        .limit(200)
        .lean(),
    ),
  );
  app.get('/api/admin/questions', auth, admin, async (req, res) =>
    res.json(await Question.find().sort({ createdAt: -1 }).limit(500).lean()),
  );
  app.post('/api/admin/questions', auth, admin, async (req, res) => {
    const data = parse(questionInput, req.body);
    await validateApprovedSkills([data.skill]);
    res.status(201).json(await Question.create(data));
  });
  app.put('/api/admin/questions/:id', auth, admin, objectId, async (req, res) => {
    const data = parse(questionInput, req.body);
    await validateApprovedSkills([data.skill]);
    const q = await Question.findByIdAndUpdate(
      req.params.id,
      { $set: data },
      { new: true, runValidators: true },
    );
    if (!q) throw fail(404, 'Question not found.');
    res.json(q);
  });
  app.use('/api', (req, res, next) => next(fail(404, 'API endpoint not found.')));
  const dist = fileURLToPath(new URL('../../client/dist/path-pilot/browser/', import.meta.url));
  if (options.serveClient !== false && existsSync(dist)) {
    app.use(express.static(dist));
    app.get('/{*path}', (req, res) => res.sendFile(`${dist}/index.html`));
  }
  app.use((err, req, res, next) => {
    if (err instanceof ZodError)
      return res
        .status(400)
        .json({ message: err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') });
    if (err.code === 11000)
      return res.status(409).json({ message: 'This email or record already exists.' });
    if (err.type === 'entity.parse.failed')
      return res.status(400).json({ message: 'Request body must be valid JSON.' });
    if (err.type === 'entity.too.large')
      return res.status(413).json({ message: 'Request is too large.' });
    if (err.name === 'CastError')
      return res.status(400).json({ message: 'Invalid record identifier.' });
    if (!err.status) console.error('Request failed:', err.name);
    res
      .status(err.status || 500)
      .json({ message: err.status ? err.message : 'Something went wrong. Please try again.' });
  });
  return app;
}
