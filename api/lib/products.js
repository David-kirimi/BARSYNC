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
        const database = await connectToMongo();
        const syncColl = database.collection('sync_history');
        await syncColl.updateOne(
            { businessId },
            { $set: { products, lastSync: new Date() } },
            { upsert: true }
        );
        res.json({ success: true });
    } catch (err) {
        console.error("Products sync Error:", err.message);
        res.status(500).json({ error: `Update failed: ${err.message}` });
    }
});

export default router;
