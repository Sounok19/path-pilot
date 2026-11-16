import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { Payment, Attempt } from './models.js';
import { ensureEnrollment, membership, requireSubscription } from './enrollment.js';
import { analytics, guidance } from './guidance.js';

const fail = (status, message) => Object.assign(new Error(message), { status });
const empty = z.object({}).strict();
const identifier = z.string().regex(/^[a-z]+_[A-Za-z0-9]+$/).max(100);
const verification = z.object({ paymentId: z.string().regex(/^[a-f\d]{24}$/i), razorpay_order_id: identifier,
  razorpay_payment_id: identifier, razorpay_signature: z.string().regex(/^[a-f\d]{64}$/i) }).strict();
const recordInput = z.object({ paymentId: z.string().regex(/^[a-f\d]{24}$/i) }).strict();
const simulationInput = recordInput.extend({ outcome: z.enum(['success', 'failure', 'cancel']) }).strict();

export function validSignature(message, signature, secret) {
  if (!secret || typeof signature !== 'string' || !/^[a-f\d]{64}$/i.test(signature)) return false;
  return timingSafeEqual(createHmac('sha256', secret).update(message).digest(), Buffer.from(signature, 'hex'));
}

export function paymentSettings(env = process.env) {
  const mode = env.PAYMENT_MODE || 'razorpay';
  if (!['razorpay', 'simulation'].includes(mode)) throw new Error('PAYMENT_MODE must be razorpay or simulation.');
  const amount = Number(env.PREMIUM_PRICE_PAISE || 49900);
  const durationDays = Number(env.PREMIUM_DAYS || 30);
  if (!Number.isSafeInteger(amount) || amount < 100 || amount > 10000000 || !Number.isInteger(durationDays) || durationDays < 1 || durationDays > 366)
    throw new Error('Set PREMIUM_PRICE_PAISE to 100–10000000 and PREMIUM_DAYS to 1–366.');
  const keyId = env.RAZORPAY_KEY_ID || '', keySecret = env.RAZORPAY_KEY_SECRET || '', webhookSecret = env.RAZORPAY_WEBHOOK_SECRET || '';
  if (mode === 'simulation') return { amount, durationDays, currency: 'INR', mode };
  if (keyId && !/^rzp_test_[A-Za-z0-9]+$/.test(keyId)) throw new Error('This classroom build accepts only Razorpay test keys.');
  if ((keyId || keySecret || webhookSecret) && (!keyId || !keySecret || webhookSecret.length < 16))
    throw new Error('Configure all three Razorpay values; the webhook secret must be at least 16 characters.');
  return { amount, durationDays, currency: 'INR', keyId, keySecret, webhookSecret, mode };
}

