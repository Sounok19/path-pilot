import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { seed } from '../src/seed-data.js';
import { User, Profile, Attempt, Question, Payment } from '../src/models.js';
import { analytics, guidance } from '../src/guidance.js';
import { getQuestions } from '../src/quiz-provider.js';
import { profileInput } from '../src/validation.js';
const headers = { 'X-Requested-With': 'PathPilot' };
let mongo, app, student, admin, other, attempt;
const failFetch = async () => {
  throw new Error('Simulated provider outage');
};
before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Promise.all([User.init(), Profile.init(), Question.init(), Attempt.init()]);
  await seed();
  await Payment.create({ user: (await User.findOne({ email: 'student@pathpilot.local' }))._id, provider: 'test-fixture', amount: 49900, currency: 'INR', durationDays: 30, status: 'paid', open: false, startsAt: new Date(), expiresAt: new Date(Date.now() + 86400000) });
  app = createApp({
    jwtSecret: 'test-only-secret-with-more-than-32-characters',
    secure: false,
    externalEnabled: true,
    fetchFn: failFetch,
    rateLimit: 10000,
    authLimit: 10000,
  });
  student = request.agent(app);
  admin = request.agent(app);
  other = request.agent(app);
  await student
    .post('/api/auth/login')
    .set(headers)
    .send({ email: 'student@pathpilot.local', password: 'PilotLab2026!' })
    .expect(200);
  await admin
    .post('/api/auth/login')
    .set(headers)
    .send({ email: 'admin@pathpilot.local', password: 'PilotLab2026!' })
    .expect(200);
});
after(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});
test('Protected endpoints require authentication and request protection', async () => {
  await request(app).get('/api/profile').expect(401);
  await request(app)
    .post('/api/auth/login')
    .send({ email: 'x@y.com', password: '1234567890' })
    .expect(403);
  await request(app)
    .post('/api/auth/login')
    .set(headers)
    .set('Sec-Fetch-Site', 'cross-site')
    .send({ email: 'x@y.com', password: '1234567890' })
    .expect(403);
  await student.get('/api/admin/overview').expect(403);
  await admin.get('/api/profile').expect(403);
});
test('Registration validates inputs, rejects role escalation, and hashes passwords', async () => {
  await other
    .post('/api/auth/register')
    .set(headers)
    .send({ name: 'B', email: 'bad', password: 'short' })
    .expect(400);
  await other
    .post('/api/auth/register')
    .set(headers)
    .send({
      name: 'Other Student',
      email: 'other@test.local',
      password: 'OtherPilot2026!',
      role: 'admin',
    })
    .expect(400);
  const result = await other
    .post('/api/auth/register')
    .set(headers)
    .send({ name: 'Other Student', email: 'OTHER@test.local', password: 'OtherPilot2026!' })
    .expect(201);
  assert.equal(result.body.role, 'student');
  assert.equal(result.body.email, 'other@test.local');
  assert.equal(result.body.passwordHash, undefined);
  assert.match(result.headers['set-cookie'][0], /HttpOnly/);
  assert.match(result.headers['set-cookie'][0], /SameSite=Strict/);
  const u = await User.findOne({ email: 'other@test.local' }).select('+passwordHash');
  assert.notEqual(u.passwordHash, 'OtherPilot2026!');
  await other.get('/api/profile').expect(403);
  await Payment.create({ user: u._id, provider: 'test-fixture', amount: 49900, currency: 'INR', durationDays: 30, status: 'paid', open: false, startsAt: new Date(), expiresAt: new Date(Date.now() + 86400000) });
  await other
    .post('/api/auth/register')
    .set(headers)
    .send({ name: 'Other Student', email: 'other@test.local', password: 'OtherPilot2026!' })
    .expect(409);
  await request(app)
    .post('/api/auth/login')
    .set(headers)
    .send({ email: 'other@test.local', password: 'WrongPilot2026!' })
    .expect(401);
});
test('Profile data persists, rejects invalid fields and detects stale updates', async () => {
  const original = (await student.get('/api/profile').expect(200)).body;
  const input = profileInput.parse(originalWithVersion(original));
  input.cgpa = 8.6;
  input.topics[0].hours = 12;
  input.skills[0].development = 'Async practice';
  const saved = await student.put('/api/profile').set(headers).send(input).expect(200);
  assert.equal(saved.body.cgpa, 8.6);
  await student.put('/api/profile').set(headers).send(input).expect(409);
  await student
    .put('/api/profile')
    .set(headers)
    .send({ ...input, version: saved.body.version, cgpa: 12 })
    .expect(400);
  await student
    .put('/api/profile')
    .set(headers)
    .send({ ...input, version: saved.body.version, skills: [input.skills[0], input.skills[0]] })
    .expect(400);
  const reloaded = (await student.get('/api/profile')).body;
  assert.equal(reloaded.topics[0].hours, 12);
  assert.equal(reloaded.skills[0].development, 'Async practice');
  const isolated = (await other.get('/api/profile').expect(200)).body;
  assert.equal(isolated.skills.length, 0);
  assert.notEqual(isolated.user, original.user);
});
test('Topics and goals can be added, edited and removed', async () => {
  let p = originalWithVersion((await other.get('/api/profile')).body);
  p.skills = [{ name: 'SQL', level: 50, development: 'Joins' }];
  p.topics = [
    {
      id: 'a380c926-bad0-4c30-94ca-4cb0d75ac285',
      title: 'SQL joins',
      skill: 'SQL',
      progress: 30,
      hours: 2,
    },
  ];
  p.goals = [
    {
      id: 'a380c926-bad0-4c30-94ca-4cb0d75ac286',
      careerId: 'data-analyst',
      targetDate: '2027-06-01',
      status: 'active',
      notes: 'Portfolio',
    },
  ];
  p = originalWithVersion((await other.put('/api/profile').set(headers).send(p).expect(200)).body);
  p.topics[0].progress = 100;
  p.goals[0].status = 'completed';
  p = originalWithVersion((await other.put('/api/profile').set(headers).send(p).expect(200)).body);
  assert.equal(p.topics[0].progress, 100);
  p.topics = [];
  p.goals = [];
  p.skills = [];
  const r = await other.put('/api/profile').set(headers).send(p).expect(200);
  assert.equal(r.body.goals.length, 0);
});
test('Attempts hide answer keys, enforce ownership and evaluate only on server', async () => {
  const r = await student
    .post('/api/attempts')
    .set(headers)
    .send({ source: 'local', skill: 'Mixed' })
    .expect(201);
  attempt = r.body;
  assert.ok(attempt.questions.length > 0);
  assert.equal(attempt.questions[0].correctIndex, undefined);
  assert.equal(attempt.questions[0].explanation, undefined);
  await other.get(`/api/attempts/${attempt._id}`).expect(404);
  await other
    .post(`/api/attempts/${attempt._id}/submit`)
    .set(headers)
    .send({ answers: Array(attempt.total).fill(0) })
    .expect(404);
  await student
    .post(`/api/attempts/${attempt._id}/submit`)
    .set(headers)
    .send({ answers: [] })
    .expect(400);
  await student
    .post(`/api/attempts/${attempt._id}/submit`)
    .set(headers)
    .send({ answers: Array(attempt.total).fill(0), score: 100 })
    .expect(400);
  const stored = await Attempt.findById(attempt._id);
  const answers = stored.questions.map((q) => q.correctIndex);
  const result = await student
    .post(`/api/attempts/${attempt._id}/submit`)
    .set(headers)
    .send({ answers })
    .expect(200);
  assert.equal(result.body.score, 100);
  assert.equal(result.body.correct, attempt.total);
  await student
    .post(`/api/attempts/${attempt._id}/submit`)
    .set(headers)
    .send({ answers })
    .expect(409);
  const history = (await student.get('/api/attempts')).body;
  assert.ok(history.some((a) => a._id === attempt._id && a.score === 100));
});
test('Concurrent test submissions have a single winner', async () => {
  const a = (
    await student.post('/api/attempts').set(headers).send({ source: 'local', skill: 'SQL' })
  ).body;
  const responses = await Promise.all(
    [0, 1].map(() =>
      student
        .post(`/api/attempts/${a._id}/submit`)
        .set(headers)
        .send({ answers: Array(a.total).fill(0) }),
    ),
  );
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
});
test('External outages use local fallback without losing previous results', async () => {
  const before = await Attempt.countDocuments({ status: 'submitted' });
  const r = await student
    .post('/api/attempts')
    .set(headers)
    .send({ source: 'external', skill: 'Mixed' })
    .expect(201);
  assert.equal(r.body.source, 'Local question bank');
  assert.match(r.body.notice, /unavailable/);
  assert.equal(await Attempt.countDocuments({ status: 'submitted' }), before);
});
test('External adapter decodes and validates provider data', async () => {
  const q = {
    question: 'What%20is%20a%20computer%20program%3F',
    correct_answer: 'Instructions',
    incorrect_answers: ['A%20screen', 'A%20chair', 'A%20wire'],
  };
  const r = await getQuestions('external', 'Mixed', {
    fetchFn: async () => ({
      ok: true,
      json: async () => ({ response_code: 0, results: Array(5).fill(q) }),
    }),
  });
  assert.equal(r.source, 'Open Trivia DB');
  assert.equal(r.questions[0].prompt, 'What is a computer program?');
  assert.equal(r.questions[0].options[r.questions[0].correctIndex], 'Instructions');
  assert.equal(r.questions[0].skill, 'Computer fundamentals');
  const fallback = await getQuestions('external', 'Mixed', {
    fetchFn: async () => ({ ok: true, json: async () => ({ response_code: 5 }) }),
  });
  assert.equal(fallback.source, 'Local question bank');
});
test('Admin can create and deactivate questions; students cannot', async () => {
  const input = {
    skill: 'SQL',
    prompt: 'Which keyword reads rows from a table?',
    options: ['SELECT', 'DROP', 'DELETE', 'ALTER'],
    correctIndex: 0,
    explanation: 'SELECT reads rows.',
    active: true,
  };
  await student.post('/api/admin/questions').set(headers).send(input).expect(403);
  const q = (await admin.post('/api/admin/questions').set(headers).send(input).expect(201)).body;
  await admin
    .put(`/api/admin/questions/${q._id}`)
    .set(headers)
    .send({ ...input, active: false })
    .expect(200);
  const local = await getQuestions('local', 'SQL');
  assert.ok(local.questions.every((a) => a.prompt !== input.prompt));
  const users = (await admin.get('/api/admin/students').expect(200)).body;
  assert.ok(users.length >= 2);
  assert.ok(users.every((u) => !u.passwordHash));
});
test('Analytics and guidance respond to recorded evidence, interests and goals', async () => {
  const p = await Profile.findOne({
    user: (await User.findOne({ email: 'student@pathpilot.local' }))._id,
  });
  const a = await Attempt.find({ user: p.user, status: 'submitted' }).lean();
  const stats = analytics(p, a);
  assert.ok(stats.attempts >= 5);
  assert.equal(stats.bestScore, 100);
  const guide = guidance(p, a);
  assert.equal(guide.careers[0].id, 'full-stack');
  assert.ok(guide.actions.length > 0);
  assert.ok(guide.careers[0].gaps.some((g) => g.testScore !== null));
  const empty = {
    skills: [],
    topics: [],
    goals: [],
    interests: ['data-analyst'],
    year: 1,
    cgpa: 0,
  };
  assert.equal(guidance(empty, []).careers[0].id, 'data-analyst');
  assert.equal(guidance(empty, []).careers[0].readiness, 0);
  await student.get('/api/analytics').expect(200);
  await student.get('/api/guidance').expect(200);
});
test('Data survives a database disconnect and reconnect', async () => {
  const count = await Attempt.countDocuments();
  await mongoose.disconnect();
  await mongoose.connect(mongo.getUri());
  assert.equal(await Attempt.countDocuments(), count);
  assert.equal((await student.get('/api/profile').expect(200)).body.cgpa, 8.6);
});
test('Malformed identifiers and JSON return controlled errors; logout clears session', async () => {
  await student.get('/api/attempts/not-an-id').expect(400);
  await student
    .put('/api/profile')
    .set(headers)
    .set('Content-Type', 'application/json')
    .send('{invalid')
    .expect(400);
  await other.post('/api/auth/logout').set(headers).expect(204);
  await other.get('/api/profile').expect(401);
});
function originalWithVersion(p) {
  const { version, college, degree, year, cgpa, bio, interests, skills, topics, goals } = p;
  return { version, college, degree, year, cgpa, bio, interests, skills, topics, goals };
}
