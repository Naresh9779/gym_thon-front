import { Schema, model, Document, Types } from 'mongoose';

export interface ILeaveRequest extends Document {
  userId: Types.ObjectId;
  /** Leave dates as YYYY-MM-DD strings */
  dates: string[];
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  adminNote?: string;
  /** True once the subscription has been extended to compensate for approved leave */
  extensionApplied: boolean;
  /** Dates admin marked as "came anyway" — subscription reverted 1 day each */
  forcedDates: string[];
  createdAt: Date;
  updatedAt: Date;
}

const LeaveRequestSchema = new Schema<ILeaveRequest>(
  {
    userId:           { type: Schema.Types.ObjectId, ref: 'User', required: true },
    dates:            { type: [String], required: true, validate: { validator: (v: string[]) => v.length >= 1 && v.length <= 30, message: 'Leave request must be between 1 and 30 days' } },
    reason:           { type: String, required: true, trim: true },
    status:           { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' },
    adminNote:        { type: String, default: '' },
    extensionApplied: { type: Boolean, default: false },
    forcedDates:      { type: [String], default: [] },
  },
  {
    timestamps: true,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  },
);

LeaveRequestSchema.index({ userId: 1, status: 1 });
LeaveRequestSchema.index({ status: 1, createdAt: -1 });

// ── Virtuals ──────────────────────────────────────────────────────────────────

/** Total days requested */
LeaveRequestSchema.virtual('daysCount').get(function (this: ILeaveRequest) {
  return this.dates.length;
});

/** Approved days minus forced (came-anyway) days */
LeaveRequestSchema.virtual('effectiveDays').get(function (this: ILeaveRequest) {
  return this.dates.length - this.forcedDates.length;
});

export default model<ILeaveRequest>('LeaveRequest', LeaveRequestSchema);
