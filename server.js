import express from 'express';
import { MongoClient, ServerApiVersion } from 'mongodb';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for your frontend
app.use(cors({
  origin: [
    'http://localhost:5173',       // dev frontend
    'https://your-frontend.com'    // production frontend
  ],
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

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
});

let db;

async function startServer() {
  try {
    console.log("Connecting to MongoDB...");
    await client.connect();

    // Test the connection
    await client.db("admin").command({ ping: 1 });
    console.log("✅ Connected to MongoDB Atlas");

    db = client.db(DB_NAME); // use your explicit DB name

    app.listen(PORT, () => {
      console.log(`🚀 BarSync Backend Hub active on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ FAILED to connect to MongoDB:", err);
    setTimeout(startServer, 5000); // retry after 5s
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'active', 
    dbConnected: !!db,
    timestamp: new Date().toISOString() 
  });
});

// Sync endpoint
app.post('/api/sync', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database offline" });

  try {
    const { businessId, businessName, data } = req.body;
    if (!businessId || !data) return res.status(400).json({ error: 'Invalid payload' });

    const collection = db.collection('sync_history');
    const logsCollection = db.collection('audit_logs');

    // 1. Log the sync attempt
    await logsCollection.insertOne({
      businessId,
      businessName,
      type: 'CLOUD_SYNC_NATIVE',
      timestamp: new Date(),
      itemCount: data?.sales?.length || 0
    });

    // 2. State Snapshot (Upsert)
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
