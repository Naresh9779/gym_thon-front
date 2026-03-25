import { Schema, model, Document, Types } from 'mongoose';

export interface ISubscriptionFeatures {
  aiWorkoutPlan: boolean;
  aiDietPlan: boolean;
  leaveRequests: boolean;
  progressTracking: boolean;
}

export interface ISubscription extends Document {
  userId: Types.ObjectId;
  /** Reference to the plan template — kept for audit, NOT used as live source of features */
  planId?: Types.ObjectId;
  /** Snapshot of plan name at assignment time */
  planName: string;
  /** Snapshot of price at assignment time */
  price: number;
  /** Snapshot of features at assignment time — authoritative for this period */
  features: ISubscriptionFeatures;
  status: 'active' | 'trial' | 'expired' | 'cancelled';
  startDate: Date;
  endDate: Date;
  durationMonths: number;
  /** Payment that activated this subscription (null for trial) */
  paymentId?: Types.ObjectId;
  /** Admin who assigned this subscription */
  assignedBy?: Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    userId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    planId:   { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
    planName: { type: String, required: true, trim: true },
    price:    { type: Number, required: true, min: 0, default: 0 },
    features: {
      aiWorkoutPlan:    { type: Boolean, default: false },
      aiDietPlan:       { type: Boolean, default: false },
      leaveRequests:    { type: Boolean, default: true },
      progressTracking: { type: Boolean, default: true },
    },
    status:         { type: String, enum: ['active', 'trial', 'expired', 'cancelled'], default: 'active' },
    startDate:      { type: Date, required: true },
    endDate:        { type: Date, required: true },
    durationMonths: { type: Number, required: true, min: 0 },
    paymentId:      { type: Schema.Types.ObjectId, ref: 'Payment' },
    assignedBy:     { type: Schema.Types.ObjectId, ref: 'User' },
    notes:          { type: String, maxlength: 500 },
  },
  { timestamps: true },
);

// Fast lookup: active subscription for a user (used by middleware + every feature check)
SubscriptionSchema.index({ userId: 1, status: 1 });
// History ordered by date
SubscriptionSchema.index({ userId: 1, startDate: -1 });
// Cron: find all active subs that have passed endDate
SubscriptionSchema.index({ status: 1, endDate: 1 });

export default model<ISubscription>('Subscription', SubscriptionSchema);
