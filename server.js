
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
  methods: ['GET', 'POST', 'DELETE'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));

// Serve static files from the Vite build directory 'dist'
app.use(express.static(path.join(__dirname, 'dist')));

const uri = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'barsync';

if (!uri) {
  console.error("❌ ERROR: MONGODB_URI is missing.");
  // On Vercel build phase, this might fail, so we catch it gracefully
  if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
     process.exit(1);
  }
}

const client = uri ? new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
}) : null;

let db;

async function seedDatabase() {
  if (!db) return;
  const usersColl = db.collection('users');
  
  // Ensure SLIEM (Master Admin) exists
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
}

async function startServer() {
  if (client) {
    try {
      await client.connect();
      db = client.db(DB_NAME);
      console.log("✅ Connected to MongoDB Atlas");
      await seedDatabase();
    } catch (err) {
      console.error("❌ Connection failed:", err.message);
      // Retry logic if not on Vercel
      if (!process.env.VERCEL) setTimeout(startServer, 10000); 
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 BarSync Unified Node active on port ${PORT}`);
  });
}

// --- AUTHENTICATION ---
app.post('/api/auth/login', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database not connected" });
  try {
    const { businessName, username, password } = req.body;
    const usersColl = db.collection('users');
    const bizColl = db.collection('businesses');

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

    const syncColl = db.collection('sync_history');
    const snapshot = await syncColl.findOne({ businessId: isPlatformLogin ? 'admin_node' : business.id });

    const { password: _, ...userSafe } = user;
    res.status(200).json({ user: userSafe, business, state: snapshot || null });
  } catch (err) {
    res.status(500).json({ error: 'Login internal error' });
  }
});

// --- SYNC ---
app.post('/api/sync', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database offline" });
  try {
    const { businessId, businessName, data } = req.body;
    const collection = db.collection('sync_history');
    
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
  if (!db) return res.status(503).json({ error: "Database offline" });
  try {
    const biz = await db.collection('businesses').find().toArray();
    res.json(biz);
  } catch (err) {
    res.status(500).json({ error: 'Fetch failed' });
  }
});

app.post('/api/admin/businesses', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database offline" });
  try {
    const { business, owner } = req.body;
    await db.collection('businesses').insertOne(business);
    await db.collection('users').insertOne(owner);
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Provisioning failed' });
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'active', db: !!db });
});

// For any other request, serve the index.html from dist (SPA Support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

startServer();
