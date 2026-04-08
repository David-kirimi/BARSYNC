import { Router } from 'express';
import { getFirestore } from './firebase.js';

const router = Router();

// Fetch all tabs for a business
router.get('/', async (req, res) => {
    const { businessId } = req.query;
    if (!businessId) return res.status(400).json({ error: "Missing businessId" });

    try {
        const db = getFirestore();
        const snapshot = await db.collection('tabs').where('businessId', '==', businessId).get();
        const tabs = snapshot.docs.map(doc => doc.data());
        res.json(tabs);
    } catch (err) {
        console.error("Tabs fetch Error:", err);
        res.status(500).json({ error: 'Fetch failed' });
    }
});

// Sync all tabs (full state replacement)
router.post('/sync', async (req, res) => {
    const { businessId, tabs } = req.body;
    if (!businessId || !tabs) return res.status(400).json({ error: "Missing data" });

    try {
        const db = getFirestore();
        
        // Find existing tabs to delete
        const snapshot = await db.collection('tabs').where('businessId', '==', businessId).get();
        const batch = db.batch();
        
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        // Add new tabs
        tabs.forEach(tab => {
            // Optional: attach businessId explicitly in case it's missing from the tab object
            const docRef = db.collection('tabs').doc(); 
            batch.set(docRef, { ...tab, businessId });
        });
        
        await batch.commit();

        res.json({ success: true });
    } catch (err) {
        console.error("Tabs sync Error:", err);
        res.status(500).json({ error: 'Sync failed' });
    }
});

export default router;
