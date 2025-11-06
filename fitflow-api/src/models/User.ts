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
    timezone: { type: String, default: 'UTC' }
  },
  subscription: {
    plan: String,
    status: { type: String, enum: ['active','inactive','trial'], default: 'active' },
    expiresAt: Date
  }
}, { timestamps: true });

export default model('User', UserSchema);
