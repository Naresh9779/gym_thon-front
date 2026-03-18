import { Schema, model, Document, Types } from 'mongoose';

export interface IGymHoliday extends Document {
  date: string;
  reason: string;
  createdBy: Types.ObjectId;
}

const GymHolidaySchema = new Schema<IGymHoliday>(
  {
    date:      { type: String, required: true, unique: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    reason:    { type: String, required: true, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

GymHolidaySchema.index({ date: 1 });
export default model<IGymHoliday>('GymHoliday', GymHolidaySchema);
