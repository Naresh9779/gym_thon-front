import { Schema, model } from 'mongoose';

const SessionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  refreshTokenHash: String,
  userAgent: String,
  ip: String,
  expiresAt: Date
}, { timestamps: true });

export default model('Session', SessionSchema);
