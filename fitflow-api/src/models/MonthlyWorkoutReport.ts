import { Schema, model } from 'mongoose';

const MonthlyWorkoutReportSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  year: { type: Number, required: true },
  month: { type: Number, required: true },
  workoutPlanId: { type: Schema.Types.ObjectId, ref: 'WorkoutPlan' },
  completedWorkouts: Number,
  totalWorkouts: Number,
  adherenceScore: { type: Number, min: 0, max: 100 },
  avgDuration: Number,
  strengthGains: { exercises: [{ name: String, initialWeight: Number, finalWeight: Number, improvement: Number }] },
  notes: String,
  generatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

MonthlyWorkoutReportSchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });

export default model('MonthlyWorkoutReport', MonthlyWorkoutReportSchema);
