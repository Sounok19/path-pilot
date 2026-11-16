import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { paymentSettings } from '../src/payments.js';
import { Payment, User } from '../src/models.js';
const headers = { 'X-Requested-With': 'PathPilot' };
const options = { jwtSecret: 'simulation-test-secret-at-least-32-characters', secure: false, serveClient: false, rateLimit: 10000, authLimit: 10000,
  payment: paymentSettings({ PAYMENT_MODE: 'simulation' }), paymentFetch: () => { throw new Error('Simulation must never call a payment provider'); } };
let mongo, app, counter = 0;
before(async () => { mongo = await MongoMemoryServer.create(); await mongoose.connect(mongo.getUri()); await Promise.all([Payment.init(), User.init()]); app = createApp(options); });
after(async () => { await mongoose.disconnect(); await mongo.stop(); });
async function student() {
  const agent = request.agent(app), email = `simulation${++counter}@test.local`;
  const r = await agent.post('/api/auth/register').set(headers).send({ name: 'Simulation Student', email, password: 'Simulation2026!' }).expect(201);
  return { agent, id: r.body.id, email };
}
async function checkout(s) { return (await s.agent.post('/api/billing/checkout').set(headers).send({}).expect(200)).body; }
function finish(s, order, outcome) { return s.agent.post('/api/billing/simulate').set(headers).send({ paymentId: order.paymentId, outcome }); }

test('Simulation needs no keys, enforces server pricing and unlocks access once with a persistent demo record', async () => {
  const s = await student();
  const plan = (await s.agent.get('/api/billing').expect(200)).body.plan;
  assert.equal(plan.mode, 'simulation'); assert.equal(plan.enabled, true);
  await s.agent.get('/api/profile').expect(403);
  await s.agent.post('/api/billing/checkout').set(headers).send({ amount: 1 }).expect(400);
  const [a, b] = await Promise.all([checkout(s), checkout(s)]);
  assert.equal(a.paymentId, b.paymentId); assert.equal(a.amount, 49900);
  await Promise.all([finish(s, a, 'success').expect(200), finish(s, a, 'success').expect(200)]);
  const first = await Payment.findById(a.paymentId).lean();
  assert.equal(first.mode, 'simulation'); assert.equal(first.provider, 'simulation'); assert.equal(first.status, 'paid');
  assert.equal(first.expiresAt - first.startsAt, 30 * 86400000);
  await finish(s, a, 'success').expect(200);
  assert.equal(+(await Payment.findById(a.paymentId)).expiresAt, +first.expiresAt);
  await s.agent.get('/api/profile').expect(200); await s.agent.get('/api/premium/report').expect(200);
  await s.agent.post('/api/billing/checkout').set(headers).send({}).expect(409);
  const history = (await s.agent.get('/api/billing')).body.payments;
  assert.equal(history.length, 1); assert.equal(history[0].mode, 'simulation');
  await Payment.updateOne({ _id: a.paymentId }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
  await finish(s, a, 'success').expect(200); await s.agent.get('/api/profile').expect(403);
});
test('Failure and cancellation never unlock access; terminal outcomes cannot be changed and retries get new records', async () => {
  const s = await student();
  for (const [outcome, status] of [['failure', 'failed'], ['cancel', 'cancelled']]) {
    const order = await checkout(s);
    const r = await finish(s, order, outcome).expect(200);
    assert.equal(r.body.payment.status, status); assert.equal(r.body.membership.plan, 'preview');
    await finish(s, order, 'success').expect(409);
    await s.agent.get('/api/profile').expect(403);
  }
  const order = await checkout(s); await finish(s, order, 'success').expect(200);
  assert.equal(await Payment.countDocuments({ user: s.id }), 3);
});
test('Simulation requires login, request protection, ownership and a simulation record', async () => {
  const a = await student(), b = await student(), order = await checkout(a);
  await request(app).post('/api/billing/simulate').set(headers).send({ paymentId: order.paymentId, outcome: 'success' }).expect(401);
  await a.agent.post('/api/billing/simulate').send({ paymentId: order.paymentId, outcome: 'success' }).expect(403);
  await finish(b, order, 'success').expect(404);
  await a.agent.post('/api/billing/simulate').set(headers).send({ paymentId: order.paymentId, outcome: 'success', durationDays: 365 }).expect(400);
  await Payment.updateOne({ _id: order.paymentId }, { $set: { provider: 'razorpay', mode: 'test' } });
  await finish(a, order, 'success').expect(400);
});
test('Razorpay mode does not allow simulation even when the student has a pending demo order', async () => {
  const s = await student(), order = await checkout(s);
  const agent = request.agent(createApp({ ...options, payment: paymentSettings({}) }));
  await agent.post('/api/auth/login').set(headers).send({ email: s.email, password: 'Simulation2026!' }).expect(200);
  await agent.post('/api/billing/simulate').set(headers).send({ paymentId: order.paymentId, outcome: 'success' }).expect(403);
  assert.equal((await Payment.findById(order.paymentId)).status, 'pending');
});
