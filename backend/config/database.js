const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');

/**
 * Connects to MongoDB using the MONGODB_URI environment variable.
 * Fails loudly with a clear error message if the URI is missing or MongoDB is unreachable.
 */
async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri || !mongoUri.trim()) {
    throw new Error(
      'MONGODB_URI is not set. Create a .env file in the project root (copied from .env.example) and set MONGODB_URI.'
    );
  }

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    console.error(
      'Please verify that MongoDB is running locally or that your MongoDB Atlas MONGODB_URI in .env is correct.'
    );
    throw error;
  }
}

module.exports = {
  connectDatabase,
  mongoose,
};
