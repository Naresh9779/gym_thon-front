import { Schema, model, Document, Types } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  role: 'user' | 'admin';
  profile?: {
    age?: number;
    weight?: number;
    height?: number;
    gender?: string;
    goals?: string[];
    activityLevel?: string;
    experienceLevel?: string;
    preferences?: string[];
    restrictions?: string[];
    timezone?: string;
    dietPreferences?: {
      isVegetarian?: boolean;
      weeklyBudget?: number;
      dietType?: 'balanced' | 'high_protein' | 'low_carb' | 'mediterranean';
    };
  };
  mobile?: string;
  /** Points to the most recent Subscription doc for this user (active OR expired) */
  activeSubscriptionId?: Types.ObjectId;
  gymStatus: 'member' | 'left';
  leftAt?: Date;
  leftReason?: 'moved' | 'health' | 'cost' | 'other' | 'auto';
  assignedTrainerId?: Types.ObjectId;
  trainerNotes?: Array<{ _id: Types.ObjectId; text: string; createdAt: Date }>;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name:         { type: String, required: true, trim: true },
    role:         { type: String, enum: ['user', 'admin'], default: 'user' },
    mobile:       { type: String, trim: true },

    profile: {
      age:             Number,
      weight:          Number,
      height:          Number,
      gender:          String,
      goals:           [String],
      activityLevel:   String,
      experienceLevel: String,
      preferences:     [String],
      restrictions:    [String],
      timezone:        { type: String, default: 'UTC' },
      dietPreferences: {
        isVegetarian: { type: Boolean, default: false },
        weeklyBudget: Number,
        dietType:     { type: String, enum: ['balanced', 'high_protein', 'low_carb', 'mediterranean'] },
      },
    },

    /** Ref to the current/most-recent Subscription — populate to get plan details */
    activeSubscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription', default: null },

    gymStatus:         { type: String, enum: ['member', 'left'], default: 'member' },
    leftAt:            Date,
    leftReason:        { type: String, enum: ['moved', 'health', 'cost', 'other', 'auto'] },
    assignedTrainerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },

    trainerNotes: [
      {
        _id:       { type: Schema.Types.ObjectId, auto: true },
        text:      { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

// ── Indexes ──────────────────────────────────────────────────────────────────

UserSchema.index({ activeSubscriptionId: 1 });

// ── Pre-save ─────────────────────────────────────────────────────────────────

UserSchema.pre('save', function (next) {
  // Cap trainerNotes at 50 most-recent entries
  if (this.trainerNotes && this.trainerNotes.length > 50) {
    this.trainerNotes = this.trainerNotes.slice(-50);
  }
  next();
});

export default model<IUser>('User', UserSchema);
