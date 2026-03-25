#!/usr/bin/env node
/**
 * Seed script — inserts realistic test data for 5 users covering all app features.
 * Preserves existing admin accounts. Safe to re-run (drops test collections first).
 * Usage: node scripts/seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const { MONGODB_URI } = process.env;
if (!MONGODB_URI) { console.error('MONGODB_URI required'); process.exit(1); }

// ─── Helpers ────────────────────────────────────────────────────────────────

const oid = () => new mongoose.Types.ObjectId();

/** Returns midnight UTC for a date offset from today */
function daysFromNow(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}

/** Monday of the week containing `date` */
function mondayOf(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0=Sun
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d;
}

const today       = daysFromNow(0);
const thisMonday  = mondayOf(today);
const nextMonday  = new Date(thisMonday); nextMonday.setDate(thisMonday.getDate() + 7);
const PASSWORD_HASH = bcrypt.hashSync('Test@1234', 10);

// ─── Plan templates ──────────────────────────────────────────────────────────

const PLANS = {
  trial: {
    name: 'Trial',      price: 0,    durationDays: 15,  planType: 'trial', color: '#94a3b8',
    features: { aiWorkoutPlan: false, aiDietPlan: false, leaveRequests: false, progressTracking: true },
  },
  basic: {
    name: 'Basic',      price: 999,  durationDays: 30,  planType: 'active', color: '#0ea5e9',
    features: { aiWorkoutPlan: true, aiDietPlan: false, leaveRequests: false, progressTracking: true },
  },
  gold: {
    name: 'Gold',       price: 1999, durationDays: 30,  planType: 'active', color: '#f59e0b',
    features: { aiWorkoutPlan: true, aiDietPlan: true,  leaveRequests: true,  progressTracking: true },
  },
  premium: {
    name: 'Premium',    price: 2999, durationDays: 90,  planType: 'active', color: '#6366f1',
    features: { aiWorkoutPlan: true, aiDietPlan: true,  leaveRequests: true,  progressTracking: true },
  },
};

// ─── Workout plan builder ────────────────────────────────────────────────────

function buildWorkoutDays() {
  const push  = [{ name: 'Bench Press', sets: 4, reps: '8-10', rest: 90 }, { name: 'Incline DB Press', sets: 3, reps: '10-12', rest: 60 }, { name: 'Tricep Pushdown', sets: 3, reps: '12-15', rest: 45 }, { name: 'Lateral Raises', sets: 3, reps: '15', rest: 45 }];
  const pull  = [{ name: 'Deadlift', sets: 4, reps: '5', rest: 120 }, { name: 'Barbell Row', sets: 4, reps: '8-10', rest: 90 }, { name: 'Pull-ups', sets: 3, reps: '6-8', rest: 60 }, { name: 'Bicep Curls', sets: 3, reps: '12', rest: 45 }];
  const legs  = [{ name: 'Squat', sets: 4, reps: '6-8', rest: 120 }, { name: 'Romanian Deadlift', sets: 3, reps: '10', rest: 90 }, { name: 'Leg Press', sets: 3, reps: '12-15', rest: 60 }, { name: 'Calf Raises', sets: 4, reps: '20', rest: 45 }];
  const rest  = [];
  return [
    { day: 'Monday',    exercises: push  },
    { day: 'Tuesday',   exercises: pull  },
    { day: 'Wednesday', exercises: legs  },
    { day: 'Thursday',  exercises: rest  },
    { day: 'Friday',    exercises: push  },
    { day: 'Saturday',  exercises: pull  },
    { day: 'Sunday',    exercises: rest  },
  ];
}

// ─── Diet plan builder ───────────────────────────────────────────────────────

function buildDietDays(startMonday) {
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return dayNames.map((name, i) => {
    const date = new Date(startMonday);
    date.setDate(startMonday.getDate() + i);
    return {
      dayName: name,
      date,
      totalCalories: 2100,
      macros: { protein: 165, carbs: 225, fats: 58 },
      meals: [
        { name: 'Breakfast', time: '08:00', totalCalories: 450, foods: [{ name: 'Oats + Banana + Whey', portion: '1 bowl', calories: 450, protein: 35, carbs: 55, fats: 8 }] },
        { name: 'Mid-Morning', time: '10:30', totalCalories: 200, foods: [{ name: 'Boiled Eggs + Apple', portion: '2 eggs + 1 apple', calories: 200, protein: 15, carbs: 22, fats: 7 }] },
        { name: 'Lunch', time: '13:00', totalCalories: 650, foods: [{ name: 'Rice + Dal + Chicken', portion: '1 plate', calories: 650, protein: 55, carbs: 80, fats: 12 }] },
        { name: 'Evening Snack', time: '17:00', totalCalories: 200, foods: [{ name: 'Sprouts + Tea', portion: '1 cup', calories: 200, protein: 10, carbs: 28, fats: 4 }] },
        { name: 'Dinner', time: '20:00', totalCalories: 600, foods: [{ name: 'Roti + Sabzi + Curd', portion: '3 rotis', calories: 600, protein: 50, carbs: 40, fats: 27 }] },
      ],
    };
  });
}

