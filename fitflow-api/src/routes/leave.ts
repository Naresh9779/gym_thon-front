import { Router } from 'express';
import { Types } from 'mongoose';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import LeaveRequest from '../models/LeaveRequest';
import User from '../models/User';

const router = Router();
router.use(authenticate);

// ─── USER ROUTES ────────────────────────────────────────────────────────────

// GET /api/leave — user's own leave requests
router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const requests = await LeaveRequest.find({ userId }).sort({ createdAt: -1 }).lean();
    res.json({ ok: true, data: { requests } });
  } catch (err) {
    console.error('[Leave] list error', err);
    res.status(500).json({ ok: false, error: { message: 'Failed to fetch leave requests' } });
  }
});

// POST /api/leave — submit a leave request
router.post('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { dates, reason } = req.body;

    if (!Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ ok: false, error: { message: 'At least one date is required' } });
    }
    if (!reason?.trim()) {
      return res.status(400).json({ ok: false, error: { message: 'Reason is required' } });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (dates.some((d: string) => !dateRegex.test(d))) {
      return res.status(400).json({ ok: false, error: { message: 'Dates must be in YYYY-MM-DD format' } });
    }

    // Enforce window: past 3 days → upcoming 7 days
    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0);
    const minDate = new Date(todayUTC); minDate.setUTCDate(minDate.getUTCDate() - 3);
    const maxDate = new Date(todayUTC); maxDate.setUTCDate(maxDate.getUTCDate() + 7);
    const minStr = minDate.toISOString().slice(0, 10);
    const maxStr = maxDate.toISOString().slice(0, 10);
    if (dates.some((d: string) => d < minStr || d > maxStr)) {
      return res.status(400).json({
        ok: false,
        error: { message: `Leave dates must be within the last 3 days or next 7 days (${minStr} to ${maxStr})` },
      });
    }

    // No duplicate pending/approved requests for the same dates
    const userObjId = new Types.ObjectId(userId);
    const existing = await LeaveRequest.findOne({
      userId: userObjId,
      dates: { $elemMatch: { $in: dates } },
      status: { $in: ['pending', 'approved'] },
    });
    if (existing) {
      return res.status(409).json({ ok: false, error: { message: 'A leave request for one or more of these dates already exists' } });
    }

    const request = await LeaveRequest.create({ userId: userObjId, dates, reason: reason.trim() });
    res.status(201).json({ ok: true, data: { request } });
  } catch (err) {
    console.error('[Leave] create error', err);
    res.status(500).json({ ok: false, error: { message: 'Failed to submit leave request' } });
  }
});

// DELETE /api/leave/:id — cancel a pending request
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const request = await LeaveRequest.findOne({ _id: req.params.id, userId });
    if (!request) return res.status(404).json({ ok: false, error: { message: 'Request not found' } });
    if (request.status !== 'pending') {
      return res.status(400).json({ ok: false, error: { message: 'Only pending requests can be cancelled' } });
    }
    request.status = 'cancelled';
    await request.save();
    res.json({ ok: true, data: { request } });
  } catch (err) {
    console.error('[Leave] cancel error', err);
    res.status(500).json({ ok: false, error: { message: 'Failed to cancel leave request' } });
  }
});

// ─── ADMIN ROUTES ────────────────────────────────────────────────────────────

// GET /api/leave/admin/requests?status=pending&userId=
router.get('/admin/requests', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { status, userId } = req.query;
    const filter: Record<string, any> = {};
    if (status) filter.status = status;
    if (userId) filter.userId = userId;

    const requests = await LeaveRequest.find(filter)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ ok: true, data: { requests } });
  } catch (err) {
    console.error('[Leave] admin list error', err);
    res.status(500).json({ ok: false, error: { message: 'Failed to fetch leave requests' } });
  }
});

// PATCH /api/leave/admin/requests/:id/approve — approve + extend subscription
router.patch('/admin/requests/:id/approve', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { adminNote } = req.body;
    const request = await LeaveRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ ok: false, error: { message: 'Request not found' } });
    if (request.status !== 'pending') {
      return res.status(400).json({ ok: false, error: { message: 'Only pending requests can be approved' } });
    }

    // Extend subscription endDate by number of leave days
    const daysToAdd = request.dates.length;
    const user = await User.findById(request.userId);
    if (!user) return res.status(404).json({ ok: false, error: { message: 'User not found' } });

    if (user.subscription?.endDate) {
      const end = new Date(user.subscription.endDate);
      end.setDate(end.getDate() + daysToAdd);
      user.subscription.endDate = end;
      await user.save();
    }

    request.status = 'approved';
    request.extensionApplied = true;
    if (adminNote) request.adminNote = adminNote;
    await request.save();

    res.json({ ok: true, data: { request, daysAdded: daysToAdd } });
  } catch (err) {
    console.error('[Leave] approve error', err);
    res.status(500).json({ ok: false, error: { message: 'Failed to approve leave request' } });
  }
});

// PATCH /api/leave/admin/requests/:id/reject
router.patch('/admin/requests/:id/reject', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { adminNote } = req.body;
    const request = await LeaveRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ ok: false, error: { message: 'Request not found' } });
    if (request.status !== 'pending') {
      return res.status(400).json({ ok: false, error: { message: 'Only pending requests can be rejected' } });
    }
    request.status = 'rejected';
    if (adminNote) request.adminNote = adminNote;
    await request.save();
    res.json({ ok: true, data: { request } });
  } catch (err) {
    console.error('[Leave] reject error', err);
    res.status(500).json({ ok: false, error: { message: 'Failed to reject leave request' } });
  }
});

// PATCH /api/leave/admin/requests/:id/force-came
// Body: { date: "YYYY-MM-DD" } — mark one date as "user came anyway" → revert 1 day from subscription
router.patch('/admin/requests/:id/force-came', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { date } = req.body;
    if (!date) return res.status(400).json({ ok: false, error: { message: 'date is required' } });

    const request = await LeaveRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ ok: false, error: { message: 'Request not found' } });
    if (request.status !== 'approved') {
      return res.status(400).json({ ok: false, error: { message: 'Only approved requests support force-came' } });
    }
    if (!request.dates.includes(date)) {
      return res.status(400).json({ ok: false, error: { message: 'Date is not part of this leave request' } });
    }
    if (request.forcedDates.includes(date)) {
      return res.status(409).json({ ok: false, error: { message: 'Date is already marked as force-came' } });
    }

    // Revert 1 day from user subscription
    const user = await User.findById(request.userId);
    if (!user) return res.status(404).json({ ok: false, error: { message: 'User not found' } });

    if (user.subscription?.endDate) {
      const end = new Date(user.subscription.endDate);
      end.setDate(end.getDate() - 1);
      user.subscription.endDate = end;
      await user.save();
    }

    request.forcedDates.push(date);
    await request.save();

    res.json({ ok: true, data: { request } });
  } catch (err) {
    console.error('[Leave] force-came error', err);
    res.status(500).json({ ok: false, error: { message: 'Failed to mark force-came' } });
  }
});

// GET /api/leave/admin/user/:userId — all leave requests for a specific user (admin view)
router.get('/admin/user/:userId', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const requests = await LeaveRequest.find({ userId: req.params.userId }).sort({ createdAt: -1 }).lean();
    res.json({ ok: true, data: { requests } });
  } catch (err) {
    console.error('[Leave] admin user leave error', err);
    res.status(500).json({ ok: false, error: { message: 'Failed to fetch leave requests' } });
  }
});

export default router;
