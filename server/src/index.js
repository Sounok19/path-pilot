import mongoose from 'mongoose';
import { config } from './config.js';
import { createApp } from './app.js';
try {
  const options = config();
  await mongoose.connect(options.mongoUri, { serverSelectionTimeoutMS: 8000 });
  const server = createApp(options).listen(options.port, options.host, () =>
    console.log(`Path Pilot is ready at http://${options.host}:${options.port}`),
  );
  for (const signal of ['SIGINT', 'SIGTERM'])
    process.on(signal, () =>
      server.close(async () => {
        await mongoose.disconnect();
        process.exit(0);
      }),
    );
} catch (err) {
  console.error('Startup failed:', err.message);
  process.exit(1);
}
