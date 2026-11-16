// Explicit, one-time classroom sample-data provisioning against your chosen Atlas DB.
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../server/src/config.js';
import { seed } from '../server/src/seed-data.js';
import { User, Profile, Question, Attempt } from '../server/src/models.js';

try {
  const options = config();
  const studentPassword = process.env.DEMO_PASSWORD || '';
  const adminPassword = process.env.ADMIN_PASSWORD || '';
  for (const [key, value] of [['DEMO_PASSWORD', studentPassword], ['ADMIN_PASSWORD', adminPassword]]) {
    if (value.length < 10 || Buffer.byteLength(value) > 72 || value === 'PilotLab2026!')
      throw new Error(`Set your own ${key} in .env: 10+ characters and at most 72 UTF-8 bytes.`);
  }
  if (studentPassword === adminPassword) throw new Error('Use different student and admin passwords.');
  await mongoose.connect(options.mongoUri, { serverSelectionTimeoutMS: 10000 });
  await Promise.all([User.init(), Profile.init(), Question.init(), Attempt.init()]);
  await seed(studentPassword);
  await User.updateOne({email:'student@pathpilot.local'}, {$set:{passwordHash:await bcrypt.hash(studentPassword,12)}});
  await User.updateOne({email:'admin@pathpilot.local'}, {$set:{passwordHash:await bcrypt.hash(adminPassword,12)}});
  console.log('Sample accounts and questions are ready. Student: student@pathpilot.local. Admin: admin@pathpilot.local. Use the separate passwords you selected.');
} catch (error) {
  console.error('Provisioning failed:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
