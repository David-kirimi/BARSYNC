import { Router } from 'express';
import { connectToMongo } from './db.js';

const router = Router();

router.get('/', async (req, res) => {
    const { businessId } = req.query;
    if (!businessId) return res.status(400).json({ error: "Missing businessId" });

    try {
        const database = await connectToMongo();
        const syncColl = database.collection('sync_history');
        const state = await syncColl.findOne({ businessId });
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
        const database = await connectToMongo();
        const syncColl = database.collection('sync_history');
        // Append sale to sales array
        await syncColl.updateOne(
            { businessId },
            {
                $push: { sales: sale },
                $set: { lastSync: new Date() }
            },
            { upsert: true }
        );
        res.json({ success: true });
    } catch (err) {
        console.error("Sales sync Error:", err.message);
        res.status(500).json({ error: `Sale record failed: ${err.message}` });
    }
});

export default router;
