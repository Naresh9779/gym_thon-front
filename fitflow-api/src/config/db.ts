import mongoose from 'mongoose';
import { ENV } from './env';
import DietPlan from '../models/DietPlan';

// Cache connection for serverless environments
let isConnected = false;

// Set up connection event listeners to manage connection state
function setupConnectionListeners() {
  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    console.log('⚠️ MongoDB disconnected');
  });

  mongoose.connection.on('error', (err) => {
    isConnected = false;
    console.error('❌ MongoDB connection error:', err.message);
  });

  mongoose.connection.on('reconnected', () => {
    isConnected = true;
    console.log('✅ MongoDB reconnected');
  });
}

// Initialize listeners once
let listenersInitialized = false;

export async function connectDB() {
  // Set up event listeners on first call
  if (!listenersInitialized) {
    setupConnectionListeners();
    listenersInitialized = true;
  }

  // If already connected, skip reconnection (important for serverless)
  if (isConnected && mongoose.connection.readyState === 1) {
    console.log('✅ MongoDB already connected (cached)');
    return;
  }

  mongoose.set('strictQuery', true);
  
  // Connection options optimized for serverless (Vercel, etc.)
  const options: mongoose.ConnectOptions = {
    // Buffer commands until connection is established
    bufferCommands: true,
    // Maximum time to wait for server selection (30 seconds)
    serverSelectionTimeoutMS: 30000,
    // Maximum time for socket operations (45 seconds)
    socketTimeoutMS: 45000,
    // Connection pool settings optimized for serverless
    maxPoolSize: 10,
    minPoolSize: 1,
    // Keep trying to reconnect
    retryWrites: true,
    retryReads: true,
  };

  try {
    await mongoose.connect(ENV.MONGODB_URI, options);
    isConnected = true;
    console.log('✅ MongoDB connected');
  } catch (err) {
    isConnected = false;
    throw err;
  }

  // Clean up legacy index and ensure current indexes for DietPlan
  try {
    const indexes = await DietPlan.collection.indexes();
    const legacy = indexes.find((idx: any) => idx.name === 'user_1_date_1' || (idx.key && idx.key.user === 1 && idx.key.date === 1));
    if (legacy) {
      const legacyName: string = legacy.name || (legacy.key ? Object.entries(legacy.key).map(([k,v]) => `${k}_${v}`).join('_') : 'user_1_date_1');
      await DietPlan.collection.dropIndex(legacyName);
      console.log('🧹 Dropped legacy DietPlan index:', legacyName);
    }
  } catch (e) {
    console.warn('Index cleanup skipped:', (e as Error).message);
  }

  try {
    await DietPlan.syncIndexes();
    console.log('✅ DietPlan indexes synchronized');
  } catch (e) {
    console.warn('⚠️ Failed to sync DietPlan indexes:', (e as Error).message);
  }
}
