import { Router } from 'express';
import { getFirestore } from './firebase.js';

const router = Router();

// Fetch shifts for a business
router.get('/', async (req, res) => {
    const { businessId, status } = req.query;
    if (!businessId) return res.status(400).json({ error: "Missing businessId" });

    try {
        const db = getFirestore();
        let query = db.collection('shifts').where('businessId', '==', businessId);
        
        if (status) {
            query = query.where('status', '==', status);
        }
        
        // Note: Firestore requires a composite index for where() and orderBy() on different fields.
        // For now, if we encounter index errors, we might need to sort in memory or create the index.
        const snapshot = await query.orderBy('startTime', 'desc').get();
        
        const shifts = snapshot.docs.map(doc => doc.data());
        res.json(shifts);
    } catch (err) {
        console.error("Shifts Fetch Error:", err.message);
        res.status(500).json({ error: 'Fetch failed' });
    }
});

// Single shift update/upsert
router.post('/', async (req, res) => {
    const { businessId, shift } = req.body;
    if (!businessId || !shift) return res.status(400).json({ error: "Missing data" });

    try {
        const db = getFirestore();
        const { _id, ...shiftData } = shift;

        const snapshot = await db.collection('shifts')
            .where('businessId', '==', businessId)
            .where('id', '==', shift.id)
            .get();

        if (snapshot.empty) {
            await db.collection('shifts').add({ businessId, ...shiftData });
        } else {
            await snapshot.docs[0].ref.update(shiftData);
        }
        res.json({ success: true });
    } catch (err) {
        console.error("Shift Sync Error:", err.message);
        res.status(500).json({ error: 'Sync failed' });
    }
});

// Update (close) a shift — persists totals, closingStock, status etc.
router.put('/', async (req, res) => {
    const { businessId, shift } = req.body;
    if (!businessId || !shift) return res.status(400).json({ error: "Missing data" });

    try {
        const db = getFirestore();
        const { _id, ...shiftData } = shift;

        const snapshot = await db.collection('shifts')
            .where('businessId', '==', businessId)
            .where('id', '==', shift.id)
            .get();

        if (snapshot.empty) {
            await db.collection('shifts').add({ businessId, ...shiftData });
        } else {
            await snapshot.docs[0].ref.update(shiftData);
        }
        res.json({ success: true });
    } catch (err) {
        console.error("Shift Update Error:", err.message);
        res.status(500).json({ error: 'Update failed' });
    }
});

export default router;
