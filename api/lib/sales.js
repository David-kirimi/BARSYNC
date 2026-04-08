import { Router } from 'express';
import admin, { getFirestore } from './firebase.js';

const router = Router();

router.get('/', async (req, res) => {
    const { businessId } = req.query;
    if (!businessId) return res.status(400).json({ error: "Missing businessId" });

    try {
        const db = getFirestore();
        const syncSnap = await db.collection('sync_history').where('businessId', '==', businessId).get();
        if (syncSnap.empty) return res.json([]);
        
        const state = syncSnap.docs[0].data();
        res.json(state?.sales || []);
    } catch (err) {
        console.error("Sales fetch Error:", err.message);
        res.status(500).json({ error: `Fetch failed: ${err.message}` });
    }
});

router.post('/', async (req, res) => {
    const { businessId, sale } = req.body;
    if (!businessId || !sale) return res.status(400).json({ error: "Missing data" });

    try {
        const db = getFirestore();
        const syncSnap = await db.collection('sync_history').where('businessId', '==', businessId).get();
        
        if (syncSnap.empty) {
            await db.collection('sync_history').add({
                businessId,
                sales: [sale],
                lastSync: new Date().toISOString()
            });
        } else {
            await syncSnap.docs[0].ref.update({
                sales: admin.firestore.FieldValue.arrayUnion(sale),
                lastSync: new Date().toISOString()
            });
        }
        res.json({ success: true });
    } catch (err) {
        console.error("Sales sync Error:", err.message);
        res.status(500).json({ error: `Sale record failed: ${err.message}` });
    }
});

router.post('/sync', async (req, res) => {
    const { businessId, sales } = req.body;
    if (!businessId || !sales) return res.status(400).json({ error: "Missing data" });

    try {
        const db = getFirestore();
        const syncSnap = await db.collection('sync_history').where('businessId', '==', businessId).get();
        
        const updateData = {
            sales,
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
        console.error("Sales sync Error:", err.message);
        res.status(500).json({ error: `Update failed: ${err.message}` });
    }
});

export default router;
