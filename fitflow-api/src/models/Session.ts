import { Schema, model, Document, Types } from 'mongoose';

export interface ISession extends Document {
  userId?: Types.ObjectId;
  refreshTokenHash?: string;
  userAgent?: string;
  ip?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    userId:           { type: Schema.Types.ObjectId, ref: 'User' },
    refreshTokenHash: String,
    userAgent:        String,
    ip:               String,
    expiresAt:        Date,
  },
  { timestamps: true },
);

// Auto-delete expired sessions — MongoDB TTL index
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Speed up token lookups on every refresh request
SessionSchema.index({ refreshTokenHash: 1 });

// Speed up "all sessions for user" queries (logout-all, security panel)
SessionSchema.index({ userId: 1 });

export default model<ISession>('Session', SessionSchema);
