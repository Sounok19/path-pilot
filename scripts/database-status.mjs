import mongoose from 'mongoose';
import { config } from '../server/src/config.js';
try {
  await mongoose.connect(config().mongoUri, { serverSelectionTimeoutMS: 5000 });
  console.log(`Connected to MongoDB: ${mongoose.connection.host}:${mongoose.connection.port}`);
  console.log(`Database: ${mongoose.connection.name}\n`);
  const rows = [];
  for (const collection of ['users', 'profiles', 'enrollments', 'questions', 'attempts', 'payments']) {
    rows.push({ Collection: collection, 'Stored documents': await mongoose.connection.db.collection(collection).countDocuments() });
  }
  console.table(rows);
  console.log('These counts are read directly from MongoDB, not from browser storage.');
  console.log('To see individual documents, connect MongoDB Compass to the same host and port.');
} catch (error) {
  console.error(`Database check failed (${error.name}). Start the local database with npm run db:start and check .env.`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
