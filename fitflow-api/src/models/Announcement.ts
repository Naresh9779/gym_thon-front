import { Schema, model, Document, Types } from 'mongoose';

export interface IAnnouncement extends Document {
  title: string;
  message: string;
  type: 'info' | 'warning' | 'promo';
  startsAt: Date;
  expiresAt: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    title:     { type: String, required: true, trim: true },
    message:   { type: String, required: true, trim: true },
    type:      { type: String, enum: ['info', 'warning', 'promo'], default: 'info', index: true },
    startsAt:  { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

AnnouncementSchema.index({ startsAt: 1, expiresAt: 1 });

export default model<IAnnouncement>('Announcement', AnnouncementSchema);
