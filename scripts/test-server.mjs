// Isolated real MongoDB process for browser tests. Never touches the lab database.
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../server/src/app.js';
import { seed } from '../server/src/seed-data.js';
import { fakeProvider, testPaymentSettings } from '../server/test/helpers/payment-provider.js';
import { User, Payment } from '../server/src/models.js';
const provider = fakeProvider();
const mongo = await MongoMemoryServer.create();
await mongoose.connect(mongo.getUri());
await seed();
// Paid fixture for the existing subscriber journey; never used by the real server.
await Payment.create({ user: (await User.findOne({ email: 'student@pathpilot.local' }))._id, provider: 'test-fixture', amount: 49900, currency: 'INR', durationDays: 30, status: 'paid', open: false, startsAt: new Date(), expiresAt: new Date(Date.now() + 86400000) });
const app = createApp({
  jwtSecret: 'browser-test-only-secret-with-at-least-32-characters',
  secure: false,
  externalEnabled: true,
  fetchFn: async () => {
    throw new Error('Deterministic test outage');
  },
  rateLimit: 5000,
  authLimit: 500,
  payment: { ...testPaymentSettings, mode: process.env.SIMULATION_TEST === 'true' ? 'simulation' : 'razorpay' },
  paymentFetch: provider.fetch,
});
// Only this isolated browser-test process exposes a payment completion fixture.
// index.js and api/index.mjs do not import this script or mount this route.
app.post('/__test_payment', (req, res) => {
  const payment = provider.complete(req.body.orderId);
  res.json({ razorpay_order_id: payment.order_id, razorpay_payment_id: payment.id,
    razorpay_signature: provider.signature(payment.order_id, payment.id) });
});
// This control endpoint exists only in the isolated test server, never in index.js.
app.post('/__test_shutdown', (req, res) => {
  res.end('closing');
  setTimeout(shutdown, 100);
});
const server = app.listen(3100, '127.0.0.1', () =>
  console.log('Browser test server ready on 3100'),
);
async function shutdown() {
  server.closeAllConnections();
  server.close();
  await mongoose.disconnect();
  await mongo.stop();
  process.exit();
}
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, shutdown);
