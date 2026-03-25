import { Schema, model, Document, Types } from 'mongoose';
import { checkInSubSchema, ICheckIn } from './shared';

export interface IPlanRequest extends Document {
  userId: Types.ObjectId;
  checkIn: ICheckIn;
  planTypes: Array<'workout' | 'diet'>;
  status: 'pending' | 'generated' | 'dismissed';
  requestedAt: Date;
  generatedAt?: Date;
  generatedBy?: Types.ObjectId;
  adminNote?: string;
  /** Set when the user dismisses the "plan ready" notification banner */
  userNotifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PlanRequestSchema = new Schema<IPlanRequest>(
  {
    userId:      { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    checkIn:     { type: checkInSubSchema, required: true },
    planTypes:   { type: [String], enum: ['workout', 'diet'], default: ['workout', 'diet'] },
    status:      { type: String, enum: ['pending', 'generated', 'dismissed'], default: 'pending', index: true },
    requestedAt: { type: Date, default: Date.now },
    generatedAt: Date,
    generatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    adminNote:   String,
    userNotifiedAt: Date,
  },
  { timestamps: true },
);

export default model<IPlanRequest>('PlanRequest', PlanRequestSchema);
