#!/usr/bin/env node
require('dotenv').config();
const mongoose = require('mongoose');

const { MONGODB_URI } = process.env;
if (!MONGODB_URI) {
  console.error('MONGODB_URI env required');
  process.exit(1);
}

async function run() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection;
  console.log('Connected to MongoDB');

  const users = db.collection('users');
  const sessions = db.collection('sessions');
  const progress = db.collection('progresslogs');
  const workoutPlans = db.collection('workoutplans');
  const dietPlans = db.collection('dietplans');
  const monthlyDiet = db.collection('monthlydietreports');
  const monthlyWorkout = db.collection('monthlyworkoutreports');

  // Preserve admin user(s)
  const admins = await users.find({ role: 'admin' }).toArray();
  const adminEmails = admins.map(a => a.email);
  console.log('Preserving admins:', adminEmails);

  // Delete all non-admin users
  const delUsers = await users.deleteMany({ role: { $ne: 'admin' } });
  console.log('Deleted users:', delUsers.deletedCount);

  // Clear other collections
  const collections = [sessions, progress, workoutPlans, dietPlans, monthlyDiet, monthlyWorkout];
  for (const coll of collections) {
    const res = await coll.deleteMany({});
    console.log(`Cleared ${coll.collectionName}:`, res.deletedCount);
  }

  await mongoose.disconnect();
  console.log('Reset complete.');
}

run().catch(err => { console.error(err); process.exit(1); });
