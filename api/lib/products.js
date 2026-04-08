import { Router } from 'express';
import { getFirestore } from './firebase.js';

const router = Router();

router.get('/', async (req, res) => {
    const { businessId } = req.query;
    if (!businessId) return res.status(400).json({ error: "Missing businessId" });

    try {
        const db = getFirestore();
        const syncSnap = await db.collection('sync_history').where('businessId', '==', businessId).get();
        if (syncSnap.empty) return res.json([]);
        
        const state = syncSnap.docs[0].data();
        res.json(state?.products || []);
    } catch (err) {
        console.error("Products Fetch Error:", err.message);
        res.status(500).json({ error: `Fetch failed: ${err.message}` });
    }
});

router.post('/sync', async (req, res) => {
    const { businessId, products } = req.body;
    if (!businessId || !products) return res.status(400).json({ error: "Missing data" });

    try {
        const db = getFirestore();
        const syncSnap = await db.collection('sync_history').where('businessId', '==', businessId).get();
        
        const updateData = {
            products,
            lastSync: new Date().toISOString()
        };

        if (syncSnap.empty) {
            await db.collection('sync_history').add({
                businessId,
                ...updateData
            });
        } else {
            await syncSnap.docs[0].ref.update(updateData);
        }
        res.json({ success: true });
    } catch (err) {
        console.error("Products sync Error:", err.message);
        res.status(500).json({ error: `Update failed: ${err.message}` });
    }
});

export default router;