export function createPayments(options) {
  const settings = options.payment || paymentSettings({});
  const simulation = settings.mode === 'simulation';
  const enabled = !simulation && Boolean(/^rzp_test_[A-Za-z0-9]+$/.test(settings.keyId || '') && settings.keySecret && settings.webhookSecret);
  const plan = { name: 'Path Pilot Premium', amount: settings.amount, currency: settings.currency,
    durationDays: settings.durationDays, mode: simulation ? 'simulation' : 'test', provider: simulation ? 'Demo simulation' : 'Razorpay', enabled: simulation || enabled,
    benefits: ['Student profile and skill assessment', 'Learning tracker and career goals', 'Mock tests and saved results', 'Performance analytics', 'Personalized career guidance and learning resources', 'Personalized four-week learning roadmap', 'Downloadable career progress report'], autoRenew: false };
  function requireGateway() { if (!enabled) throw fail(503, 'Test checkout is not configured yet. Ask the presenter to add the Razorpay test keys.'); }
  async function gateway(path, method = 'GET', body) {
    requireGateway();
    try {
      const response = await (options.paymentFetch || fetch)(`https://api.razorpay.com/v1${path}`, {
        method, signal: AbortSignal.timeout(10000),
        headers: { Authorization: `Basic ${Buffer.from(`${settings.keyId}:${settings.keySecret}`).toString('base64')}`, 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (!response.ok) throw new Error('Provider rejected request');
      return await response.json();
    } catch { throw fail(503, 'The payment provider could not be reached. Please retry or refresh the payment status.'); }
  }
  async function reconcile(record, remote) {
    if (remote.order_id !== record.providerOrderId || remote.amount !== record.amount || remote.currency !== record.currency || !/^pay_[A-Za-z0-9]+$/.test(remote.id || ''))
      throw fail(400, 'The payment does not match this order.');
    if (record.providerPaymentId && record.providerPaymentId !== remote.id) throw fail(409, 'This order already has a different payment.');
    if ((remote.amount_refunded || 0) > 0 || remote.status === 'refunded') {
      // Conservative lab policy: any processed refund revokes this purchase's access.
      await Payment.updateOne({ _id: record._id, status: { $in: ['pending', 'paid'] } }, { $set: {
        status: 'refunded', open: false, providerPaymentId: remote.id, refundedAt: new Date(),
      } });
    } else if (remote.status === 'captured' && remote.captured === true) {
      const now = new Date();
      // A single atomic transition handles duplicate callbacks, webhooks and polling.
      // Replays can never extend the original membership period.
      await Payment.updateOne({ _id: record._id, status: 'pending' }, { $set: {
        status: 'paid', open: false, providerPaymentId: remote.id, paidAt: now, startsAt: now,
        expiresAt: new Date(now.getTime() + record.durationDays * 86400000),
      } });
    } else if (remote.status === 'failed') {
      await Payment.updateOne({ _id: record._id, status: 'pending' }, { $set: { lastFailureAt: new Date() } });
    }
    return Payment.findById(record._id).lean();
  }
  async function sync(record) {
    if (!record.providerOrderId) return record;
    if (record.providerPaymentId) return reconcile(record, await gateway(`/payments/${record.providerPaymentId}`));
    const response = await gateway(`/orders/${record.providerOrderId}/payments`);
    if (!Array.isArray(response.items)) throw fail(503, 'The payment provider returned an unexpected response.');
    const remote = response.items.find(p => ['captured', 'refunded'].includes(p.status)) || response.items.find(p => p.status === 'failed');
    return remote ? reconcile(record, remote) : record;
  }
  async function owned(user, id) {
    const record = await Payment.findOne({ _id: id, user }).lean();
    if (!record) throw fail(404, 'Payment record not found.');
    return record;
  }
  function publicPayment(record) {
    const { _id, amount, currency, durationDays, status, mode, provider, providerOrderId, providerPaymentId, createdAt, paidAt, expiresAt, lastFailureAt } = record;
    return { id: _id, amount, currency, durationDays, status, mode, provider, providerOrderId, providerPaymentId, createdAt, paidAt, expiresAt, lastFailureAt };
  }
  async function webhook(req, res) {
    requireGateway();
    if (!Buffer.isBuffer(req.body)) throw fail(400, 'Webhook requires its original raw request body.');
    if (!validSignature(req.body, req.get('X-Razorpay-Signature'), settings.webhookSecret)) throw fail(400, 'Invalid webhook signature.');
    let event;
    try { event = JSON.parse(req.body.toString('utf8')); } catch { throw fail(400, 'Invalid webhook JSON.'); }
    if (!['payment.captured', 'payment.failed', 'order.paid', 'refund.processed'].includes(event?.event)) return res.json({ received: true });
    const id = event.payload?.payment?.entity?.id || event.payload?.refund?.entity?.payment_id;
    if (!/^pay_[A-Za-z0-9]+$/.test(id || '')) throw fail(400, 'Missing payment identifier.');
    // Re-fetch current state to handle late or out-of-order events, including refunds.
    const remote = await gateway(`/payments/${id}`);
    const record = await Payment.findOne({ providerOrderId: remote.order_id }).lean();
    if (record) await reconcile(record, remote);
    res.json({ received: true });
  }
  function mount(app, { auth, student, admin, profileFor }) {
    app.get('/api/subscription', auth, student, async (req, res) => {
      res.json({ plan, membership: await membership(req.user._id) });
    });
    app.get('/api/billing', auth, student, async (req, res) => {
      const [enrollment, access, history] = await Promise.all([
        ensureEnrollment(req.user), membership(req.user._id), Payment.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100).lean(),
      ]);
      res.json({ plan, enrollment: { number: enrollment.number, enrolledAt: enrollment.enrolledAt }, membership: access, payments: history.map(publicPayment) });
    });
    app.post('/api/billing/checkout', auth, student, async (req, res) => {
      empty.parse(req.body);
      if (simulation) {
        await Payment.init();
        if ((await membership(req.user._id)).plan === 'premium') throw fail(409, 'Your subscription is already active.');
        let record;
        try {
          record = await Payment.findOneAndUpdate({ user: req.user._id, open: true }, { $setOnInsert: {
            user: req.user._id, provider: 'simulation', mode: 'simulation', status: 'pending', open: true,
            amount: plan.amount, currency: plan.currency, durationDays: plan.durationDays,
          } }, { upsert: true, new: true }).lean();
        } catch (error) {
          if (error.code !== 11000) throw error;
          record = await Payment.findOne({ user: req.user._id, open: true }).lean();
        }
        if (!record || record.mode !== 'simulation') throw fail(409, 'A different checkout is pending. Ask the presenter to resolve it first.');
        return res.json({ paymentId: record._id, mode: 'simulation', amount: record.amount, currency: record.currency, durationDays: record.durationDays });
      }
      requireGateway(); await Payment.init();
      if ((await membership(req.user._id)).plan === 'premium') throw fail(409, 'Your premium plan is already active. You can purchase again after it expires.');
      let record = await Payment.findOne({ user: req.user._id, open: true }).lean();
      if (record?.mode === 'simulation') throw fail(409, 'A demo checkout is pending. Finish it in simulation mode before changing payment modes.');
      if (record?.providerOrderId) {
        record = await sync(record);
        if (record.status === 'paid') throw fail(409, 'This payment is already complete. Refresh your plan status.');
        if (record.status === 'refunded') record = null;
      }
      if (!record) {
        try {
          record = await Payment.create({ user: req.user._id, provider: 'razorpay', amount: plan.amount,
            currency: plan.currency, durationDays: plan.durationDays });
        } catch (error) {
          if (error.code === 11000) throw fail(409, 'Checkout is already being prepared. Wait a moment and retry.');
          throw error;
        }
        try {
          const order = await gateway('/orders', 'POST', { amount: record.amount, currency: record.currency,
            receipt: String(record._id), partial_payment: false, notes: { plan: 'premium', payment_record: String(record._id) } });
          if (!/^order_[A-Za-z0-9]+$/.test(order.id || '') || order.amount !== record.amount || order.currency !== record.currency)
            throw fail(503, 'The payment provider returned an unexpected order.');
          record = await Payment.findByIdAndUpdate(record._id, { $set: { providerOrderId: order.id, status: 'pending' } }, { new: true }).lean();
        } catch (error) {
          // No order has been exposed to checkout, so an orphaned provider order cannot be paid here.
          await Payment.updateOne({ _id: record._id, status: 'creating' }, { $set: { status: 'failed', open: false, lastFailureAt: new Date() } });
          throw error;
        }
      }
      if (!record.providerOrderId) {
        // Recover from a function stopping while creating an unexposed order.
        if (new Date(record.createdAt).getTime() < Date.now() - 60000)
          await Payment.updateOne({ _id: record._id, status: 'creating' }, { $set: { status: 'failed', open: false } });
        throw fail(409, 'Checkout is being prepared. Wait a moment and retry.');
      }
      res.json({ paymentId: record._id, orderId: record.providerOrderId, keyId: settings.keyId,
        amount: record.amount, currency: record.currency, durationDays: record.durationDays });
    });
    app.post('/api/billing/simulate', auth, student, async (req, res) => {
      if (!simulation) throw fail(403, 'Payment simulation is disabled.');
      const { paymentId, outcome } = simulationInput.parse(req.body);
      const record = await owned(req.user._id, paymentId);
      if (record.mode !== 'simulation' || record.provider !== 'simulation') throw fail(400, 'Only demo payments can be simulated.');
      const status = { success: 'paid', failure: 'failed', cancel: 'cancelled' }[outcome];
      const now = new Date();
      // One terminal transition: retries cannot extend access or change a failed/cancelled result.
      const result = await Payment.findOneAndUpdate({ _id: paymentId, user: req.user._id, status: 'pending', mode: 'simulation' }, { $set: {
        status, open: false,
        ...(status === 'paid' ? { providerPaymentId: `sim_${record._id}`, paidAt: now, startsAt: now, expiresAt: new Date(now.getTime() + record.durationDays * 86400000) } : {}),
        ...(status === 'failed' ? { lastFailureAt: now } : {}),
      } }, { new: true }).lean() || await owned(req.user._id, paymentId);
      if (result.status !== status) throw fail(409, 'This demo checkout has already finished. Start a new checkout to try again.');
      res.json({ payment: publicPayment(result), membership: await membership(req.user._id) });
    });
    app.post('/api/billing/verify', auth, student, async (req, res) => {
      const input = verification.parse(req.body); requireGateway();
      const record = await owned(req.user._id, input.paymentId);
      if (record.mode === 'simulation') throw fail(400, 'Demo payments cannot be verified by Razorpay.');
      if (record.providerOrderId !== input.razorpay_order_id || !validSignature(`${record.providerOrderId}|${input.razorpay_payment_id}`, input.razorpay_signature, settings.keySecret))
        throw fail(400, 'Payment verification failed. No premium access was granted.');
      const result = await reconcile(record, await gateway(`/payments/${input.razorpay_payment_id}`));
      res.json({ payment: publicPayment(result), membership: await membership(req.user._id) });
    });
    app.post('/api/billing/refresh', auth, student, async (req, res) => {
      const { paymentId } = recordInput.parse(req.body); requireGateway();
      const ownedRecord = await owned(req.user._id, paymentId);
      if (ownedRecord.mode === 'simulation') throw fail(400, 'Demo payments do not use Razorpay status checks.');
      const record = await sync(ownedRecord);
      res.json({ payment: publicPayment(record), membership: await membership(req.user._id) });
    });
    app.get('/api/premium/report', auth, student, requireSubscription, async (req, res) => {
      const [profile, attempts] = await Promise.all([profileFor(req.user._id), Attempt.find({ user: req.user._id, status: 'submitted' }).lean()]);
      const stats = analytics(profile, attempts), advice = guidance(profile, attempts);
      const career = advice.careers.find(c => c.id === advice.selectedCareerId);
      if (!career) return res.json({ needsCareerChoice: true, career: null, weeks: [],
        message: 'Choose your career direction in My profile to create your roadmap. Subscribing does not choose a career for you.' });
      const focus = career.gaps.filter(g => g.gap > 0).slice(0, 3);
      const weeks = Array.from({ length: 4 }, (_, i) => ({ week: i + 1,
        title: i === 3 ? 'Build, review, and reassess' : `Develop ${focus[i]?.skill || 'your portfolio'}`,
        action: i === 3 ? 'Build a small project combining your focus skills. Retake a mock test and update your learning log.' :
          focus[i] ? `Practise ${focus[i].skill}, complete one learning topic, and record your progress. Current estimate ${focus[i].current}/100; target ${focus[i].target}/100.` : 'Choose a portfolio task aligned with your career goal and record what you learned.',
        resource: i < 3 ? focus[i]?.resource || null : null,
      }));
      res.json({ needsCareerChoice: false, name: req.user.name, generatedAt: new Date(), college: profile.college, career: career.title,
        readiness: career.readiness, stats, weeks, method: advice.method });
    });
    app.get('/api/admin/payments', auth, admin, async (req, res) => {
      const page = z.coerce.number().int().min(1).max(100000).default(1).parse(req.query.page);
      const [records, total] = await Promise.all([Payment.find().sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 20).limit(20).populate('user', 'name email').lean(), Payment.countDocuments()]);
      res.json({ rows: records.map(p => ({ ...publicPayment(p), student: p.user })), total, page, pageSize: 20 });
    });
  }
  return { mount, webhook, plan };
}
