import { Schema, model, Document, Types } from 'mongoose';

export interface IGymSettings extends Document {
  /** Singleton: only one doc exists. Use GymSettings.getOrCreate() */
  attendanceEnabled: boolean;
  /** Date attendance was last enabled — used as day-0 for absent calculation */
  attendanceEnabledAt?: Date;
  /** Hours before auto mark-out fires (1–6) */
  autoMarkOutHours: number;
  /** Minutes QR token stays valid */
  qrTokenExpiryMinutes: number;
  updatedBy?: Types.ObjectId;
  updatedAt: Date;
}

const GymSettingsSchema = new Schema<IGymSettings>(
  {
    attendanceEnabled:    { type: Boolean, default: false },
    attendanceEnabledAt:  { type: Date, default: null },
    autoMarkOutHours:     { type: Number, default: 3, min: 1, max: 6 },
    qrTokenExpiryMinutes: { type: Number, default: 15, min: 5, max: 60 },
    updatedBy:            { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

/** Always returns the single settings document, creating it with defaults if missing.
 *  Uses findOneAndUpdate+upsert to avoid race conditions on concurrent first requests.
 *  Also backfills attendanceEnabledAt for docs enabled before the field existed. */
GymSettingsSchema.statics.getOrCreate = async function () {
  let doc = await this.findOneAndUpdate(
    {},
    { $setOnInsert: { attendanceEnabled: false, autoMarkOutHours: 3, qrTokenExpiryMinutes: 15 } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  // Backfill: if attendance is already on but no enable-date recorded, use today as day-0
  if (doc.attendanceEnabled && !doc.attendanceEnabledAt) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    doc.attendanceEnabledAt = today;
    await doc.save();
  }
  return doc;
};

export default model<IGymSettings>('GymSettings', GymSettingsSchema);
