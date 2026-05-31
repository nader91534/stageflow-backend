// @ts-nocheck
import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password?: string;
  role: string;
  name: string;
  status: string;
  created_at: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ['student', 'company', 'admin'] },
  name: { type: String, required: true },
  status: { type: String, default: 'pending', enum: ['pending', 'active', 'rejected'] },
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

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
