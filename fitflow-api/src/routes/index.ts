import { Router } from 'express';
import auth from './auth';
import users from './users';
import diet from './diet';
import workouts from './workouts';
import progress from './progress';
import reports from './reports';
import admin from './admin';
import analytics from './analytics';
import cron from './cron';
import plans from './plans';
import leave from './leave';
import gym from './gym';
import attendance from './attendance';

const router = Router();

router.get('/health', (_req, res) => res.json({ ok: true, data: { status: 'healthy' } }));
router.use('/auth', auth);
router.use('/users', users);
router.use('/diet', diet);
router.use('/workouts', workouts);
router.use('/progress', progress);
router.use('/reports', reports);
router.use('/admin', admin);
router.use('/analytics', analytics);
router.use('/cron', cron);
router.use('/plans', plans);
router.use('/leave', leave);
router.use('/gym', gym);
router.use('/attendance', attendance);

export default router;
