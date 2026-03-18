import { Schema, model } from 'mongoose';

const FoodSchema = new Schema({
  name: String, portion: String, calories: Number, protein: Number, carbs: Number, fats: Number
});

const MealSchema = new Schema({
  name: String, time: String, totalCalories: Number,
  foods: [FoodSchema],
  macros: { protein: Number, carbs: Number, fats: Number }
});

const DietDaySchema = new Schema({
  dayName: { type: String }, // 'Monday', 'Tuesday', etc.
  date: { type: Date },
  meals: [MealSchema],
  totalCalories: Number,
  macros: { protein: Number, carbs: Number, fats: Number },
});

const CheckInSchema = new Schema({
  currentWeight: Number,
  energyLevel: { type: Number, min: 1, max: 5 },
  sleepQuality: { type: Number, min: 1, max: 5 },
  muscleSoreness: { type: Number, min: 1, max: 5 },
  dietAdherence: { type: Number, min: 0, max: 100 },
  injuries: String,
  notes: String,
}, { _id: false });

const DietPlanSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  name: { type: String, default: 'Weekly Nutrition Plan' },
  weekStartDate: { type: Date, index: true },
  weekEndDate: { type: Date },
  status: { type: String, enum: ['active', 'completed'], default: 'active', index: true },
  avgDailyCalories: Number,
  avgMacros: { protein: Number, carbs: Number, fats: Number },
  days: [DietDaySchema],
  generatedFrom: { type: String, enum: ['manual', 'ai', 'user-self', 'admin'], default: 'manual' },
  checkIn: CheckInSchema,
  notes: String,
}, { timestamps: true });

// One weekly plan per user per week start date
DietPlanSchema.index({ userId: 1, weekStartDate: 1 }, { unique: true, sparse: true, name: 'userId_weekStart_unique' });

export default model('DietPlan', DietPlanSchema);
