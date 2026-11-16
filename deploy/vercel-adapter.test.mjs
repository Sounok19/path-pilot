import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createHandler } from '../api/index.mjs';
import { connectDatabase } from '../server/src/database.js';
import { seed } from '../server/src/seed-data.js';
import { createHmac } from 'node:crypto';
import { fakeProvider, testPaymentSettings } from '../server/test/helpers/payment-provider.js';
let mongo, options;
before(async()=>{
  mongo=await MongoMemoryServer.create();
  options={jwtSecret:'test-vercel-secret-at-least-32-characters',mongoUri:mongo.getUri(),secure:false,externalEnabled:false};
  await connectDatabase(options.mongoUri);await seed();
});
after(async()=>{await mongoose.disconnect();await mongo.stop();});
test('Adapter keeps session, dispatches original API paths and preserves server scoring',async()=>{
  const handler=createHandler({getOptions:()=>options});const agent=request.agent(handler);const header={'X-Requested-With':'PathPilot'};
  await agent.get('/api/health').expect(200);
  await agent.post('/api/auth/login').set(header).send({email:'student@pathpilot.local',password:'PilotLab2026!'}).expect(200);
  const profile=await agent.get('/api/profile').expect(200);assert.equal(profile.body.skills.length,5);
  const attempt=await agent.post('/api/attempts').set(header).send({source:'local',skill:'Mixed'}).expect(201);
  assert.equal(attempt.body.questions[0].correctIndex,undefined);
  const result=await agent.post(`/api/attempts/${attempt.body._id}/submit`).set(header).send({answers:Array(attempt.body.total).fill(0)}).expect(200);
  assert.equal(result.body.status,'submitted');await agent.get('/api/not-a-real-route').expect(404);
});
test('Cold-start connection is shared and database failures can recover on retry',async()=>{
  await mongoose.disconnect();await Promise.all(Array.from({length:8},()=>connectDatabase(options.mongoUri)));
  const id=mongoose.connection.id;await connectDatabase(options.mongoUri);assert.equal(mongoose.connection.id,id);
  let calls=0;const handler=createHandler({getOptions:()=>options,connect:async()=>{if(++calls===1)throw new Error('sensitive connection string');await connectDatabase(options.mongoUri);}});
  const first=await request(handler).get('/api/health').expect(503);assert.ok(!JSON.stringify(first.body).includes('sensitive'));
  await request(handler).get('/api/health').expect(200);
});
test('Deployed cookie configuration is secure and forwarded headers do not bypass roles',async()=>{
  const handler=createHandler({getOptions:()=>({...options,secure:true})});
  const r=await request(handler).post('/api/auth/login').set('X-Requested-With','PathPilot').set('X-Forwarded-For','203.0.113.50').send({email:'student@pathpilot.local',password:'PilotLab2026!'}).expect(200);
  assert.match(r.headers['set-cookie'][0],/Secure/);assert.match(r.headers['set-cookie'][0],/HttpOnly/);
  const cookie=r.headers['set-cookie'][0].split(';')[0];await request(handler).get('/api/admin/overview').set('Cookie',cookie).expect(403);
});
test('Express adapter preserves original signed webhook bytes for Vercel', async () => {
  const provider = fakeProvider();
  const handler = createHandler({ getOptions: () => ({ ...options, payment: testPaymentSettings, paymentFetch: provider.fetch }) });
  // Vercel checks this Express interface to bypass its generic body parsing helpers.
  assert.equal(typeof handler.listen, 'function');
  const agent = request.agent(handler), header = { 'X-Requested-With': 'PathPilot' };
  await agent.post('/api/auth/login').set(header).send({ email: 'student@pathpilot.local', password: 'PilotLab2026!' }).expect(200);
  const order = (await agent.post('/api/billing/checkout').set(header).send({}).expect(200)).body;
  const remote = provider.complete(order.orderId);
  const body = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: remote.id } } } }, null, 2);
  const signature = createHmac('sha256', testPaymentSettings.webhookSecret).update(body).digest('hex');
  await request(handler).post('/api/billing/webhook').set('Content-Type', 'application/json').set('X-Razorpay-Signature', signature).send(body).expect(200);
  assert.equal((await agent.get('/api/billing').expect(200)).body.membership.plan, 'premium');
  await request(handler).post('/api/billing/webhook').set('Content-Type', 'application/json').set('X-Razorpay-Signature', signature).send(body + ' ').expect(400);
});
