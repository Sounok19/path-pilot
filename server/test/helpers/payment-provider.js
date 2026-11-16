// Deterministic TEST fixture. Never imported by a production entrypoint.
import { createHmac } from 'node:crypto';
export const testPaymentSettings = { keyId: 'rzp_test_fixture', keySecret: 'fixture-private-key-not-a-real-credential',
  webhookSecret: 'fixture-webhook-secret-not-a-real-credential', amount: 49900, currency: 'INR', durationDays: 30 };
export function fakeProvider() {
  const orders = new Map(), payments = new Map();
  let sequence = 0, down = false;
  return {
    orders, payments,
    setDown(value) { down = value; },
    complete(orderId, changes = {}) {
      const order = orders.get(orderId);
      if (!order) throw new Error('Test order not found');
      const payment = { id: `pay_fixture${++sequence}`, order_id: orderId, amount: order.amount, currency: order.currency,
        status: 'captured', captured: true, amount_refunded: 0, ...changes };
      payments.set(payment.id, payment); return payment;
    },
    signature(orderId, paymentId) { return createHmac('sha256', testPaymentSettings.keySecret).update(`${orderId}|${paymentId}`).digest('hex'); },
    async fetch(url, init) {
      if (down) throw new Error('Test network outage');
      if (new URL(url).origin !== 'https://api.razorpay.com') throw new Error('Unexpected provider');
      const path = new URL(url).pathname.replace('/v1', '');
      let result;
      if (path === '/orders' && init.method === 'POST') {
        const body = JSON.parse(init.body); result = { ...body, id: `order_fixture${++sequence}`, status: 'created' }; orders.set(result.id, result);
      } else if (/^\/orders\/[^/]+\/payments$/.test(path)) {
        const orderId = path.split('/')[2]; result = { items: [...payments.values()].filter(p => p.order_id === orderId) };
      } else result = payments.get(path.split('/')[2]);
      return new Response(JSON.stringify(result || {}), { status: result ? 200 : 404, headers: { 'Content-Type': 'application/json' } });
    },
  };
}
