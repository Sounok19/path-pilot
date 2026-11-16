// Small, reproducible lab workload. An illustrative local check, not a production benchmark.
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../server/src/app.js';
import { seed } from '../server/src/seed-data.js';
let mongo;
try {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await seed();
  const app = createApp({
    jwtSecret: 'performance-only-secret-with-more-than-32-characters',
    secure: false,
    externalEnabled: false,
    rateLimit: 10000,
  });
  const login = await request(app)
    .post('/api/auth/login')
    .set('X-Requested-With', 'PathPilot')
    .send({ email: 'student@pathpilot.local', password: 'PilotLab2026!' });
  const cookie = login.headers['set-cookie'];
  const endpoints = [
    '/api/profile',
    '/api/analytics',
    '/api/guidance',
    '/api/attempts',
    '/api/catalog',
  ];
  const times = [];
  for (let batch = 0; batch < 20; batch++)
    await Promise.all(
      Array.from({ length: 10 }, async (_, i) => {
        const start = performance.now();
        await request(app)
          .get(endpoints[i % 5])
          .set('Cookie', cookie)
          .expect(200);
        times.push(performance.now() - start);
      }),
    );
  times.sort((a, b) => a - b);
  const p95 = times[Math.ceil(times.length * 0.95) - 1];
  const max = times.at(-1);
  console.log(
    JSON.stringify(
      {
        workload: '200 authenticated local reads, concurrency 10, sample dataset',
        requests: times.length,
        p95Ms: Math.round(p95),
        maxMs: Math.round(max),
        targetMs: 3000,
        pass: p95 < 3000,
      },
      null,
      2,
    ),
  );
  if (p95 >= 3000) process.exitCode = 1;
} finally {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
}
