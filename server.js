
const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// MongoDB Connection
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("FATAL ERROR: MONGODB_URI environment variable is not set.");
}

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let db;

async function connectDB() {
  try {
    await client.connect();
    db = client.db(); // Uses the database name from the connection string
    console.log("Successfully connected to MongoDB via Native Driver");
  } catch (err) {
    console.error("MongoDB Connection Failed:", err);
  }
}

connectDB();

// Routes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'active', timestamp: new Date() });
});

app.post('/api/sync', async (req, res) => {
  try {
    const { businessId, businessName, data } = req.body;
    
    if (!db) {
      return res.status(503).json({ error: "Database not ready" });
    }

    const collection = db.collection('sync_history');
    const logsCollection = db.collection('audit_logs');

    // 1. Log the Sync Attempt
    await logsCollection.insertOne({
      businessId,
      businessName,
      type: 'CLOUD_SYNC',
      timestamp: new Date(),
      itemCount: data.sales?.length || 0
    });

    // 2. Perform Upsert of the entire state for the business
    // This creates a snapshot of the current state in the cloud
    await collection.updateOne(
      { businessId: businessId },
      { 
        $set: { 
          businessName,
          lastSync: new Date(),
          products: data.products,
          sales: data.sales,
          auditLogs: data.auditLogs
        }
      },
      { upsert: true }
    );

    res.status(200).json({ success: true, message: "Cloud Node Synchronized" });
  } catch (err) {
    console.error("Sync Error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`BarSync Engine running on port ${PORT}`);
});
