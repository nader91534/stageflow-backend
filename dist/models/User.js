// @ts-nocheck
import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
const UserSchema = new Schema({
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
            delete ret.password; // Don't expose password hashes in JSON output
        }
    }
});
// Pre-save middleware to hash password if modified
UserSchema.pre('save', async function (next) {
    const user = this;
    if (!user.isModified('password')) {
        return next();
    }
    try {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(user.password, salt);
        user.password = hash;
        next();
    }
    catch (err) {
        next(err);
    }
});
// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password)
        return false;
    return bcrypt.compare(candidatePassword, this.password);
};
export default mongoose.models.User || mongoose.model('User', UserSchema);
