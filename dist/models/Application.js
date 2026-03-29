// @ts-nocheck
import mongoose, { Schema } from 'mongoose';
const ApplicationSchema = new Schema({
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
export default mongoose.models.Application || mongoose.model('Application', ApplicationSchema);