// ─── Progress log builder ────────────────────────────────────────────────────

function buildProgressLogs(userId, daysBack = 7) {
  const logs = [];
  for (let i = daysBack; i >= 1; i--) {
    const date = daysFromNow(-i);
    logs.push({
      userId,
      date,
      workout: { day: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][(daysBack - i) % 7], completedExercises: 4, totalExercises: 4, durationSec: 3600 },
      meals: [
        { mealName: 'Breakfast', loggedAt: new Date(date.getTime() + 8*3600000), calories: 450, macros: { protein: 35, carbs: 55, fats: 8 } },
        { mealName: 'Lunch',     loggedAt: new Date(date.getTime() + 13*3600000), calories: 650, macros: { protein: 55, carbs: 80, fats: 12 } },
        { mealName: 'Dinner',    loggedAt: new Date(date.getTime() + 20*3600000), calories: 600, macros: { protein: 50, carbs: 40, fats: 27 } },
      ],
      measurements: i === daysBack ? { weight: 78.5, bodyFat: 18, waist: 83 } : undefined,
      isLeaveDay: false,
    });
  }
  return logs;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function run() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection;
  console.log('\n✅ Connected to MongoDB');

  const users          = db.collection('users');
  const subscriptions  = db.collection('subscriptions');
  const payments       = db.collection('payments');
  const subPlans       = db.collection('subscriptionplans');
  const workouts       = db.collection('workoutplans');
  const diets          = db.collection('dietplans');
  const progress       = db.collection('progresslogs');
  const leaves         = db.collection('leaverequests');
  const planReqs       = db.collection('planrequests');
  const announcements  = db.collection('announcements');

  // ── 1. Clear test data (keep admins) ─────────────────────────────────────
  console.log('\n🗑  Clearing previous test data...');
  await users.deleteMany({ role: 'user' });
  await subscriptions.deleteMany({});
  await payments.deleteMany({});
  await subPlans.deleteMany({});
  await workouts.deleteMany({});
  await diets.deleteMany({});
  await progress.deleteMany({});
  await leaves.deleteMany({});
  await planReqs.deleteMany({});
  await announcements.deleteMany({});
  console.log('   Done.');

  // ── 2. Subscription plans ─────────────────────────────────────────────────
  console.log('\n📋 Creating subscription plans...');
  const now = new Date();
  const planIds = {};
  for (const [key, p] of Object.entries(PLANS)) {
    const id = oid();
    planIds[key] = id;
    await subPlans.insertOne({ _id: id, ...p, isActive: true, createdAt: now, updatedAt: now });
    console.log(`   ✓ ${p.name} Plan — ₹${p.price}/mo`);
  }

  // ── 3. Users ──────────────────────────────────────────────────────────────
  console.log('\n👥 Creating users...');

  const adminDoc = await users.findOne({ role: 'admin' });
  const adminId  = adminDoc?._id || oid();

  // User definitions
  const userData = [
    {
      key: 'arjun',
      name: 'Arjun Sharma',   email: 'arjun@test.com',
      planKey: 'premium',
      subStart: daysFromNow(-60),  subEnd: daysFromNow(30),   // active, 30 days left
      subStatus: 'active',
      gymStatus: 'member',
      profile: { age: 25, weight: 78.5, height: 178, gender: 'male', activityLevel: 'active', experienceLevel: 'intermediate', goals: ['muscle_gain', 'strength'], preferences: ['no_pork'], restrictions: [], timezone: 'Asia/Kolkata', dietPreferences: { isVegetarian: false, weeklyBudget: 2000, dietType: 'high_protein' } },
      desc: 'Premium · active 30d left · has workout+diet plan+logs',
    },
    {
      key: 'priya',
      name: 'Priya Patel',    email: 'priya@test.com',
      planKey: 'gold',
      subStart: daysFromNow(-30),  subEnd: daysFromNow(22),   // active, 22 days left
      subStatus: 'active',
      gymStatus: 'member',
      profile: { age: 28, weight: 62, height: 165, gender: 'female', activityLevel: 'moderate', experienceLevel: 'beginner', goals: ['weight_loss', 'toning'], preferences: [], restrictions: ['dairy_free'], timezone: 'Asia/Kolkata', dietPreferences: { isVegetarian: true, weeklyBudget: 1500, dietType: 'low_carb' } },
      desc: 'Gold · active 22d left · has workout plan + pending leave request',
    },
    {
      key: 'rohit',
      name: 'Rohit Kumar',    email: 'rohit@test.com',
      planKey: 'basic',
      subStart: daysFromNow(-25),  subEnd: daysFromNow(5),    // expiring in 5 days → check-in ready
      subStatus: 'active',
      gymStatus: 'member',
      profile: { age: 32, weight: 88, height: 175, gender: 'male', activityLevel: 'lightly_active', experienceLevel: 'beginner', goals: ['weight_loss'], preferences: [], restrictions: [], timezone: 'Asia/Kolkata', dietPreferences: { isVegetarian: false, weeklyBudget: 1000, dietType: 'balanced' } },
      desc: 'Basic · expiring in 5d · NO current plans → pending check-in request',
    },
    {
      key: 'sneha',
      name: 'Sneha Mehta',    email: 'sneha@test.com',
      planKey: 'trial',
      subStart: daysFromNow(-4),   subEnd: daysFromNow(11),   // trial, recently joined
      subStatus: 'trial',
      gymStatus: 'member',
      profile: { age: 22, weight: 55, height: 160, gender: 'female', activityLevel: 'sedentary', experienceLevel: 'beginner', goals: ['fitness'], preferences: [], restrictions: [], timezone: 'Asia/Kolkata', dietPreferences: { isVegetarian: true, weeklyBudget: 800, dietType: 'balanced' } },
      desc: 'Trial · recently joined · no plans yet',
    },
    {
      key: 'vikram',
      name: 'Vikram Singh',   email: 'vikram@test.com',
      planKey: 'gold',
      subStart: daysFromNow(-90),  subEnd: daysFromNow(-30),  // expired 30 days ago
      subStatus: 'expired',
      gymStatus: 'left',
      leftAt: daysFromNow(-16),
      leftReason: 'auto',
      profile: { age: 35, weight: 82, height: 172, gender: 'male', activityLevel: 'moderate', experienceLevel: 'intermediate', goals: ['maintenance'], preferences: [], restrictions: [], timezone: 'Asia/Kolkata', dietPreferences: { isVegetarian: false, weeklyBudget: 1500, dietType: 'balanced' } },
      desc: 'Gold · expired 30d ago · left gym (auto)',
    },
  ];

  const userIds = {};
  const subIds  = {};

  for (const u of userData) {
    const userId = oid();
    const subId  = oid();
    const payId  = oid();
    userIds[u.key] = userId;
    subIds[u.key]  = subId;
    const plan = PLANS[u.planKey];

    // Subscription
    await subscriptions.insertOne({
      _id: subId,
      userId,
      planId:         planIds[u.planKey],
      planName:       plan.name,
      price:          plan.price,
      features:       plan.features,
      status:         u.subStatus,
      startDate:      u.subStart,
      endDate:        u.subEnd,
      durationMonths: Math.max(1, Math.round(plan.durationDays / 30)),
      paymentId:      plan.price > 0 ? payId : undefined,
      assignedBy:     adminId,
      createdAt: now, updatedAt: now,
    });

    // Payment (skip for trial)
    if (plan.price > 0) {
      await payments.insertOne({
        _id: payId,
        userId,
        planId:         planIds[u.planKey],
        subscriptionId: subId,
        planSnapshot:   { name: plan.name, price: plan.price, durationDays: plan.durationDays },
        amount:         plan.price,
        paymentStatus:  'received',
        method:         'cash',
        paidAt:         now, // current date so MTD revenue shows correctly
        createdAt: now, updatedAt: now,
      });
    }

    // User
    const userDoc = {
      _id: userId,
      email: u.email,
      passwordHash: PASSWORD_HASH,
      name: u.name,
      role: 'user',
      profile: u.profile,
      activeSubscriptionId: subId,
      gymStatus: u.gymStatus,
      ...(u.leftAt ? { leftAt: u.leftAt, leftReason: u.leftReason } : {}),
      createdAt: now, updatedAt: now,
    };
    await users.insertOne(userDoc);
    console.log(`   ✓ ${u.name} (${u.email}) — ${u.desc}`);
  }

  // ── 4. Workout plans ──────────────────────────────────────────────────────
  console.log('\n🏋️  Creating workout plans...');

  // Arjun: active plan, started 28 days ago, ends in 28 days (>7 days left → NOT in renewal window)
  const arjunWorkoutId = oid();
  await workouts.insertOne({
    _id: arjunWorkoutId,
    userId:    userIds.arjun,
    name:      'Push Pull Legs — Premium Cycle',
    duration:  56,
    startDate: daysFromNow(-28),
    endDate:   daysFromNow(28),
    status:    'active',
    days:      buildWorkoutDays(),
    checkIn: {
      currentWeight: 78.5, energyLevel: 4, sleepQuality: 3, muscleSoreness: 2,
      dietAdherence: 4, notes: 'Feeling strong, progressing well on bench press.',
    },
    createdAt: now, updatedAt: now,
  });
  console.log('   ✓ Arjun — PPL 56-day cycle (active, 28d remaining)');

  // Priya: active plan, started 20 days ago, ends in 8 days (>7 days → not in window)
  const priyaWorkoutId = oid();
  await workouts.insertOne({
    _id: priyaWorkoutId,
    userId:    userIds.priya,
    name:      'Beginner Full Body — Weight Loss',
    duration:  28,
    startDate: daysFromNow(-20),
    endDate:   daysFromNow(8),
    status:    'active',
    days: [
      { day: 'Monday',    exercises: [{ name: 'Goblet Squat', sets: 3, reps: '12', rest: 60 }, { name: 'DB Row', sets: 3, reps: '12', rest: 60 }, { name: 'Push-ups', sets: 3, reps: '10', rest: 45 }] },
      { day: 'Wednesday', exercises: [{ name: 'Lunges', sets: 3, reps: '10 each', rest: 60 }, { name: 'Lat Pulldown', sets: 3, reps: '12', rest: 60 }, { name: 'DB Shoulder Press', sets: 3, reps: '10', rest: 60 }] },
      { day: 'Friday',    exercises: [{ name: 'Leg Press', sets: 3, reps: '15', rest: 60 }, { name: 'Cable Row', sets: 3, reps: '12', rest: 60 }, { name: 'Tricep Dips', sets: 3, reps: '12', rest: 45 }] },
    ],
    checkIn: {
      currentWeight: 62, energyLevel: 3, sleepQuality: 4, muscleSoreness: 2,
      dietAdherence: 3, notes: 'Managing diet on weekdays, weekends are harder.',
    },
    createdAt: now, updatedAt: now,
  });
  console.log('   ✓ Priya  — Full Body 28-day cycle (active, 8d remaining)');

  // ── 5. Diet plan (this week) ───────────────────────────────────────────────
  console.log('\n🥗  Creating diet plans...');

  const weekEnd = new Date(thisMonday); weekEnd.setDate(thisMonday.getDate() + 6);
  await diets.insertOne({
    userId:          userIds.arjun,
    name:            'High Protein Weekly Plan',
    weekStartDate:   thisMonday,
    weekEndDate:     weekEnd,
    status:          'active',
    avgDailyCalories: 2100,
    avgMacros:       { protein: 165, carbs: 225, fats: 58 },
    days:            buildDietDays(thisMonday),
    generatedFrom:   'ai',
    checkIn: {
      currentWeight: 78.5, energyLevel: 4, sleepQuality: 3, muscleSoreness: 2,
      dietAdherence: 4, notes: 'Sticking to macros, hunger is manageable.',
    },
    createdAt: now, updatedAt: now,
  });
  console.log('   ✓ Arjun  — High Protein weekly plan (this week)');

  // ── 6. Progress logs — Arjun last 7 days ──────────────────────────────────
  console.log('\n📊 Creating progress logs...');
  const logs = buildProgressLogs(userIds.arjun, 7);
  await progress.insertMany(logs);
  console.log(`   ✓ Arjun  — ${logs.length} daily logs (last 7 days)`);

  // Small sample for Priya — 3 days
  const priyaLogs = [
    { userId: userIds.priya, date: daysFromNow(-3), workout: { day: 'Monday', completedExercises: 3, totalExercises: 3, durationSec: 2400 }, meals: [{ mealName: 'Lunch', loggedAt: daysFromNow(-3), calories: 420, macros: { protein: 28, carbs: 45, fats: 10 } }], isLeaveDay: false, createdAt: now, updatedAt: now },
    { userId: userIds.priya, date: daysFromNow(-2), workout: null, meals: [{ mealName: 'Breakfast', loggedAt: daysFromNow(-2), calories: 320, macros: { protein: 20, carbs: 38, fats: 8 } }], isLeaveDay: false, createdAt: now, updatedAt: now },
    { userId: userIds.priya, date: daysFromNow(-1), workout: { day: 'Wednesday', completedExercises: 3, totalExercises: 3, durationSec: 2700 }, meals: [], isLeaveDay: false, createdAt: now, updatedAt: now },
  ];
  await progress.insertMany(priyaLogs);
  console.log('   ✓ Priya  — 3 daily logs');

  // ── 7. Leave requests ─────────────────────────────────────────────────────
  console.log('\n🏖  Creating leave requests...');

  const leaveDate1 = new Date(today); leaveDate1.setDate(today.getDate() + 3);
  const leaveDate2 = new Date(today); leaveDate2.setDate(today.getDate() + 4);

  await leaves.insertOne({
    userId:      userIds.priya,
    dates:       [leaveDate1.toISOString().slice(0,10), leaveDate2.toISOString().slice(0,10)],
    reason:      'Family function — cousin\'s wedding out of town.',
    status:      'pending',
    forcedDates: [],
    extensionApplied: false,
    requestedAt: now, createdAt: now, updatedAt: now,
  });
  console.log('   ✓ Priya  — leave request pending (2 days next week)');

  // An already-approved leave for Arjun (historical)
  await leaves.insertOne({
    userId:      userIds.arjun,
    dates:       [daysFromNow(-10).toISOString().slice(0,10)],
    reason:      'Mild fever, doctor advised rest.',
    status:      'approved',
    adminNote:   'Approved. Subscription extended by 1 day.',
    forcedDates: [],
    extensionApplied: true,
    requestedAt: daysFromNow(-11), createdAt: daysFromNow(-11), updatedAt: daysFromNow(-10),
  });
  console.log('   ✓ Arjun  — leave request approved (historical)');

  // ── 8. Plan request — Rohit pending check-in ─────────────────────────────
  console.log('\n📝 Creating plan requests...');

  await planReqs.insertOne({
    userId:    userIds.rohit,
    status:    'pending',
    planTypes: ['workout'], // Basic plan has aiDietPlan: false
    checkIn: {
      currentWeight: 88,
      energyLevel:   3,
      sleepQuality:  3,
      muscleSoreness: 1,
      dietAdherence:  2,
      notes: 'Lost 3kg this month. Energy levels are okay. Ready to push harder.',
    },
    requestedAt: now, createdAt: now, updatedAt: now,
  });
  console.log('   ✓ Rohit  — pending check-in (workout + diet)');

  // ── 9. Announcement ───────────────────────────────────────────────────────
  console.log('\n📢 Creating announcement...');
  const annStart = daysFromNow(-1);
  const annEnd   = daysFromNow(7);
  await announcements.insertOne({
    title:     'New Equipment Arrived! 🏋️',
    body:      'We\'ve added 2 new cable machines and a Smith machine to Floor 2. Come check them out — trainers are available to demo proper form.',
    type:      'info',
    startsAt:  annStart,
    expiresAt: annEnd,
    createdBy: adminId,
    createdAt: now, updatedAt: now,
  });
  console.log('   ✓ Announcement active for next 7 days');

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(60));
  console.log('✅ SEED COMPLETE\n');
  console.log('📋 Subscription Plans: Trial | Basic (₹999) | Gold (₹1999) | Premium (₹2999)');
  console.log('\n👥 Test Users (password: Test@1234)');
  console.log('');
  for (const u of userData) {
    console.log(`   ${u.name.padEnd(15)} ${u.email.padEnd(22)} ${u.desc}`);
  }
  console.log('\n🔑 Admin login: admin@fitflow.com / ChangeMe123!');
  console.log('─'.repeat(60) + '\n');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => { console.error('\n❌ Seed failed:', err.message); mongoose.disconnect(); process.exit(1); });
