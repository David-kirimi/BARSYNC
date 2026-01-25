import { Router } from 'express';
import { connectToMongo } from './db.js';

const router = Router();

// Helper to seed master admin if it doesn't exist
export async function seedDatabase() {
    const db = await connectToMongo();
    if (!db) return;
    try {
        const usersColl = db.collection('users');
        const masterAdmin = await usersColl.findOne({ name: 'SLIEM', role: 'SUPER_ADMIN' });
        if (!masterAdmin) {
            console.log("🌱 Provisioning Master Admin: SLIEM...");
            await usersColl.insertOne({
                id: 'super_sliem',
                name: 'SLIEM',
                role: 'SUPER_ADMIN',
                avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SLIEM',
                status: 'Active',
                password: '@SLIEM2040'
            });
        }
    } catch (err) {
        console.error("Seeding error:", err);
    }
}

router.post('/login', async (req, res) => {
    try {
        const database = await connectToMongo();

        let businessName = (req.body.businessName || "").trim();
        const username = (req.body.username || "").trim();
        const password = (req.body.password || "").trim();

        const usersColl = database.collection('users');
        const bizColl = database.collection('businesses');

        const isPlatformLogin = !businessName || businessName.toLowerCase() === 'platform';

        let user;
        let business = null;

        if (isPlatformLogin) {
            // Check for Super Admin first
            user = await usersColl.findOne({
                name: { $regex: new RegExp(`^${username}$`, 'i') },
                role: 'SUPER_ADMIN'
            });

            // If not super admin, check if user is unique platform-wide (Unified Login)
            if (!user) {
                const userCandidates = await usersColl.find({
                    name: { $regex: new RegExp(`^${username}$`, 'i') }
                }).toArray();

                if (userCandidates.length === 1) {
                    user = userCandidates[0];
                    if (user.businessId) {
                        business = await bizColl.findOne({ id: user.businessId });
                    }
                } else if (userCandidates.length > 1) {
                    return res.status(401).json({ error: 'Multiple accounts found. Please specify Workplace.' });
                }
            }
        } else {
            business = await bizColl.findOne({ name: { $regex: new RegExp(`^${businessName}$`, 'i') } });

            if (!business) {
                return res.status(404).json({ error: 'Business not found' });
            }

            user = await usersColl.findOne({
                businessId: business.id,
                name: { $regex: new RegExp(`^${username}$`, 'i') }
            });
        }

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (user.password !== password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Fetch snapshot state for online mode
        const syncColl = database.collection('sync_history');
        const snapshot = await syncColl.findOne({ businessId: (user.role === 'SUPER_ADMIN') ? 'admin_node' : (business?.id || user.businessId) });

        const { password: _, ...userSafe } = user;
        res.status(200).json({ user: userSafe, business, state: snapshot || null });
    } catch (err) {
        console.error("Login Error:", err.message);
        if (err.message === 'CONFIG_MISSING') return res.status(500).json({ error: "MONGODB_URI is not set in Vercel Environment Variables." });
        if (err.message === 'IP_NOT_WHITELISTED') return res.status(403).json({ error: "Access Denied: Vercel IP not whitelisted in MongoDB Atlas." });
        res.status(503).json({ error: `Database Connection Timeout: ${err.message}` });
    }
});

router.post('/register', async (req, res) => {
    try {
        const database = await connectToMongo();
        if (!database) return res.status(503).json({ error: "Database offline" });

        const { businessName, ownerName, password, plan } = req.body;

        if (!businessName || !ownerName || !password) {
            return res.status(400).json({ error: "Missing required details" });
        }

        const bizColl = database.collection('businesses');
        const usersColl = database.collection('users');

        const existing = await bizColl.findOne({ name: { $regex: new RegExp(`^${businessName.trim()}$`, 'i') } });
        if (existing) {
            return res.status(409).json({ error: "Business name already registered" });
        }

        const businessId = `bus_${Math.random().toString(36).substr(2, 5)}`;
        const newBusiness = {
            id: businessId,
            name: businessName.trim(),
            ownerName: ownerName.trim(),
            subscriptionStatus: 'Trial',
            subscriptionPlan: plan || 'Basic',
            paymentStatus: 'Pending',
            createdAt: new Date().toISOString(),
        };

        const ownerId = `user_${Math.random().toString(36).substr(2, 5)}`;
        const newOwner = {
            id: ownerId,
            name: ownerName.trim(),
            role: 'OWNER',
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${ownerName.trim()}`,
            businessId,
            status: 'Active',
            password: password.trim()
        };

        await bizColl.insertOne(newBusiness);
        await usersColl.insertOne(newOwner);

        const { password: _, ...userSafe } = newOwner;
        res.status(201).json({ user: userSafe, business: newBusiness });
    } catch (err) {
        console.error("Registration Error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Admin management routes
router.get('/admin/businesses', async (req, res) => {
    const database = await connectToMongo();
    if (!database) return res.status(503).json({ error: "Database offline" });
    try {
        const biz = await database.collection('businesses').find().toArray();
        res.json(biz);
    } catch (err) {
        res.status(500).json({ error: 'Fetch failed' });
    }
});

router.get('/admin/users', async (req, res) => {
    const database = await connectToMongo();
    if (!database) return res.status(503).json({ error: "Database offline" });
    try {
        const users = await database.collection('users').find().toArray();
        const safeUsers = users.map(u => {
            const { password, ...safe } = u;
            return safe;
        });
        res.json(safeUsers);
    } catch (err) {
        res.status(500).json({ error: 'Fetch failed' });
    }
});

router.post('/admin/businesses', async (req, res) => {
    const database = await connectToMongo();
    if (!database) return res.status(503).json({ error: "Database offline" });
    try {
        const { business, owner } = req.body;
        await database.collection('businesses').insertOne(business);
        await database.collection('users').insertOne(owner);
        res.status(201).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Provisioning failed' });
    }
});

router.put('/admin/users/:id', async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    const database = await connectToMongo();
    if (!database) return res.status(503).json({ error: "Database offline" });
    try {
        await database.collection('users').updateOne({ id }, { $set: updateData });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Update failed' });
    }
});

router.delete('/admin/users/:id', async (req, res) => {
    const { id } = req.params;
    const database = await connectToMongo();
    if (!database) return res.status(503).json({ error: "Database offline" });
    try {
        await database.collection('users').deleteOne({ id });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Delete failed' });
    }
});

export default router;
