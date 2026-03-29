// @ts-nocheck
import mongoose, { Schema, Document } from 'mongoose';

export interface IApplication extends Document {
  student_id: mongoose.Types.ObjectId;
  offer_id: mongoose.Types.ObjectId;
  cv_data?: string;
  cover_letter?: string;
  status: string;
  feedback?: string;
  rating?: number;
  report_data?: string;
  acceptance_document?: string;
  created_at: Date;
}

const ApplicationSchema = new Schema<IApplication>({
  student_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  offer_id: { type: Schema.Types.ObjectId, ref: 'Offer', required: true },
  cv_data: { type: String },
  cover_letter: { type: String },
  status: { type: String, default: 'pending', enum: ['pending', 'accepted', 'rejected'] },
  feedback: { type: String },
  rating: { type: Number },
  report_data: { type: String },
  acceptance_document: { type: String },
  created_at: { type: Date, default: Date.now }
}, {
  toJSON: {
    transform: function (doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
    }
  }
});

export default mongoose.models.Application || mongoose.model<IApplication>('Application', ApplicationSchema);
