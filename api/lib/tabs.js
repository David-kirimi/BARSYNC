import { Router } from 'express';
import { connectToMongo } from './db.js';

const router = Router();

// Fetch all tabs for a business
router.get('/', async (req, res) => {
    const { businessId } = req.query;
    if (!businessId) return res.status(400).json({ error: "Missing businessId" });

    const db = await connectToMongo();
    if (!db) return res.status(503).json({ error: "Database offline" });

    try {
        const tabs = await db.collection('tabs').find({ businessId }).toArray();
        res.json(tabs);
    } catch (err) {
        res.status(500).json({ error: 'Fetch failed' });
    }
});

// Sync all tabs (full state replacement)
router.post('/sync', async (req, res) => {
    const { businessId, tabs } = req.body;
    if (!businessId || !tabs) return res.status(400).json({ error: "Missing data" });

    const db = await connectToMongo();
    if (!db) return res.status(503).json({ error: "Database offline" });

    try {
        await db.collection('tabs').deleteMany({ businessId });
        if (tabs.length > 0) {
            await db.collection('tabs').insertMany(tabs);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Sync failed' });
    }
});

export default router;
