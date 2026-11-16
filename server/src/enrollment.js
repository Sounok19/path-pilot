import { Enrollment, Payment, User, Profile } from './models.js';
import { z } from 'zod';

export async function ensureEnrollment(user) {
  // Deterministic IDs also make migrating an existing account safe to retry.
  const data = { user: user._id, number: `PP-${String(user._id).toUpperCase()}`, enrolledAt: user.createdAt || new Date() };
  try {
    return await Enrollment.findOneAndUpdate({ user: user._id }, { $setOnInsert: data }, { upsert: true, new: true });
  } catch (error) {
    if (error.code !== 11000) throw error;
    return Enrollment.findOne({ user: user._id });
  }
}

export async function migrateEnrollments() {
  await Enrollment.init();
  let count = 0;
  for await (const user of User.find({ role: 'student' }).select('_id createdAt').cursor()) {
    await ensureEnrollment(user);
    count++;
  }
  return count;
}

export async function membership(userId) {
  const payment = await Payment.findOne({ user: userId, status: 'paid', expiresAt: { $gt: new Date() } }).sort({ expiresAt: -1 }).lean();
  return payment ? { plan: 'premium', status: 'active', expiresAt: payment.expiresAt, paymentId: payment._id } : { plan: 'preview', status: 'inactive', expiresAt: null };
}

const listing = z.object({
  q: z.string().trim().max(100).default(''),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  plan: z.enum(['all', 'preview', 'premium']).default('all'),
}).strict();

export function mountEnrollmentRoutes(app, { auth, admin }) {
  app.get('/api/admin/enrollments', auth, admin, async (req, res) => {
    const { q, page, plan } = listing.parse(req.query);
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = { role: 'student', ...(q ? { $or: [{ name: { $regex: escaped, $options: 'i' } }, { email: { $regex: escaped, $options: 'i' } }] } : {}) };
    const pipeline = [
      { $match: match },
      { $lookup: { from: 'payments', let: { id: '$_id' }, pipeline: [
        { $match: { $expr: { $and: [{ $eq: ['$user', '$$id'] }, { $eq: ['$status', 'paid'] }, { $gt: ['$expiresAt', new Date()] }] } } },
        { $sort: { expiresAt: -1 } }, { $limit: 1 }, { $project: { expiresAt: 1 } },
      ], as: 'premium' } },
      ...(plan === 'all' ? [] : [{ $match: { 'premium.0': { $exists: plan === 'premium' } } }]),
      { $sort: { createdAt: -1, _id: -1 } },
      { $facet: {
        count: [{ $count: 'total' }],
        rows: [{ $skip: (page - 1) * 20 }, { $limit: 20 }, { $project: { name: 1, email: 1, createdAt: 1, premium: 1 } }],
      } },
    ];
    const [result] = await User.aggregate(pipeline);
    const rows = await Promise.all(result.rows.map(async (user) => {
      const [enrollment, profile, lastPayment] = await Promise.all([
        ensureEnrollment(user), Profile.findOne({ user: user._id }).select('college degree year').lean(),
        Payment.findOne({ user: user._id }).sort({ createdAt: -1 }).select('status amount currency createdAt providerPaymentId mode').lean(),
      ]);
      return { id: user._id, name: user.name, email: user.email, enrollmentNumber: enrollment.number,
        enrolledAt: enrollment.enrolledAt, college: profile?.college || '', degree: profile?.degree || '', year: profile?.year || null,
        plan: user.premium.length ? 'premium' : 'preview', expiresAt: user.premium[0]?.expiresAt || null, lastPayment };
    }));
    res.json({ rows, total: result.count[0]?.total || 0, page, pageSize: 20 });
  });
}

export async function requireSubscription(req, res, next) {
  if ((await membership(req.user._id)).plan !== 'premium') {
    return res.status(403).json({ code: 'SUBSCRIPTION_REQUIRED', message: 'Subscribe to use this feature. You can explore all included benefits before subscribing.' });
  }
  next();
}
