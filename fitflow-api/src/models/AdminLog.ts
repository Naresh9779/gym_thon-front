import { Schema, model, Document } from 'mongoose';

interface IAdminLog extends Document {
  adminId: Schema.Types.ObjectId;
  adminEmail: string;
  action: string;
  targetUserId?: Schema.Types.ObjectId;
  targetUserEmail?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const adminLogSchema = new Schema<IAdminLog>({
  adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  adminEmail: { type: String, required: true },
  action: { 
    type: String, 
    required: true,
    enum: [
      'CREATE_USER',
      'UPDATE_USER_PROFILE',
      'UPDATE_SUBSCRIPTION',
      'GENERATE_WORKOUT',
      'GENERATE_DIET',
      'DELETE_WORKOUT',
      'DELETE_DIET',
      'UPDATE_WORKOUT',
      'UPDATE_DIET',
      'VIEW_USER_DATA',
      'TRIGGER_SCHEDULER'
    ]
  },
  targetUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  targetUserEmail: { type: String },
  details: { type: Schema.Types.Mixed, default: {} },
  ipAddress: { type: String },
  userAgent: { type: String },
  createdAt: { type: Date, default: Date.now, index: true }
});

// Index for querying by admin and date
adminLogSchema.index({ adminId: 1, createdAt: -1 });
adminLogSchema.index({ targetUserId: 1, createdAt: -1 });

const AdminLog = model<IAdminLog>('AdminLog', adminLogSchema);

export default AdminLog;
