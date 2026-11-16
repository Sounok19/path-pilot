import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
const target = new URL('../.env', import.meta.url);
if (existsSync(target)) console.log('.env already exists; kept your configuration.');
else {
  const sample = readFileSync(new URL('../.env.example', import.meta.url), 'utf8');
  writeFileSync(
    target,
    sample.replace(
      'replace-with-a-random-secret-of-at-least-32-characters',
      randomBytes(48).toString('hex'),
    ),
  );
  console.log('Created .env with a unique session secret. Start MongoDB, then run npm run seed.');
}
