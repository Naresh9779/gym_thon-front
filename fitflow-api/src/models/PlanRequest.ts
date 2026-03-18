import { Schema, model } from 'mongoose';

const CheckInSchema = new Schema({
  currentWeight: Number,
  energyLevel: { type: Number, min: 1, max: 5 },
  sleepQuality: { type: Number, min: 1, max: 5 },
  muscleSoreness: { type: Number, min: 1, max: 5 },
  dietAdherence: { type: Number, min: 0, max: 100 },
  injuries: String,
  notes: String,
}, { _id: false });

const PlanRequestSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  checkIn: { type: CheckInSchema, required: true },
  planTypes: { type: [String], enum: ['workout', 'diet'], default: ['workout', 'diet'] },
  status: { type: String, enum: ['pending', 'generated', 'dismissed'], default: 'pending', index: true },
  requestedAt: { type: Date, default: Date.now },
  generatedAt: Date,
  generatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  adminNote: String,
  userNotifiedAt: Date,   // set when user sees the "plan ready" banner
}, { timestamps: true });

export default model('PlanRequest', PlanRequestSchema);
