// @ts-nocheck
import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcrypt';
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
            delete ret.password;
        }
    },
    toObject: {
        transform: function (doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            delete ret.password;
        }
    }
});
// Hash password before saving if it is new or modified
UserSchema.pre('save', async function (next) {
    const user = this;
    if (!user.isModified('password') || !user.password)
        return next();
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
// Compare entered password with stored hash (with plain-text fallback for backward compatibility)
UserSchema.methods.comparePassword = async function (candidatePassword) {
    const storedHash = this.password;
    if (!storedHash)
        return false;
    if (!storedHash.startsWith('$2a$') && !storedHash.startsWith('$2b$') && !storedHash.startsWith('$2y$')) {
        return candidatePassword === storedHash;
    }
    return bcrypt.compare(candidatePassword, storedHash);
};
if (mongoose.models && mongoose.models.User) {
    delete mongoose.models.User;
}
export default mongoose.model('User', UserSchema);
