import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, AuthRequest } from '../middleware/auth';
import ProgressLog from '../models/ProgressLog';
import GymSettings from '../models/GymSettings';
import Subscription from '../models/Subscription';
import LeaveRequest from '../models/LeaveRequest';
import GymHoliday from '../models/GymHoliday';

const router = Router();

// All attendance routes require authentication
router.use(authenticate);

/** Normalize a Date to midnight UTC (same as ProgressLog pre-save hook) */
function toMidnight(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

/**
 * POST /api/attendance/mark-in
 * Body: { token: string }  — short-lived JWT issued by GET /api/admin/attendance/qr-token
 */
router.post('/mark-in', async (req: AuthRequest, res) => {
  try {
    const settings = await (GymSettings as any).getOrCreate();
    if (!settings.attendanceEnabled) {
      return res.status(403).json({ ok: false, error: { message: 'Attendance system is not enabled' } });
    }

    // Verify QR token
    const { token } = req.body as { token?: string };
    if (!token) {
      return res.status(400).json({ ok: false, error: { message: 'QR token is required' } });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      if (decoded.type !== 'gym-checkin') throw new Error('Invalid token type');
    } catch {
      return res.status(400).json({ ok: false, error: { message: 'QR code expired or invalid. Please scan the latest code.' } });
    }

    // Check active subscription
    const now = new Date();
    const activeSub = await Subscription.findOne({
      userId: req.user!.userId,
      status: { $in: ['active', 'trial'] },
      endDate: { $gt: now },
    });
    if (!activeSub) {
      return res.status(403).json({ ok: false, error: { message: 'No active subscription' } });
    }

    const today = toMidnight(now);

    // Find or create today's ProgressLog
    let log = await ProgressLog.findOne({ userId: req.user!.userId, date: today });
    if (!log) {
      log = new ProgressLog({ userId: req.user!.userId, date: today, meals: [] });
    }

    // Already marked in today?
    if (log.attendance?.markedInAt) {
      return res.json({
        ok: true,
        data: {
          alreadyMarkedIn: true,
          markedInAt: log.attendance.markedInAt,
          markedOutAt: log.attendance.markedOutAt ?? null,
          durationMinutes: log.attendance.durationMinutes ?? null,
        },
      });
    }

    log.attendance = {
      markedInAt: now,
      markedOutAt: undefined,
      status: 'present',
      autoMarkedOut: false,
      durationMinutes: undefined,
      markedOutBy: undefined,
    };

    await log.save();

    return res.json({
      ok: true,
      data: { markedInAt: now, message: 'Attendance marked. Welcome!' },
    });
  } catch (err) {
    console.error('[Attendance] mark-in error', err);
    return res.status(500).json({ ok: false, error: { message: 'Failed to mark attendance' } });
  }
});

/**
 * POST /api/attendance/mark-out
 * No body required — uses auth to identify user.
 */
router.post('/mark-out', async (req: AuthRequest, res) => {
  try {
    const settings = await (GymSettings as any).getOrCreate();
    if (!settings.attendanceEnabled) {
      return res.status(403).json({ ok: false, error: { message: 'Attendance system is not enabled' } });
    }

    const now = new Date();
    const today = toMidnight(now);

    const log = await ProgressLog.findOne({ userId: req.user!.userId, date: today });
    if (!log?.attendance?.markedInAt) {
      return res.status(400).json({ ok: false, error: { message: 'You have not marked in today' } });
    }
    if (log.attendance.markedOutAt) {
      return res.json({
        ok: true,
        data: {
          alreadyMarkedOut: true,
          markedOutAt: log.attendance.markedOutAt,
          durationMinutes: log.attendance.durationMinutes,
        },
      });
    }

    const durationMinutes = Math.round(
      (now.getTime() - log.attendance.markedInAt.getTime()) / 60000,
    );

    log.attendance.markedOutAt = now;
    log.attendance.durationMinutes = durationMinutes;
    log.attendance.markedOutBy = 'user';
    await log.save();

    return res.json({
      ok: true,
      data: { markedOutAt: now, durationMinutes, message: 'See you next time!' },
    });
  } catch (err) {
    console.error('[Attendance] mark-out error', err);
    return res.status(500).json({ ok: false, error: { message: 'Failed to mark out' } });
  }
});

/**
 * GET /api/attendance/today
 * Returns today's attendance status for the authenticated user.
 */
router.get('/today', async (req: AuthRequest, res) => {
  try {
    const settings = await (GymSettings as any).getOrCreate();
    if (!settings.attendanceEnabled) {
      return res.json({ ok: true, data: { attendanceEnabled: false } });
    }

    const today = toMidnight(new Date());
    const log = await ProgressLog.findOne({ userId: req.user!.userId, date: today }).lean();

    return res.json({
      ok: true,
      data: {
        attendanceEnabled: true,
        autoMarkOutHours: settings.autoMarkOutHours,
        attendance: log?.attendance ?? null,
      },
    });
  } catch (err) {
    console.error('[Attendance] today error', err);
    return res.status(500).json({ ok: false, error: { message: 'Failed to fetch attendance' } });
  }
});

/**
 * GET /api/attendance/history?days=30
 * Returns last N days of attendance records for the authenticated user.
 */
router.get('/history', async (req: AuthRequest, res) => {
  try {
    const settings = await (GymSettings as any).getOrCreate();
    if (!settings.attendanceEnabled) {
      return res.json({ ok: true, data: { attendanceEnabled: false, records: [] } });
    }

    const maxDays = Math.min(parseInt(req.query.days as string) || 30, 90);
    const today = toMidnight(new Date());
    const windowFrom = toMidnight(new Date());
    windowFrom.setDate(windowFrom.getDate() - maxDays + 1);

    // Day-0 anchor = when admin enabled attendance
    const enabledAt = settings.attendanceEnabledAt ? toMidnight(new Date(settings.attendanceEnabledAt)) : null;
    const sub = !enabledAt ? await Subscription.findOne({ userId: req.user!.userId }).sort({ startDate: -1 }).lean() : null;
    const subStart = sub?.startDate ? toMidnight(new Date(sub.startDate)) : windowFrom;
    const anchor = enabledAt ?? subStart;
    const effectiveFrom = anchor > windowFrom ? anchor : windowFrom;

    // Build the full date range as YYYY-MM-DD strings (newest first)
    const DAY = 86400000;
    const totalDays = Math.round((today.getTime() - effectiveFrom.getTime()) / DAY) + 1;
    const dateRange = Array.from({ length: totalDays }, (_, i) =>
      new Date(today.getTime() - i * DAY).toISOString().slice(0, 10),
    );

    // Fetch all data in parallel
    const [logs, leaves, gymHolidays] = await Promise.all([
      ProgressLog.find({ userId: req.user!.userId, date: { $gte: effectiveFrom } }).lean(),
      LeaveRequest.find({ userId: req.user!.userId, status: 'approved' }).lean(),
      GymHoliday.find({ date: { $in: dateRange } }).lean(),
    ]);

    // Build lookup maps
    const attMap = new Map(
      logs.filter(l => l.attendance?.markedInAt).map(l => [l.date.toISOString().slice(0, 10), l.attendance!]),
    );
    const holidayMap = new Map(gymHolidays.map(h => [h.date, h.reason]));
    const leaveSet = new Set<string>();
    for (const lr of leaves) {
      for (const d of lr.dates) {
        if (!lr.forcedDates.includes(d)) leaveSet.add(d);
      }
    }

    // Build full record list — every day gets a status
    const records = dateRange.map(dateStr => {
      const att = attMap.get(dateStr);
      if (att) {
        return { date: dateStr, status: 'present' as const,
          markedInAt: att.markedInAt ?? null, markedOutAt: att.markedOutAt ?? null,
          durationMinutes: att.durationMinutes ?? null, autoMarkedOut: att.autoMarkedOut };
      }
      if (leaveSet.has(dateStr))   return { date: dateStr, status: 'leave' as const };
      if (holidayMap.has(dateStr)) return { date: dateStr, status: 'holiday' as const, reason: holidayMap.get(dateStr) };
      return { date: dateStr, status: 'absent' as const };
    });

    const presentDays  = records.filter(r => r.status === 'present').length;
    const absentDays   = records.filter(r => r.status === 'absent').length;
    const leaveDays    = records.filter(r => r.status === 'leave').length;
    const holidayDays  = records.filter(r => r.status === 'holiday').length;
    const totalMinutes = records.reduce((s, r) => s + (('durationMinutes' in r ? r.durationMinutes : 0) ?? 0), 0);

    return res.json({
      ok: true,
      data: {
        attendanceEnabled: true,
        records,
        summary: { presentDays, absentDays, leaveDays, holidayDays, totalDays, totalMinutes },
      },
    });
  } catch (err) {
    console.error('[Attendance] history error', err);
    return res.status(500).json({ ok: false, error: { message: 'Failed to fetch history' } });
  }
});

export default router;
