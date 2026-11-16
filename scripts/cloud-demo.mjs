// Separate HTTPS demo process; local development settings in .env stay intact.
import { createServer } from 'node:http';
import { isIP } from 'node:net';
import mongoose from 'mongoose';
process.env.NODE_ENV = 'production';
process.env.COOKIE_SECURE = 'true';
process.env.HOST = '127.0.0.1';
process.env.PORT = '3002';
const { config } = await import('../server/src/config.js');
const { createApp } = await import('../server/src/app.js');
const options = config();
await mongoose.connect(options.mongoUri, { serverSelectionTimeoutMS: 8000 });
const app = createApp(options);
app.set('trust proxy', 'loopback');
const server = createServer((req, res) => {
  // Cloudflare supplies the client address. Ignore arbitrary forwarding chains.
  delete req.headers['x-forwarded-for'];
  const client = req.headers['cf-connecting-ip'];
  if (typeof client === 'string' && isIP(client)) req.headers['x-forwarded-for'] = client;
  app(req, res);
});
server.listen(options.port, options.host, () => console.log('Cloud demo ready on 127.0.0.1:3002'));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  server.close(async () => { await mongoose.disconnect(); process.exit(0); });
});
