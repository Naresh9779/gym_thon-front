import { Schema, model, Document, Types } from 'mongoose';

export type AdminAction =
  | 'CREATE_USER'
  | 'UPDATE_USER_PROFILE'
  | 'UPDATE_SUBSCRIPTION'
  | 'ASSIGN_PLAN'
  | 'RECORD_PAYMENT'
  | 'GENERATE_WORKOUT'
  | 'GENERATE_DIET'
  | 'DELETE_WORKOUT'
  | 'DELETE_DIET'
  | 'UPDATE_WORKOUT'
  | 'UPDATE_DIET'
  | 'APPROVE_LEAVE'
  | 'REJECT_LEAVE'
  | 'CANCEL_LEAVE'
  | 'UPDATE_SUBSCRIPTION_PLAN'
  | 'VIEW_USER_DATA'
  | 'TRIGGER_SCHEDULER';

export interface IAdminLog extends Document {
  adminId: Types.ObjectId;
  adminEmail: string;
  action: AdminAction;
  targetUserId?: Types.ObjectId;
  targetUserEmail?: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const adminLogSchema = new Schema<IAdminLog>({
  adminId:         { type: Schema.Types.ObjectId, ref: 'User', required: true },
  adminEmail:      { type: String, required: true },
  action:          { type: String, required: true, enum: [
    'CREATE_USER', 'UPDATE_USER_PROFILE', 'UPDATE_SUBSCRIPTION',
    'ASSIGN_PLAN', 'RECORD_PAYMENT',
    'GENERATE_WORKOUT', 'GENERATE_DIET',
    'DELETE_WORKOUT', 'DELETE_DIET', 'UPDATE_WORKOUT', 'UPDATE_DIET',
    'APPROVE_LEAVE', 'REJECT_LEAVE', 'CANCEL_LEAVE',
    'UPDATE_SUBSCRIPTION_PLAN', 'VIEW_USER_DATA', 'TRIGGER_SCHEDULER',
  ] as AdminAction[] },
  targetUserId:    { type: Schema.Types.ObjectId, ref: 'User' },
  targetUserEmail: String,
  details:         { type: Schema.Types.Mixed, default: {} },
  ipAddress:       String,
  userAgent:       String,
  createdAt:       { type: Date, default: Date.now, index: true },
});

adminLogSchema.index({ adminId: 1, createdAt: -1 });
adminLogSchema.index({ targetUserId: 1, createdAt: -1 });

export default model<IAdminLog>('AdminLog', adminLogSchema);
