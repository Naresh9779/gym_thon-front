import { Schema, model } from 'mongoose';

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['user','admin'], default: 'user' },
  profile: {
    age: Number,
    weight: Number,
    height: Number,
    gender: String,
    goals: [String],
    activityLevel: String,
    preferences: [String],
    restrictions: [String],
    timezone: { type: String, default: 'UTC' },
    dietPreferences: {
      isVegetarian: { type: Boolean, default: false },
      weeklyBudget: Number,
      dietType: { type: String, enum: ['balanced', 'high_protein', 'low_carb', 'mediterranean'] },
    },
  },
  subscription: {
    plan: String,
    status: { type: String, enum: ['active','inactive','trial','expired'], default: 'active' },
    startDate: Date,
    endDate: Date,
    durationMonths: Number
  },
  assignedTrainerId: { type: Schema.Types.ObjectId, ref: 'User', default: null }, // admin user assigned as trainer
  trainerNotes: [{
    _id: { type: Schema.Types.ObjectId, auto: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  }]
}, { timestamps: true });

export default model('User', UserSchema);
