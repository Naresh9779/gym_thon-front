import { Schema, model, Document, Types } from 'mongoose';

export interface ILeaveRequest extends Document {
  userId: Types.ObjectId;
  dates: string[];           // YYYY-MM-DD strings
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  adminNote?: string;
  extensionApplied: boolean; // true once subscription was extended
  forcedDates: string[];     // dates admin marked "came anyway" → subscription reverted 1 day each
  createdAt: Date;
  updatedAt: Date;
}

const LeaveRequestSchema = new Schema<ILeaveRequest>(
  {
    userId:           { type: Schema.Types.ObjectId, ref: 'User', required: true },
    dates:            { type: [String], required: true },
    reason:           { type: String, required: true, trim: true },
    status:           { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' },
    adminNote:        { type: String, default: '' },
    extensionApplied: { type: Boolean, default: false },
    forcedDates:      { type: [String], default: [] },
  },
  { timestamps: true }
);

LeaveRequestSchema.index({ userId: 1, status: 1 });
LeaveRequestSchema.index({ status: 1, createdAt: -1 });

export default model<ILeaveRequest>('LeaveRequest', LeaveRequestSchema);
