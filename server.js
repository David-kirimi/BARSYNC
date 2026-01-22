
import express from 'express';
import { MongoClient, ServerApiVersion } from 'mongodb';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));

const uri = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'barsync';

let db = null;
let client = null;

if (uri) {
  client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
    // Prevent long hangs if DB is unreachable
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  });
}

async function seedDatabase() {
  if (!db) return;
  try {
    const usersColl = db.collection('users');
    const masterAdmin = await usersColl.findOne({ name: 'SLIEM', role: 'SUPER_ADMIN' });
    if (!masterAdmin) {
      console.log("🌱 Provisioning Master Admin: SLIEM...");
      await usersColl.insertOne({ 
        id: 'super_sliem', 
        name: 'SLIEM', 
        role: 'SUPER_ADMIN', 
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SLIEM', 
        status: 'Active', 
        password: '@SLIEM2040' 
      });
    }
  } catch (err) {
    console.error("Seeding error:", err);
  }
}

// Connect to MongoDB once
async function connectToMongo() {
  if (db) return db;
  if (!client) return null;
  try {
    // Try to connect with a 5s timeout
    await client.connect();
    db = client.db(DB_NAME);
    console.log("✅ Connected to MongoDB Atlas");
    await seedDatabase();
    return db;
  } catch (err) {
    console.error("❌ MongoDB Connection failed:", err.message);
    return null;
  }
}

// --- API ROUTES FIRST ---

app.get('/health', async (req, res) => {
  const isConnected = await connectToMongo();
  res.status(200).json({ 
    status: 'active', 
    db: !!isConnected, 
    timestamp: new Date().toISOString() 
  });
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const database = await connectToMongo();
    if (!database) {
      return res.status(503).json({ error: "Database Connection Timeout. Check MongoDB Atlas IP whitelisting." });
    }

    const { businessName, username, password } = req.body;
    const usersColl = database.collection('users');
    const bizColl = database.collection('businesses');

    const isPlatformLogin = !businessName || businessName.toLowerCase() === 'platform';
    
    let user;
    let business = null;

    if (isPlatformLogin) {
      user = await usersColl.findOne({ 
        name: { $regex: new RegExp(`^${username}$`, 'i') }, 
        role: 'SUPER_ADMIN' 
      });
    } else {
      business = await bizColl.findOne({ name: { $regex: new RegExp(`^${businessName}$`, 'i') } });
      if (!business) return res.status(404).json({ error: 'Business not found' });
      
      user = await usersColl.findOne({ 
        businessId: business.id, 
        name: { $regex: new RegExp(`^${username}$`, 'i') } 
      });
    }

    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const syncColl = database.collection('sync_history');
    const snapshot = await syncColl.findOne({ businessId: isPlatformLogin ? 'admin_node' : business.id });

    const { password: _, ...userSafe } = user;
    res.status(200).json({ user: userSafe, business, state: snapshot || null });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
});

app.post('/api/sync', async (req, res) => {
  const database = await connectToMongo();
  if (!database) return res.status(503).json({ error: "Database offline" });

  try {
    const { businessId, businessName, data } = req.body;
    const collection = database.collection('sync_history');
    
    await collection.updateOne(
      { businessId },
      { 
        $set: { 
          businessName,
          lastSync: new Date(),
          products: data.products || [],
          sales: data.sales || [],
          auditLogs: data.auditLogs || [],
          users: data.users || []
        }
      },
      { upsert: true }
    );
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Sync error" });
  }
});

app.get('/api/admin/businesses', async (req, res) => {
  const database = await connectToMongo();
  if (!database) return res.status(503).json({ error: "Database offline" });
  try {
    const biz = await database.collection('businesses').find().toArray();
    res.json(biz);
  } catch (err) {
    res.status(500).json({ error: 'Fetch failed' });
  }
});

app.post('/api/admin/businesses', async (req, res) => {
  const database = await connectToMongo();
  if (!database) return res.status(503).json({ error: "Database offline" });
  try {
    const { business, owner } = req.body;
    await database.collection('businesses').insertOne(business);
    await database.collection('users').insertOne(owner);
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Provisioning failed' });
  }
});

// --- STATIC ASSETS & SPA CATCH-ALL LAST ---

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  // If request is for an API that doesn't exist, don't serve index.html
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Export the app for Vercel
export default app;

// Start server locally or on Render
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 BarSync Node active on port ${PORT}`);
    connectToMongo();
  });
}
