import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from './config.js';
import { registration } from './validation.js';
import { User } from './models.js';
try {
  const c = config();
  const data = registration.parse({
    name: process.env.ADMIN_NAME || 'Administrator',
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  });
  await mongoose.connect(c.mongoUri);
  if (await User.exists({ email: data.email }))
    throw new Error('Email already exists; this command does not promote or overwrite accounts.');
  await User.create({ ...data, passwordHash: await bcrypt.hash(data.password, 12), role: 'admin' });
  console.log('Administrator account created.');
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
