import app from './app';
import { connectDB } from './config/db';
import { ENV } from './config/env';

import User from './models/User';
import { hashPassword } from './utils/auth';
import { planSchedulerService } from './services/planSchedulerService';

async function ensureAdmin() {
  const existing = await User.findOne({ role: 'admin' });
  const passwordHash = await hashPassword(ENV.ADMIN_PASSWORD);
  if (existing) {
    // Always sync password and email from .env so config changes take effect on restart
    await User.updateOne({ _id: existing._id }, { passwordHash, email: ENV.ADMIN_EMAIL, name: ENV.ADMIN_NAME });
    console.log('✓ Admin synced:', ENV.ADMIN_EMAIL);
    return;
  }
  const admin = await User.create({
    email: ENV.ADMIN_EMAIL,
    passwordHash,
    name: ENV.ADMIN_NAME,
    role: 'admin',
    subscription: { plan: 'admin', status: 'active' },
  });
  console.log('✓ Admin created:', admin.email);
}

async function start() {
  try {
    await connectDB();
    await ensureAdmin();
    
    // Start automatic plan generation scheduler
    // Note: On Vercel (serverless), use vercel.json cron jobs instead
    if (process.env.SERVERLESS !== 'true') {
      planSchedulerService.start();
      console.log(`✓ Node-cron scheduler: ENABLED`);
    } else {
      console.log(`✓ Serverless mode: Using Vercel Cron Jobs (see vercel.json)`);
    }
    
    app.listen(ENV.PORT, () => {
      console.log(`🚀 FitFlow API listening on http://localhost:${ENV.PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  planSchedulerService.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  planSchedulerService.stop();
  process.exit(0);
});

start();
