import mongoose from 'mongoose';

// Reuse the driver and share the initial connection promise within a warm function.
// Never disconnect at the end of an HTTP request.
let connecting;
export async function connectDatabase(uri) {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!connecting) {
    connecting = mongoose.connect(uri, {
      maxPoolSize: 5,
      minPoolSize: 0,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 8000,
    });
  }
  try {
    await connecting;
    return mongoose.connection;
  } finally {
    // A failed cold-start attempt must not permanently poison future requests.
    connecting = undefined;
  }
}
