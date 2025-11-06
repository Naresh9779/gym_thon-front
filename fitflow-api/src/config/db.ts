import mongoose from 'mongoose';
import { ENV } from './env';
import DietPlan from '../models/DietPlan';

export async function connectDB() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(ENV.MONGODB_URI);
  console.log('✅ MongoDB connected');

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
