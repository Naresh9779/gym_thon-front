import mongoose from 'mongoose';
import { ENV } from './env';
import DietPlan from '../models/DietPlan';

// Cache the Mongo connection across serverless invocations
// to avoid creating a new connection on every request.
type Cached = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  didSyncIndexes?: boolean;
};

const globalAny = global as unknown as { __mongooseCache?: Cached };
if (!globalAny.__mongooseCache) {
  globalAny.__mongooseCache = { conn: null, promise: null, didSyncIndexes: false };
}

export async function connectDB() {
  const cache = globalAny.__mongooseCache as Cached;

  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    mongoose.set('strictQuery', true);
    // Increase buffer timeout to tolerate cold starts; disable buffering surprises
    const opts: any = {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
      // bufferTimeoutMS controls how long Mongoose will buffer operations
      bufferTimeoutMS: 15000,
    };
    cache.promise = mongoose.connect(ENV.MONGODB_URI, opts).then((m) => m);
  }

  cache.conn = await cache.promise;
  console.log('✅ MongoDB connected');

  // Ensure indexes only once per cold start
  if (!cache.didSyncIndexes) {
    try {
      const indexes = await DietPlan.collection.indexes();
      const legacy = indexes.find(
        (idx: any) => idx.name === 'user_1_date_1' || (idx.key && idx.key.user === 1 && idx.key.date === 1)
      );
      if (legacy) {
        const legacyName: string =
          legacy.name || (legacy.key ? Object.entries(legacy.key).map(([k, v]) => `${k}_${v}`).join('_') : 'user_1_date_1');
        await DietPlan.collection.dropIndex(legacyName);
        console.log('🧹 Dropped legacy DietPlan index:', legacyName);
      }
    } catch (e) {
      console.warn('Index cleanup skipped:', (e as Error).message);
    }

    try {
      await DietPlan.syncIndexes();
      cache.didSyncIndexes = true;
      console.log('✅ DietPlan indexes synchronized');
    } catch (e) {
      console.warn('⚠️ Failed to sync DietPlan indexes:', (e as Error).message);
    }
  }

  return cache.conn;
}
