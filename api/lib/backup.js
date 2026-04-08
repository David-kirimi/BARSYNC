import express from 'express';
import { getFirestore } from './firebase.js';

const router = express.Router();

/**
 * Helper to fetch all documents from a collection for a given businessId
 */
const fetchCollectionByBusinessId = async (db, collectionName, businessId) => {
    const snapshot = await db.collection(collectionName).where('businessId', '==', businessId).get();
    const data = [];
    snapshot.forEach(doc => {
        data.push(doc.data());
    });
    return data;
};

/**
 * Helper to bulk upload data to a collection
 */
const restoreCollection = async (db, collectionName, businessId, items) => {
    if (!items || items.length === 0) return;
    
    // First, clear existing data for this businessId to avoid duplicates during restore
    // Note: In a production environment with massive data, this should be done in batches
    const existingSnapshot = await db.collection(collectionName).where('businessId', '==', businessId).get();
    const batch = db.batch();
    
    existingSnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    // Now insert new records in batches of 500 (Firestore limit)
    let currentBatch = db.batch();
    let count = 0;
    
    for (const item of items) {
        // Assume items have 'id' or we generate one
        const docRef = item.id ? db.collection(collectionName).doc(item.id.toString()) : db.collection(collectionName).doc();
        currentBatch.set(docRef, item);
        count++;

        if (count === 500) {
            await currentBatch.commit();
            currentBatch = db.batch();
            count = 0;
        }
    }
    
    if (count > 0) {
        await currentBatch.commit();
    }
};

/**
 * GET /api/backup/:businessId
 * Download full snapshot
 */
router.get('/:businessId', async (req, res) => {
    try {
        const { businessId } = req.params;
        const db = getFirestore();
        
        const timestamp = new Date().toISOString();
        
        const [users, products, sales, tabs, shifts, auditLogs] = await Promise.all([
            fetchCollectionByBusinessId(db, 'users', businessId),
            fetchCollectionByBusinessId(db, 'products', businessId),
            fetchCollectionByBusinessId(db, 'sales', businessId),
            fetchCollectionByBusinessId(db, 'tabs', businessId),
            fetchCollectionByBusinessId(db, 'shifts', businessId),
            fetchCollectionByBusinessId(db, 'auditLogs', businessId),
        ]);

        const backupData = {
            metadata: {
                timestamp,
                businessId,
                version: "1.0.0"
            },
            data: {
                users,
                products,
                sales,
                tabs,
                shifts,
                auditLogs
            }
        };

        res.status(200).json(backupData);
    } catch (err) {
        console.error("❌ Backup Error:", err);
        res.status(500).json({ error: "Failed to generate backup", details: err.message });
    }
});

/**
 * POST /api/backup/restore/:businessId
 * Upload full snapshot
 */
router.post('/restore/:businessId', async (req, res) => {
    try {
        const { businessId } = req.params;
        const { data } = req.body; // Full backup payload { metadata: {...}, data: {...} }
        const db = getFirestore();

        if (!data || !data.data) {
            return res.status(400).json({ error: "Invalid backup format." });
        }

        const collections = data.data;

        await Promise.all([
            restoreCollection(db, 'users', businessId, collections.users || []),
            restoreCollection(db, 'products', businessId, collections.products || []),
            restoreCollection(db, 'sales', businessId, collections.sales || []),
            restoreCollection(db, 'tabs', businessId, collections.tabs || []),
            restoreCollection(db, 'shifts', businessId, collections.shifts || []),
            restoreCollection(db, 'auditLogs', businessId, collections.auditLogs || [])
        ]);

        res.status(200).json({ message: "Database restored successfully." });
    } catch (err) {
        console.error("❌ Restore Error:", err);
        res.status(500).json({ error: "Failed to restore backup", details: err.message });
    }
});

export default router;
