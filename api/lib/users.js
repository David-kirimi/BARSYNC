import { Router } from 'express';
import { getFirestore } from './firebase.js';

const router = Router();

// Helper to seed master admin if it doesn't exist
export async function seedDatabase() {
    const db = getFirestore();
    try {
        const usersColl = db.collection('users');
        const snapshot = await usersColl.where('name', '==', 'SLIEM').where('role', '==', 'SUPER_ADMIN').get();
        
        if (snapshot.empty) {
            console.log("🌱 Provisioning Master Admin: SLIEM...");
            await usersColl.add({
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
        const db = getFirestore();

        let businessName = (req.body.businessName || "").trim();
        const username = (req.body.username || "").trim();
        const password = (req.body.password || "").trim();

        const isPlatformLogin = !businessName || businessName.toLowerCase() === 'platform';

        let user = null;
        let business = null;

        if (isPlatformLogin) {
            // Check for Super Admin
            const superAdminSnapshot = await db.collection('users')
                .where('name', '==', username)
                .where('role', '==', 'SUPER_ADMIN')
                .get();
            
            if (!superAdminSnapshot.empty) {
                user = superAdminSnapshot.docs[0].data();
            } else {
                // Unified Login (unique platform-wide)
                const candidateSnapshot = await db.collection('users')
                    .where('name', '==', username)
                    .get();
                
                if (candidateSnapshot.size === 1) {
                    user = candidateSnapshot.docs[0].data();
                    if (user.businessId) {
                        const bizSnap = await db.collection('businesses').where('id', '==', user.businessId).get();
                        if (!bizSnap.empty) business = bizSnap.docs[0].data();
                    }
                } else if (candidateSnapshot.size > 1) {
                    return res.status(401).json({ error: 'Multiple accounts found. Please specify Workplace.' });
                }
            }
        } else {
            const bizSnap = await db.collection('businesses').where('name', '==', businessName).get();
            if (bizSnap.empty) {
                return res.status(404).json({ error: 'Business not found' });
            }
            business = bizSnap.docs[0].data();

            const userSnap = await db.collection('users')
                .where('businessId', '==', business.id)
                .where('name', '==', username)
                .get();
            
            if (!userSnap.empty) user = userSnap.docs[0].data();
        }

        if (!user || user.password !== password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Fetch snapshot state
        const syncSnap = await db.collection('sync_history')
            .where('businessId', '==', (user.role === 'SUPER_ADMIN') ? 'admin_node' : (business?.id || user.businessId))
            .get();
        
        const snapshot = syncSnap.empty ? null : syncSnap.docs[0].data();

        const { password: _, ...userSafe } = user;
        res.status(200).json({ user: userSafe, business, state: snapshot || null });
    } catch (err) {
        console.error("Login Error:", err.message);
        res.status(503).json({ error: `Database Connection Error: ${err.message}` });
    }
});

router.post('/register', async (req, res) => {
    try {
        const db = getFirestore();
        const { businessName, ownerName, password, plan } = req.body;

        if (!businessName || !ownerName || !password) {
            return res.status(400).json({ error: "Missing required details" });
        }

        const existingBiz = await db.collection('businesses').where('name', '==', businessName.trim()).get();
        if (!existingBiz.empty) {
            return res.status(409).json({ error: "Business name already registered" });
        }

        const businessId = `bus_${Math.random().toString(36).substr(2, 5)}`;
        const newBusiness = {
            id: businessId,
            name: businessName.trim(),
            ownerName: ownerName.trim(),
            subscriptionStatus: 'Pending Approval',
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

        await db.collection('businesses').add(newBusiness);
        await db.collection('users').add(newOwner);

        const { password: _, ...userSafe } = newOwner;
        res.status(201).json({ user: userSafe, business: newBusiness });
    } catch (err) {
        console.error("Registration Error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get('/', async (req, res) => {
    const { businessId } = req.query;
    if (!businessId) return res.status(400).json({ error: "Missing businessId" });
    try {
        const db = getFirestore();
        const snapshot = await db.collection('users').where('businessId', '==', businessId).get();
        const users = snapshot.docs.map(doc => {
            const { password, ...safe } = doc.data();
            return safe;
        });
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Fetch failed' });
    }
});

router.get('/admin/businesses', async (req, res) => {
    try {
        const db = getFirestore();
        const snapshot = await db.collection('businesses').get();
        res.json(snapshot.docs.map(doc => doc.data()));
    } catch (err) {
        res.status(500).json({ error: 'Fetch failed' });
    }
});

router.get('/admin/users', async (req, res) => {
    try {
        const db = getFirestore();
        const snapshot = await db.collection('users').get();
        res.json(snapshot.docs.map(doc => {
            const { password, ...safe } = doc.data();
            return safe;
        }));
    } catch (err) {
        res.status(500).json({ error: 'Fetch failed' });
    }
});

router.post('/admin/businesses', async (req, res) => {
    try {
        const db = getFirestore();
        const { business, owner } = req.body;
        await db.collection('businesses').add(business);
        await db.collection('users').add(owner);
        res.status(201).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Provisioning failed' });
    }
});

router.put('/admin/businesses/:id', async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    try {
        const db = getFirestore();
        const snapshot = await db.collection('businesses').where('id', '==', id).get();
        if (snapshot.empty) return res.status(404).json({ error: "Not found" });
        
        await snapshot.docs[0].ref.update(updateData);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Update failed' });
    }
});

router.delete('/admin/businesses/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const db = getFirestore();
        const bizSnap = await db.collection('businesses').where('id', '==', id).get();
        if (!bizSnap.empty) await bizSnap.docs[0].ref.delete();
        
        const userSnap = await db.collection('users').where('businessId', '==', id).get();
        const batch = db.batch();
        userSnap.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Delete failed' });
    }
});

router.post('/admin/users', async (req, res) => {
    try {
        const db = getFirestore();
        await db.collection('users').add(req.body);
        res.status(201).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'User creation failed' });
    }
});

router.put('/admin/users/:id', async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    try {
        const db = getFirestore();
        const snapshot = await db.collection('users').where('id', '==', id).get();
        if (snapshot.empty) return res.status(404).json({ error: "Not found" });
        await snapshot.docs[0].ref.update(updateData);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Update failed' });
    }
});

router.delete('/admin/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const db = getFirestore();
        const snapshot = await db.collection('users').where('id', '==', id).get();
        if (!snapshot.empty) await snapshot.docs[0].ref.delete();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Delete failed' });
    }
});

export default router;
