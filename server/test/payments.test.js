import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import { Enrollment, Payment, User, Profile, Attempt } from '../src/models.js';
import { seed } from '../src/seed-data.js';
import { migrateEnrollments } from '../src/enrollment.js';
import { paymentSettings } from '../src/payments.js';
import { fakeProvider, testPaymentSettings } from './helpers/payment-provider.js';
const headers = { 'X-Requested-With': 'PathPilot' };
const provider = fakeProvider(); let mongo, app, admin, counter = 0;
const options = { jwtSecret: 'payment-test-secret-with-at-least-32-characters', secure: false, rateLimit: 10000, authLimit: 10000,
  payment: testPaymentSettings, paymentFetch: provider.fetch };
before(async () => {
  mongo = await MongoMemoryServer.create(); await mongoose.connect(mongo.getUri());
  await Promise.all([Payment.init(), Enrollment.init(), User.init()]); await seed();
  app = createApp(options); admin = request.agent(app);
  await admin.post('/api/auth/login').set(headers).send({ email: 'admin@pathpilot.local', password: 'PilotLab2026!' }).expect(200);
});
after(async () => { await mongoose.disconnect(); await mongo.stop(); });
async function student() {
  const agent = request.agent(app);
  const response = await agent.post('/api/auth/register').set(headers).send({ name: `Payment Student ${++counter}`, email: `pay${counter}@test.local`, password: 'PaymentTest2026!' }).expect(201);
  return { agent, id: response.body.id };
}
async function checkout(agent) { return (await agent.post('/api/billing/checkout').set(headers).send({}).expect(200)).body; }
function signed(order, remote) { return { paymentId: order.paymentId, razorpay_order_id: order.orderId, razorpay_payment_id: remote.id, razorpay_signature: provider.signature(order.orderId, remote.id) }; }
function hook(remote, event = 'payment.captured', invalid = false) {
  const body = JSON.stringify({ event, payload: { payment: { entity: { id: remote.id } } } });
  const signature = createHmac('sha256', testPaymentSettings.webhookSecret).update(body).digest('hex');
  return request(app).post('/api/billing/webhook').set('Content-Type', 'application/json').set('X-Razorpay-Signature', invalid ? '0'.repeat(64) : signature).send(body);
}
test('Enrollment is persistent and migration is idempotent; directory is admin-only and searchable', async () => {
  const s = await student();
  const first = (await s.agent.get('/api/billing').expect(200)).body;
  assert.equal(first.membership.plan, 'preview'); assert.match(first.enrollment.number, /^PP-/);
  await migrateEnrollments(); await migrateEnrollments(); assert.equal(await Enrollment.countDocuments({ user: s.id }), 1);
  await s.agent.get('/api/admin/enrollments').expect(403); await request(app).get('/api/billing').expect(401);
  const list = (await admin.get('/api/admin/enrollments?q=pay1%40test.local&plan=preview').expect(200)).body;
  assert.equal(list.total, 1); assert.equal(list.rows[0].enrollmentNumber, first.enrollment.number);
  assert.equal(JSON.stringify(list).includes('passwordHash'), false);
  await admin.get('/api/admin/enrollments?page=-1').expect(400);
});
test('Checkout prices come from the server and one pending order is reused', async () => {
  const s = await student();
  await s.agent.post('/api/billing/checkout').set(headers).send({ amount: 1 }).expect(400);
  const a = await checkout(s.agent), b = await checkout(s.agent);
  assert.equal(a.orderId, b.orderId); assert.equal(a.amount, 49900); assert.equal(await Payment.countDocuments({ user: s.id }), 1);
  assert.equal(JSON.stringify(a).includes(testPaymentSettings.keySecret), false);
  await s.agent.get('/api/premium/report').expect(403);
});
test('Forged signatures and cross-student payments cannot grant premium', async () => {
  const a = await student(), b = await student(), order = await checkout(a.agent), remote = provider.complete(order.orderId);
  await a.agent.post('/api/billing/verify').set(headers).send({ ...signed(order, remote), razorpay_signature: '0'.repeat(64) }).expect(400);
  await b.agent.post('/api/billing/verify').set(headers).send(signed(order, remote)).expect(404);
  await b.agent.post('/api/billing/refresh').set(headers).send({ paymentId: order.paymentId }).expect(404);
  assert.equal((await a.agent.get('/api/billing')).body.membership.plan, 'preview');
});
test('Captured payments activate access once despite concurrent callback and webhook retries', async () => {
  const s = await student(), order = await checkout(s.agent), remote = provider.complete(order.orderId);
  await Promise.all([s.agent.post('/api/billing/verify').set(headers).send(signed(order, remote)).expect(200), hook(remote).expect(200), hook(remote).expect(200)]);
  const first = await Payment.findById(order.paymentId).lean(); assert.equal(first.status, 'paid');
  assert.equal(first.expiresAt - first.startsAt, 30 * 86400000);
  await hook(remote).expect(200);
  const later = await Payment.findById(order.paymentId).lean(); assert.equal(+later.expiresAt, +first.expiresAt);
  await s.agent.get('/api/premium/report').expect(200);
  await s.agent.post('/api/billing/checkout').set(headers).send({}).expect(409);
  const students = (await admin.get('/api/admin/enrollments?plan=premium').expect(200)).body;
  assert.ok(students.rows.some(row => row.id === s.id));
});
test('Authorized, failed, and mismatched payments do not activate membership', async () => {
  for (const change of [{ status: 'authorized', captured: false }, { status: 'failed', captured: false }, { amount: 1 }, { currency: 'USD' }, { order_id: 'order_other' }]) {
    const s = await student(), order = await checkout(s.agent), remote = provider.complete(order.orderId, change);
    const expected = change.amount || change.currency || change.order_id ? 400 : 200;
    await s.agent.post('/api/billing/verify').set(headers).send(signed(order, remote)).expect(expected);
    assert.equal((await s.agent.get('/api/billing')).body.membership.plan, 'preview');
  }
});
test('Webhook checks original body signature and works without browser CSRF headers', async () => {
  const s = await student(), order = await checkout(s.agent), remote = provider.complete(order.orderId);
  await hook(remote, 'payment.captured', true).expect(400);
  assert.equal((await s.agent.get('/api/billing')).body.membership.plan, 'preview');
  await hook(remote).expect(200); assert.equal((await s.agent.get('/api/billing')).body.membership.plan, 'premium');
  await s.agent.post('/api/billing/checkout').send({}).expect(403);
});
test('Status refresh recovers missed callbacks; refunds revoke access and stale capture cannot restore it', async () => {
  const s = await student(), order = await checkout(s.agent), remote = provider.complete(order.orderId);
  await s.agent.post('/api/billing/refresh').set(headers).send({ paymentId: order.paymentId }).expect(200);
  assert.equal((await s.agent.get('/api/billing')).body.membership.plan, 'premium');
  remote.amount_refunded = remote.amount; remote.status = 'refunded';
  await hook(remote, 'refund.processed').expect(200); await s.agent.get('/api/premium/report').expect(403);
  remote.amount_refunded = 0; remote.status = 'captured'; await hook(remote).expect(200);
  assert.equal((await Payment.findById(order.paymentId)).status, 'refunded');
});
test('Expired membership loses report access and can purchase a fresh term', async () => {
  const s = await student(), order = await checkout(s.agent), remote = provider.complete(order.orderId);
  await hook(remote).expect(200); await Payment.updateOne({ _id: order.paymentId }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
  await s.agent.get('/api/premium/report').expect(403); const fresh = await checkout(s.agent); assert.notEqual(fresh.orderId, order.orderId);
});
test('Provider outage can be retried safely and disabled checkout never fabricates payment success', async () => {
  const s = await student(); provider.setDown(true);
  await s.agent.post('/api/billing/checkout').set(headers).send({}).expect(503); provider.setDown(false);
  await checkout(s.agent);
  const disabled = request.agent(createApp({ ...options, payment: undefined }));
  await disabled.post('/api/auth/login').set(headers).send({ email: 'student@pathpilot.local', password: 'PilotLab2026!' }).expect(200);
  assert.equal((await disabled.get('/api/billing')).body.plan.enabled, false);
  await disabled.post('/api/billing/checkout').set(headers).send({}).expect(503);
  assert.throws(() => paymentSettings({ RAZORPAY_KEY_ID: 'rzp_live_abc' }), /test keys/);
});
test('Payment register does not expose secrets or permit student access', async () => {
  const s = await student(); await s.agent.get('/api/admin/payments').expect(403);
  const response = await admin.get('/api/admin/payments').expect(200);
  assert.ok(response.body.total > 0); assert.ok(response.body.rows.length <= 20);
  assert.equal(JSON.stringify(response.body).includes('passwordHash'), false);
  assert.equal(JSON.stringify(response.body).includes(testPaymentSettings.keySecret), false);
});

test('Every student benefit requires a subscription, including direct API calls and expired sessions', async () => {
  const s = await student();
  const preview = (await s.agent.get('/api/subscription').expect(200)).body;
  assert.equal(preview.membership.plan, 'preview');
  assert.equal(preview.membership.status, 'inactive');
  assert.ok(preview.plan.benefits.length >= 7);
  const paths = ['/catalog', '/profile', '/analytics', '/guidance', '/tests', '/attempts', '/premium/report'];
  async function locked() {
    for (const route of paths) {
      const result = await s.agent.get('/api' + route).expect(403);
      assert.equal(result.body.code, 'SUBSCRIPTION_REQUIRED', route);
    }
    await s.agent.put('/api/profile').set(headers).send({}).expect(403);
    await s.agent.post('/api/attempts').set(headers).send({ source: 'local', skill: 'Mixed' }).expect(403);
    await s.agent.get('/api/billing').expect(200);
    await s.agent.get('/api/auth/me').expect(200);
  }
  await locked();
  assert.equal(await Profile.countDocuments({ user: s.id }), 0);
  assert.equal(await Attempt.countDocuments({ user: s.id }), 0);
  const order = await checkout(s.agent);
  await locked(); // An unpaid order grants nothing.
  const remote = provider.complete(order.orderId);
  await s.agent.post('/api/billing/verify').set(headers).send(signed(order, remote)).expect(200);
  for (const route of paths) await s.agent.get('/api' + route).expect(200);
  const attempt = (await s.agent.post('/api/attempts').set(headers).send({ source: 'local', skill: 'Mixed' }).expect(201)).body;
  await s.agent.get('/api/attempts/' + attempt._id).expect(200);
  await Payment.updateOne({ _id: order.paymentId }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
  await locked();
  await s.agent.get('/api/attempts/' + attempt._id).expect(403);
  await s.agent.post('/api/attempts/' + attempt._id + '/submit').set(headers).send({ answers: [] }).expect(403);
  assert.equal((await Attempt.findById(attempt._id)).status, 'in-progress');
  assert.equal(await Profile.countDocuments({ user: s.id }), 1); // Expiry retains saved data.
  await Payment.updateOne({ _id: order.paymentId }, { $set: { expiresAt: new Date(Date.now() + 86400000) } });
  await s.agent.get('/api/profile').expect(200);
  remote.amount_refunded = remote.amount; remote.status = 'refunded';
  await hook(remote, 'refund.processed').expect(200);
  await locked();
  await admin.get('/api/admin/overview').expect(200);
  await admin.get('/api/catalog').expect(200);
});
