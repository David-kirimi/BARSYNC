
import express from 'express';
import { MongoClient, ServerApiVersion } from 'mongodb';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS setup - allowing all for initial deployment troubleshooting
// You can restrict this later to your specific frontend URL
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));

// MongoDB setup
const uri = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'barsync';

if (!uri) {
  console.error("❌ ERROR: MONGODB_URI is missing. Set it in your Render environment variables.");
  process.exit(1);
}

// Simplified client options - Atlas handles TLS/SSL automatically via the +srv URI
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let db;

async function startServer() {
  try {
    console.log("Attempting to connect to MongoDB Atlas...");
    await client.connect();

    // Test connection with a ping
    await client.db("admin").command({ ping: 1 });
    console.log("✅ SUCCESS: Connected to MongoDB Atlas");

    db = client.db(DB_NAME);

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 BarSync Backend Hub active on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ CONNECTION ERROR:", err.message);
    console.log("TIP: Ensure IP 0.0.0.0/0 is whitelisted in MongoDB Atlas 'Network Access'");
    // Retry logic
    setTimeout(startServer, 10000); 
  }
}

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'active', 
    dbConnected: !!db,
    timestamp: new Date().toISOString(),
    nodeVersion: process.version
  });
});

// POS sync endpoint
app.post('/api/sync', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database offline" });

  try {
    const { businessId, businessName, data } = req.body;
    if (!businessId || !data) return res.status(400).json({ error: 'Invalid payload' });

    const collection = db.collection('sync_history');
    const logsCollection = db.collection('audit_logs');

    // Log the sync attempt
    await logsCollection.insertOne({
      businessId,
      businessName,
      type: 'CLOUD_SYNC_NATIVE',
      timestamp: new Date(),
      itemCount: data?.sales?.length || 0
    });

    // Upsert state snapshot
    const result = await collection.updateOne(
      { businessId },
      { 
        $set: { 
          businessName,
          lastSync: new Date(),
          products: data.products || [],
          sales: data.sales || [],
          auditLogs: data.auditLogs || []
        }
      },
      { upsert: true }
    );

    res.status(200).json({ 
      success: true, 
      modified: result.modifiedCount, 
      upserted: result.upsertedCount 
    });
  } catch (err) {
    console.error("Sync Error:", err);
    res.status(500).json({ error: "Storage Error", details: err.message });
  }
});

startServer();
