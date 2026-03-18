import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../middleware/auth';
import GymHoliday from '../models/GymHoliday';
import Announcement from '../models/Announcement';

const router = Router();
router.use(authenticate);

router.get('/today', async (_req: AuthRequest, res) => {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);
    const now = new Date();

    const [holiday, announcements] = await Promise.all([
      GymHoliday.findOne({ date: todayStr }).lean(),
      Announcement.find({ startsAt: { $lte: now }, expiresAt: { $gte: now } }).sort({ startsAt: -1 }).lean(),
    ]);

    res.json({
      ok: true,
      data: {
        isHoliday: !!holiday,
        holiday: holiday ? { reason: (holiday as any).reason } : undefined,
        announcements,
      },
    });
  } catch (err) {
    console.error('[Gym] today error', err);
    res.status(500).json({ ok: false, error: { message: 'Failed to fetch gym info' } });
  }
});

export default router;
