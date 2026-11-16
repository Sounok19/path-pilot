import mongoose from 'mongoose';
import { config } from '../server/src/config.js';
import { migrateEnrollments } from '../server/src/enrollment.js';
try {
  await mongoose.connect(config().mongoUri);
  console.log(`Enrollment records ready for ${await migrateEnrollments()} students. Existing accounts and results were preserved.`);
} catch (error) {
  console.error('Enrollment migration failed:', error.name);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
