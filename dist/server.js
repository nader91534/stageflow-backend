// @ts-nocheck
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import User from "./models/User.js";
import Offer from "./models/Offer.js";
import Application from "./models/Application.js";
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors());
app.use(express.json({ limit: '50mb' }));
let mongoURI = process.env.MONGODB_URI;
// Global variable to cache the Mongoose connection in Serverless environments (like Vercel)
let isConnected = false;
export async function connectDB() {
    if (isConnected) {
        console.log("Using existing MongoDB connection");
        return;
    }
    if (!mongoURI) {
        console.log("No MONGODB_URI provided. Starting mongodb-memory-server for local testing...");
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create();
        mongoURI = mongod.getUri();
    }
    try {
        const db = await mongoose.connect(mongoURI);
        isConnected = !!db.connections[0].readyState;
        console.log(`Connected to MongoDB at ${mongoURI}`);
        // Seed default admin if not exists
        const adminExists = await User.findOne({ email: "admin@optistage.dz" });
        if (!adminExists) {
            await User.create({
                email: "admin@optistage.dz",
                password: "admin123",
                role: "admin",
                name: "Administrateur",
                status: "active"
            });
            console.log("Admin user seeded");
        }
        // Migrate any existing users with plain-text passwords to bcrypt hashes
        const allUsers = await User.find();
        for (const u of allUsers) {
            const isHashed = u.password && u.password.startsWith('$2') && u.password.length === 60;
            if (!isHashed) {
                u.markModified('password');
                await u.save();
                console.log(`Migrated password for user: ${u.email}`);
            }
        }
        // Ensure all existing offers are active for the demo
        await Offer.updateMany({ status: 'pending' }, { status: 'active' });
    }
    catch (err) {
        console.error("MongoDB connection error:", err);
    }
}
// Connect immediately, but also ensure connection is established in serverless handlers
connectDB();
// --- API Routes ---
// Auth
app.post("/api/auth/register", async (req, res) => {
    const { email, password, role, name } = req.body;
    try {
        const status = role === 'admin' ? 'active' : 'pending';
        const user = new User({ email, password, role, name, status });
        await user.save();
        console.log(`User created successfully: ${email} (${role})`);
        res.json(user);
    }
    catch (e) {
        console.error(`Registration error for ${email}:`, e.message);
        res.status(400).json({ error: e.message });
    }
});
app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (user && await user.comparePassword(password)) {
            res.json(user);
        }
        else {
            res.status(401).json({ error: "Invalid credentials" });
        }
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// Users (Admin)
app.get("/api/admin/users", async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.patch("/api/admin/users/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await User.findByIdAndUpdate(id, { status });
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// Offers
app.get("/api/offers", async (req, res) => {
    const { role, company_id } = req.query;
    try {
        let offers;
        if (role === 'company') {
            offers = await Offer.find({ company_id }).lean();
        }
        else if (role === 'admin') {
            offers = await Offer.find().populate('company_id', 'name').lean();
        }
        else {
            offers = await Offer.find({ status: 'active' }).populate('company_id', 'name').lean();
        }
        // Map populated company_id.name to company_name and id
        const mappedOffers = offers.map(offer => ({
            ...offer,
            id: offer._id,
            company_name: offer.company_id ? offer.company_id.name : 'Unknown'
        }));
        res.json(mappedOffers);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.post("/api/offers", async (req, res) => {
    const { company_id, title, description, requirements, location, duration } = req.body;
    try {
        const offer = new Offer({ company_id, title, description, requirements, location, duration, status: 'active' });
        await offer.save();
        res.json({ id: offer._id });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.patch("/api/offers/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await Offer.findByIdAndUpdate(id, { status });
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.delete("/api/offers/:id", async (req, res) => {
    const { id } = req.params;
    try {
        await Offer.findByIdAndDelete(id);
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// Applications
app.post("/api/applications", async (req, res) => {
    const { student_id, offer_id, cv_data, cover_letter } = req.body;
    try {
        // Prevent duplicate applications for the same offer
        const existing = await Application.findOne({ student_id, offer_id });
        if (existing) {
            return res.status(409).json({ error: "Vous avez déjà postulé à cette offre." });
        }
        const application = new Application({ student_id, offer_id, cv_data, cover_letter });
        await application.save();
        res.json({ id: application._id });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.get("/api/applications", async (req, res) => {
    const { student_id, company_id, role } = req.query;
    try {
        let apps;
        if (role === 'student') {
            apps = await Application.find({ student_id })
                .populate({
                path: 'offer_id',
                populate: { path: 'company_id', select: 'name' }
            }).lean();
        }
        else if (role === 'company') {
            // Find all offers for this company
            const offers = await Offer.find({ company_id }).select('_id title').lean();
            const offerIds = offers.map(o => o._id);
            apps = await Application.find({ offer_id: { $in: offerIds } })
                .populate('student_id', 'name email')
                .populate('offer_id', 'title').lean();
        }
        else {
            apps = await Application.find()
                .populate('student_id', 'name email')
                .populate({
                path: 'offer_id',
                populate: { path: 'company_id', select: 'name' }
            }).lean();
        }
        // Map populated data
        const mappedApps = apps.map(app => {
            const mapped = {
                ...app,
                id: app._id,
                student_name: app.student_id ? app.student_id.name : 'Unknown',
                student_email: app.student_id ? app.student_id.email : 'Unknown',
                offer_title: app.offer_id ? app.offer_id.title : 'Unknown',
            };
            if (role === 'student' || role === 'admin') {
                mapped.company_name = app.offer_id && app.offer_id.company_id
                    ? app.offer_id.company_id.name
                    : 'Unknown';
            }
            return mapped;
        });
        res.json(mappedApps);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.patch("/api/applications/:id", async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    try {
        await Application.findByIdAndUpdate(id, updateData);
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// Stats
app.get("/api/stats", async (req, res) => {
    try {
        const usersCount = await User.countDocuments();
        const offersCount = await Offer.countDocuments();
        const appsCount = await Application.countDocuments();
        const acceptedCount = await Application.countDocuments({ status: 'accepted' });
        res.json({
            users: usersCount,
            offers: offersCount,
            applications: appsCount,
            accepted: acceptedCount
        });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// Serve frontend context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// In production (dist/server.js), __dirname is backend/dist. We go up two levels to reach the project root, then to frontend/dist.
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDistPath));
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
});
// Conditionally start server if not running in Vercel (where it acts as a module)
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
export default app;
