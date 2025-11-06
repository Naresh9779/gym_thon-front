#!/usr/bin/env node
/**
 * One-off script to create a single admin user.
 * Usage: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=ChangeMe123 node scripts/create_admin.js
 * It will not create another admin if one already exists.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { MONGODB_URI } = process.env;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is required in env');
  process.exit(1);
}

async function run() {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  const usersColl = mongoose.connection.collection('users');

  // Check if any admin exists
  const existing = await usersColl.findOne({ role: 'admin' });
  if (existing) {
    console.log('Admin user already exists:', existing.email);
    await mongoose.disconnect();
    process.exit(0);
  }

  const email = process.env.ADMIN_EMAIL || 'admin@fitflow.com';
  const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  const name = process.env.ADMIN_NAME || 'Administrator';

  const passwordHash = await bcrypt.hash(password, 10);

  const now = new Date();
  const doc = {
    email,
    passwordHash,
    name,
    role: 'admin',
    subscription: { plan: 'admin', status: 'active' },
    createdAt: now,
    updatedAt: now,
    profile: { goals: [], preferences: [], restrictions: [], timezone: 'UTC' }
  };

  const result = await usersColl.insertOne(doc);
  console.log('Admin created:', { email, id: result.insertedId.toString(), password });
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
