import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { paymentSettings } from './payments.js';
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });
export function config() {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32 || jwtSecret.startsWith('replace-with'))
    throw new Error('Run npm run setup or configure a unique JWT_SECRET (32+ characters) in .env.');
  if (process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'true')
    throw new Error(
      'Production requires HTTPS and COOKIE_SECURE=true. Use development for the local HTTP lab.',
    );
  return {
    jwtSecret,
    mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/path_pilot',
    port: Number(process.env.PORT || 3000),
    host: process.env.HOST || '127.0.0.1',
    secure: process.env.COOKIE_SECURE === 'true',
    externalEnabled: process.env.ENABLE_EXTERNAL_QUIZZES !== 'false',
    payment: paymentSettings(),
  };
}
