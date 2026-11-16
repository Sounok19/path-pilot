import mongoose from 'mongoose';
import { config } from './config.js';
import { seed } from './seed-data.js';
try {
  const c = config();
  if (process.env.NODE_ENV === 'production')
    throw new Error('Demo seeding is disabled in production.');
  await mongoose.connect(c.mongoUri);
  await seed(process.env.DEMO_PASSWORD || 'PilotLab2026!');
  console.log(
    'Sample accounts and questions are ready. Existing records and passwords were preserved. See README for sign-in details.',
  );
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
