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
        res.json(state?.auditLogs || []);
    } catch (err) {
        console.error("AuditLogs fetch Error:", err.message);
        res.status(500).json({ error: `Fetch failed: ${err.message}` });
    }
});

router.post('/', async (req, res) => {
    const { businessId, log } = req.body;
    if (!businessId || !log) return res.status(400).json({ error: "Missing data" });

    try {
        const db = getFirestore();
        const syncSnap = await db.collection('sync_history').where('businessId', '==', businessId).get();
        
        if (syncSnap.empty) {
            await db.collection('sync_history').add({
                businessId,
                auditLogs: [log],
                lastSync: new Date().toISOString()
            });
        } else {
            await syncSnap.docs[0].ref.update({
                auditLogs: admin.firestore.FieldValue.arrayUnion(log),
                lastSync: new Date().toISOString()
            });
        }
        res.json({ success: true });
    } catch (err) {
        console.error("AuditLogs sync Error:", err.message);
        res.status(500).json({ error: `Log failed: ${err.message}` });
    }
});

export default router;
