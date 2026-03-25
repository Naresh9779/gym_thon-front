import { Schema, model, Document, Types } from 'mongoose';
import { checkInSubSchema, ICheckIn } from './shared';

export interface IExercise {
  name: string;
  sets?: number;
  reps?: string;
  rest?: number;
  notes?: string;
}

export interface IWorkoutDay {
  day?: string;
  exercises: IExercise[];
}

export interface IWorkoutPlan extends Document {
  userId: Types.ObjectId;
  name: string;
  duration: number;
  startDate: Date;
  endDate: Date;
  status: 'active' | 'completed' | 'cancelled';
  days: IWorkoutDay[];
  checkIn?: ICheckIn;
  generatedFrom?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ExerciseSchema = new Schema<IExercise>({
  name:  { type: String, required: true },
  sets:  { type: Number, default: 3 },
  reps:  { type: String, default: '8-12' },
  rest:  { type: Number, default: 60 },
  notes: String,
});

const DaySchema = new Schema<IWorkoutDay>({
  day:       String,
  exercises: [ExerciseSchema],
});

const WorkoutPlanSchema = new Schema<IWorkoutPlan>(
  {
    userId:    { type: Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    name:      { type: String, default: 'Workout Cycle' },
    duration:  { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate:   { type: Date, required: true },
    status:    { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active', index: true },
    days:      [DaySchema],
    checkIn:   checkInSubSchema,
    /** Reference to the PlanRequest that triggered generation */
    generatedFrom: { type: Schema.Types.ObjectId, ref: 'PlanRequest' },
  },
  { timestamps: true },
);

// Compound index: most common query pattern — active plans for a user ordered by date
WorkoutPlanSchema.index({ userId: 1, status: 1, endDate: -1 });

// ── Pre-validate ──────────────────────────────────────────────────────────────

WorkoutPlanSchema.pre('validate', function (next) {
  if (this.startDate && this.endDate && this.endDate <= this.startDate) {
    next(new Error('endDate must be after startDate'));
  } else {
    next();
  }
});

export default model<IWorkoutPlan>('WorkoutPlan', WorkoutPlanSchema);
