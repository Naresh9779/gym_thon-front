import { Schema, model, Document, Types } from 'mongoose';

export interface ILoggedMeal {
  mealName?: string;
  loggedAt?: Date;
  calories?: number;
  macros?: { protein?: number; carbs?: number; fats?: number };
}

export interface IWorkoutProgress {
  day?: string;
  completedExercises?: number;
  totalExercises?: number;
  durationSec?: number;
}

export interface IMeasurements {
  weight?: number;
  bodyFat?: number;
  waist?: number;
  hips?: number;
  chest?: number;
}

export interface IAttendance {
  markedInAt?: Date;
  markedOutAt?: Date;
  /** present = full session, absent = no mark, leave = approved leave, holiday = gym holiday */
  status: 'present' | 'absent' | 'leave' | 'holiday';
  autoMarkedOut: boolean;
  durationMinutes?: number;
  /** who triggered mark-out */
  markedOutBy?: 'user' | 'auto' | 'admin';
}

export interface IProgressLog extends Document {
  userId: Types.ObjectId;
  date: Date;
  workout?: IWorkoutProgress;
  meals: ILoggedMeal[];
  measurements?: IMeasurements;
  isLeaveDay: boolean;
  attendance?: IAttendance;
  createdAt: Date;
  updatedAt: Date;
}

// Unified macro naming: protein/carbs/fats (NOT p/c/f)
const LoggedMealSchema = new Schema<ILoggedMeal>({
  mealName: String,
  loggedAt: Date,
  calories: Number,
  macros: { protein: Number, carbs: Number, fats: Number },
});

const WorkoutProgressSchema = new Schema<IWorkoutProgress>({
  day: String, completedExercises: Number, totalExercises: Number, durationSec: Number,
});

const MeasurementsSchema = new Schema<IMeasurements>({
  weight: Number, bodyFat: Number, waist: Number, hips: Number, chest: Number,
});

const AttendanceSchema = new Schema<IAttendance>({
  markedInAt:      Date,
  markedOutAt:     Date,
  status:          { type: String, enum: ['present', 'absent', 'leave', 'holiday'], default: 'absent' },
  autoMarkedOut:   { type: Boolean, default: false },
  durationMinutes: Number,
  markedOutBy:     { type: String, enum: ['user', 'auto', 'admin'] },
}, { _id: false });

const ProgressLogSchema = new Schema<IProgressLog>(
  {
    userId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date:        { type: Date, default: () => new Date() },
    workout:     WorkoutProgressSchema,
    meals:       [LoggedMealSchema],
    measurements:MeasurementsSchema,
    isLeaveDay:  { type: Boolean, default: false },
    attendance:  AttendanceSchema,
  },
  { timestamps: true },
);

// Unique: one log per user per day. Enforced at DB level.
ProgressLogSchema.index({ userId: 1, date: 1 }, { unique: true });

// ── Pre-save: normalize date to midnight UTC ──────────────────────────────────

ProgressLogSchema.pre('save', function (next) {
  if (this.date) {
    const d = new Date(this.date);
    d.setHours(0, 0, 0, 0);
    this.date = d;
  }
  next();
});

export default model<IProgressLog>('ProgressLog', ProgressLogSchema);
