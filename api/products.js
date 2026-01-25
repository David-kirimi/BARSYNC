import { Router } from 'express';
import { connectToMongo } from './db.js';

const router = Router();

router.get('/', async (req, res) => {
    const { businessId } = req.query;
    if (!businessId) return res.status(400).json({ error: "Missing businessId" });

    const database = await connectToMongo();
    if (!database) return res.status(503).json({ error: "Database offline" });

    try {
        const syncColl = database.collection('sync_history');
        const state = await syncColl.findOne({ businessId });
        res.json(state?.products || []);
    } catch (err) {
        res.status(500).json({ error: "Fetch failed" });
    }
});

router.post('/sync', async (req, res) => {
    const { businessId, products } = req.body;
    if (!businessId || !products) return res.status(400).json({ error: "Missing data" });

    const database = await connectToMongo();
    if (!database) return res.status(503).json({ error: "Database offline" });

    try {
        const syncColl = database.collection('sync_history');
        await syncColl.updateOne(
            { businessId },
            { $set: { products, lastSync: new Date() } },
            { upsert: true }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Update failed" });
    }
});

export default router;
