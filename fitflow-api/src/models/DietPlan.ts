import { Schema, model } from 'mongoose';

const FoodSchema = new Schema({ 
  name: String, 
  portion: String, 
  calories: Number, 
  protein: Number,
  carbs: Number,
  fats: Number
});

const MealSchema = new Schema({ 
  name: String, 
  time: String, 
  totalCalories: Number,
  foods: [FoodSchema],
  macros: {
    protein: Number,
    carbs: Number,
    fats: Number
  }
});

const DietPlanSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  name: { type: String, default: 'Daily Diet Plan' },
  date: { type: Date, required: true, index: true },
  dailyCalories: Number,
  macros: { protein: Number, carbs: Number, fats: Number },
  meals: [MealSchema],
  generatedFrom: { type: String, enum: ['manual', 'ai', 'auto-daily'], default: 'manual' },
  previousDayProgressId: { type: Schema.Types.ObjectId, ref: 'ProgressLog' },
  notes: String
}, { timestamps: true });

// Enforce uniqueness: one diet plan per user per date
DietPlanSchema.index({ userId: 1, date: 1 }, { unique: true, name: 'userId_date_unique' });

export default model('DietPlan', DietPlanSchema);
