import { Schema, model, Document } from 'mongoose';

export interface ISubscriptionFeatures {
  aiWorkoutPlan: boolean;
  aiDietPlan: boolean;
  leaveRequests: boolean;
  progressTracking: boolean;
}

export interface ISubscriptionPlan extends Document {
  name: string;
  price: number;
  durationDays: number;
  features: ISubscriptionFeatures;
  /** 'active' = paid plan, 'trial' = free/trial plan */
  planType: 'active' | 'trial';
  color: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionPlanSchema = new Schema<ISubscriptionPlan>(
  {
    name:         { type: String, required: true, trim: true },
    price:        { type: Number, required: true, min: 0 },
    durationDays: { type: Number, required: true, min: 1 },
    features: {
      aiWorkoutPlan:    { type: Boolean, default: false },
      aiDietPlan:       { type: Boolean, default: false },
      leaveRequests:    { type: Boolean, default: true },
      progressTracking: { type: Boolean, default: true },
    },
    planType: { type: String, enum: ['active', 'trial'], default: 'active' },
    color:    { type: String, default: '#6366f1' },
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  },
);

// Virtual: approximate duration in months for display purposes
SubscriptionPlanSchema.virtual('durationMonths').get(function (this: ISubscriptionPlan) {
  return Math.round(this.durationDays / 30);
});

export default model<ISubscriptionPlan>('SubscriptionPlan', SubscriptionPlanSchema);
