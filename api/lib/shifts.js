import { Router } from 'express';
import { connectToMongo } from './db.js';

const router = Router();

// Fetch shifts for a business
router.get('/', async (req, res) => {
    const { businessId, status } = req.query;
    if (!businessId) return res.status(400).json({ error: "Missing businessId" });

    const db = await connectToMongo();
    if (!db) return res.status(503).json({ error: "Database offline" });

    try {
        const query = { businessId };
        if (status) query.status = status;
        
        const shifts = await db.collection('shifts')
            .find(query)
            .sort({ startTime: -1 })
            .limit(100)
            .toArray();
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

    const db = await connectToMongo();
    if (!db) return res.status(503).json({ error: "Database offline" });

    try {
        await db.collection('shifts').updateOne(
            { businessId, id: shift.id },
            { $set: shift },
            { upsert: true }
        );
        res.json({ success: true });
    } catch (err) {
        console.error("Shift Sync Error:", err.message);
        res.status(500).json({ error: 'Sync failed' });
    }
});

export default router;
