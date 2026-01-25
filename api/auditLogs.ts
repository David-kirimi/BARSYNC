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
        res.json(state?.auditLogs || []);
    } catch (err) {
        res.status(500).json({ error: "Fetch failed" });
    }
});

router.post('/', async (req, res) => {
    const { businessId, log } = req.body;
    if (!businessId || !log) return res.status(400).json({ error: "Missing data" });

    const database = await connectToMongo();
    if (!database) return res.status(503).json({ error: "Database offline" });

    try {
        const syncColl = database.collection('sync_history');
        await syncColl.updateOne(
            { businessId },
            {
                $push: { auditLogs: log as never },
                $set: { lastSync: new Date() }
            },
            { upsert: true }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Log failed" });
    }
});

export default router;
