import { Schema, model } from 'mongoose';

const LoggedMealSchema = new Schema({ mealName: String, loggedAt: Date, calories: Number, macros: { p: Number, c: Number, f: Number } });
const WorkoutProgressSchema = new Schema({ day: String, completedExercises: Number, totalExercises: Number, durationSec: Number });

const ProgressLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  date: { type: Date, default: () => new Date(), index: true },
  workout: WorkoutProgressSchema,
  meals: [LoggedMealSchema]
}, { timestamps: true });

ProgressLogSchema.index({ userId: 1, date: -1 });

export default model('ProgressLog', ProgressLogSchema);
