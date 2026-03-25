import { Schema, model, Document, Types } from 'mongoose';
import { checkInSubSchema, ICheckIn } from './shared';

export interface IMacros { protein?: number; carbs?: number; fats?: number }

export interface IFood {
  name?: string; portion?: string; calories?: number;
  protein?: number; carbs?: number; fats?: number;
}

export interface IMeal {
  name?: string; time?: string; totalCalories?: number;
  foods?: IFood[];
  macros?: IMacros;
}

export interface IDietDay {
  dayName?: string;
  date?: Date;
  meals?: IMeal[];
  totalCalories?: number;
  macros?: IMacros;
}

export interface IDietPlan extends Document {
  userId: Types.ObjectId;
  name: string;
  weekStartDate?: Date;
  weekEndDate?: Date;
  status: 'active' | 'completed';
  avgDailyCalories?: number;
  avgMacros?: IMacros;
  days?: IDietDay[];
  generatedFrom?: 'manual' | 'ai' | 'user-self' | 'admin';
  checkIn?: ICheckIn;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FoodSchema = new Schema<IFood>({
  name: String, portion: String, calories: Number,
  protein: Number, carbs: Number, fats: Number,
});

const MealSchema = new Schema<IMeal>({
  name: String, time: String, totalCalories: Number,
  foods: [FoodSchema],
  macros: { protein: Number, carbs: Number, fats: Number },
});

const DietDaySchema = new Schema<IDietDay>({
  dayName:       String,
  date:          Date,
  meals:         [MealSchema],
  totalCalories: Number,
  macros:        { protein: Number, carbs: Number, fats: Number },
});

const DietPlanSchema = new Schema<IDietPlan>(
  {
    userId:           { type: Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    name:             { type: String, default: 'Weekly Nutrition Plan' },
    weekStartDate:    { type: Date, index: true },
    weekEndDate:      Date,
    status:           { type: String, enum: ['active', 'completed'], default: 'active', index: true },
    avgDailyCalories: Number,
    avgMacros:        { protein: Number, carbs: Number, fats: Number },
    days:             [DietDaySchema],
    generatedFrom:    { type: String, enum: ['manual', 'ai', 'user-self', 'admin'], default: 'manual' },
    checkIn:          checkInSubSchema,
    notes:            String,
  },
  { timestamps: true },
);

// One weekly plan per user per week
DietPlanSchema.index(
  { userId: 1, weekStartDate: 1 },
  { unique: true, sparse: true, name: 'userId_weekStart_unique' },
);

// Compound index for common query: active plans for user ordered by week
DietPlanSchema.index({ userId: 1, status: 1, weekStartDate: -1 });

// ── Pre-save: auto-compute avgDailyCalories and avgMacros from days ───────────

DietPlanSchema.pre('save', function (next) {
  const days = this.days;
  if (!days || days.length === 0) return next();

  const daysWithCalories = days.filter(d => (d.totalCalories ?? 0) > 0);
  if (daysWithCalories.length > 0) {
    this.avgDailyCalories = Math.round(
      daysWithCalories.reduce((s, d) => s + (d.totalCalories ?? 0), 0) / daysWithCalories.length,
    );
  }

  const daysWithMacros = days.filter(d => d.macros && ((d.macros.protein ?? 0) + (d.macros.carbs ?? 0) + (d.macros.fats ?? 0)) > 0);
  if (daysWithMacros.length > 0) {
    this.avgMacros = {
      protein: Math.round(daysWithMacros.reduce((s, d) => s + (d.macros?.protein ?? 0), 0) / daysWithMacros.length),
      carbs:   Math.round(daysWithMacros.reduce((s, d) => s + (d.macros?.carbs   ?? 0), 0) / daysWithMacros.length),
      fats:    Math.round(daysWithMacros.reduce((s, d) => s + (d.macros?.fats    ?? 0), 0) / daysWithMacros.length),
    };
  }

  next();
});

export default model<IDietPlan>('DietPlan', DietPlanSchema);
