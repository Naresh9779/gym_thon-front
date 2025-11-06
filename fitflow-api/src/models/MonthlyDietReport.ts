import { Schema, model } from 'mongoose';

const MonthlyDietReportSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  year: { type: Number, required: true },
  month: { type: Number, required: true },
  dailyPlans: [{ type: Schema.Types.ObjectId, ref: 'DietPlan' }],
  dailyProgress: [{ type: Schema.Types.ObjectId, ref: 'ProgressLog' }],
  adherenceScore: { type: Number, min: 0, max: 100 },
  avgDailyCalories: Number,
  avgMacros: { protein: Number, carbs: Number, fats: Number },
  totalDaysLogged: Number,
  notes: String,
  generatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

MonthlyDietReportSchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });

export default model('MonthlyDietReport', MonthlyDietReportSchema);
