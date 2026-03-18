import { Schema, model } from 'mongoose';

const ExerciseSchema = new Schema({
  name: { type: String, required: true },
  sets: { type: Number, default: 3 },
  reps: { type: String, default: '8-12' },
  rest: { type: Number, default: 60 },
  notes: String
});

const DaySchema = new Schema({ day: { type: String }, exercises: [ExerciseSchema] });

const CheckInSchema = new Schema({
  currentWeight: Number,
  energyLevel: { type: Number, min: 1, max: 5 },
  sleepQuality: { type: Number, min: 1, max: 5 },
  muscleSoreness: { type: Number, min: 1, max: 5 },
  dietAdherence: { type: Number, min: 0, max: 100 },
  injuries: String,
  notes: String,
}, { _id: false });

const WorkoutPlanSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  name: { type: String, default: 'Workout Cycle' },
  duration: { type: Number, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active', index: true },
  days: [DaySchema],
  checkIn: CheckInSchema,
  generatedFrom: { type: Schema.Types.ObjectId, ref: 'MonthlyWorkoutReport' }
}, { timestamps: true });

export default model('WorkoutPlan', WorkoutPlanSchema);
