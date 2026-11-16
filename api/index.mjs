import { config } from '../server/src/config.js';
import { createApp } from '../server/src/app.js';
import { connectDatabase } from '../server/src/database.js';
import express from 'express';

export function createHandler({ getOptions = config, connect = connectDatabase } = {}) {
  let app, options;
  // Export an actual Express listener so Vercel skips its generic body helpers.
  // The webhook must receive the exact signed bytes, not parsed/rebuilt JSON.
  const handler = express();
  handler.disable('x-powered-by');
  handler.use(async (req, res) => {
    try {
      if (!app) {
        options = getOptions();
        if (!options.mongoUri || (process.env.VERCEL && !process.env.MONGODB_URI))
          throw new Error('MONGODB_URI is required on Vercel.');
        app = createApp({ ...options, serveClient: false, serverless: true });
      }
      await connect(options.mongoUri);
    } catch (error) {
      console.error('API initialization failed:', error.name);
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify({ message: 'The API could not connect. Check deployment environment variables and Atlas network access, then retry.' }));
      return;
    }
    return app(req, res);
  });
  return handler;
}

// Vercel owns the listener. Do not call app.listen() or start mongod here.
export default createHandler();
