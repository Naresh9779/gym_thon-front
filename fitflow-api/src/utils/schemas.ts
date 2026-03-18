import { z } from 'zod';
import LeaveRequest from '../models/LeaveRequest';

export const checkInSchema = z.object({
  currentWeight: z.number().positive().optional(),
  energyLevel: z.number().min(1).max(5),
  sleepQuality: z.number().min(1).max(5),
  muscleSoreness: z.number().min(1).max(5),
  dietAdherence: z.number().min(0).max(100),
  injuries: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
});

export type CheckInInput = z.infer<typeof checkInSchema>;

export function getMondayOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d;
}

export function getLastMonthDate(): { year: number; month: number } {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export async function getApprovedLeaveDatesForMonth(userId: string, year: number, month: number): Promise<Set<string>> {
  const monthStr = String(month).padStart(2, '0');
  const leaveRequests = await LeaveRequest.find({
    userId,
    status: 'approved',
    dates: { $elemMatch: { $gte: `${year}-${monthStr}-01`, $lte: `${year}-${monthStr}-31` } },
  }).lean();
  return new Set<string>(
    (leaveRequests as any[]).flatMap(r => r.dates as string[])
      .filter((d: string) => {
        const [y, m] = d.split('-').map(Number);
        return y === year && m === month;
      })
  );
}

import GymHoliday from '../models/GymHoliday';

export async function getGymHolidayDatesForMonth(year: number, month: number): Promise<Set<string>> {
  const monthStr = String(month).padStart(2, '0');
  const holidays = await GymHoliday.find({
    date: { $gte: `${year}-${monthStr}-01`, $lte: `${year}-${monthStr}-31` },
  }).lean();
  return new Set<string>((holidays as any[]).map(h => h.date as string));
}
