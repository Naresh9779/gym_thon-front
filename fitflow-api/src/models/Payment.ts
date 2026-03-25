import { Schema, model, Document, Types } from 'mongoose';

export interface IPayment extends Document {
  userId: Types.ObjectId;
  planId?: Types.ObjectId;
  /** Snapshot so history stays accurate if plan is edited/deleted later */
  planSnapshot?: { name?: string; price?: number; durationDays?: number };
  amount: number;
  method: 'cash' | 'upi' | 'card' | 'other';
  paymentStatus: 'received' | 'pending' | 'cancelled';
  paidAt: Date;
  note?: string;
  /** Admin who recorded this payment */
  recordedBy?: Types.ObjectId;
  /** The Subscription period this payment activated */
  subscriptionId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    userId:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
    planId:  { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
    planSnapshot: {
      name:         String,
      price:        Number,
      durationDays: Number,
    },
    amount:        { type: Number, required: true, min: 0 },
    method:        { type: String, enum: ['cash', 'upi', 'card', 'other'], default: 'cash' },
    paymentStatus: { type: String, enum: ['received', 'pending', 'cancelled'], default: 'received' },
    paidAt:        { type: Date, default: Date.now },
    note:           { type: String, maxlength: 500 },
    recordedBy:     { type: Schema.Types.ObjectId, ref: 'User' },
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription' },
  },
  { timestamps: true },
);

// Speeds up "user's payment history" and admin payment listings
PaymentSchema.index({ userId: 1, paidAt: -1 });
PaymentSchema.index({ paymentStatus: 1 });

export default model<IPayment>('Payment', PaymentSchema);
