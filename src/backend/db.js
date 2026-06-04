const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/sk-career';

let cachedConnection = global.__skMongoConnection;

if (!cachedConnection) {
  cachedConnection = global.__skMongoConnection = {
    conn: null,
    promise: null,
  };
}

async function connectToDatabase() {
  if (cachedConnection.conn) {
    return cachedConnection.conn;
  }

  if (!cachedConnection.promise) {
    cachedConnection.promise = mongoose.connect(MONGO_URI).then((mongooseInstance) => mongooseInstance);
  }

  try {
    cachedConnection.conn = await cachedConnection.promise;
  } catch (err) {
    cachedConnection.promise = null;
    throw err;
  }

  return cachedConnection.conn;
}

module.exports = { connectToDatabase };
