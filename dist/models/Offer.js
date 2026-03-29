// @ts-nocheck
import mongoose, { Schema } from 'mongoose';
const OfferSchema = new Schema({
    company_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    requirements: { type: String },
    location: { type: String },
    duration: { type: String },
    status: { type: String, default: 'active', enum: ['pending', 'active', 'closed'] },
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
export default mongoose.models.Offer || mongoose.model('Offer', OfferSchema);
