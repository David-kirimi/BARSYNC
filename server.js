
import express from 'express';
import { MongoClient, ServerApiVersion } from 'mongodb';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'DELETE'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));

const uri = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'barsync';

if (!uri) {
  console.error("❌ ERROR: MONGODB_URI is missing.");
  process.exit(1);
}

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let db;

async function seedDatabase() {
  const usersColl = db.collection('users');
  const bizColl = db.collection('businesses');

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

  const bizCount = await bizColl.countDocuments();
  if (bizCount === 0) {
    console.log("🌱 Seeding initial demo business...");
    
    // 1. Create Default Business
    const defaultBiz = {
      id: 'bus_default',
      name: 'The Junction Bar',
      ownerName: 'Jeniffer',
      mongoDatabase: 'barsync_prod',
      mongoCollection: 'junction_records',
      mongoConnectionString: 'https://barsync-backend.onrender.com',
      subscriptionStatus: 'Active',
      createdAt: new Date().toISOString()
    };
    await bizColl.insertOne(defaultBiz);

    // 2. Create Initial Owner
    await usersColl.insertOne({ 
      id: '1', 
      name: 'Jeniffer', 
      role: 'OWNER', 
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jeniffer', 
      businessId: 'bus_default', 
      status: 'Active', 
      password: '123' 
    });
    console.log("✅ Initial seeding complete.");
  }
}

async function startServer() {
  try {
    await client.connect();
    db = client.db(DB_NAME);
    console.log("✅ Connected to MongoDB Atlas");
    
    await seedDatabase();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 BarSync Backend active on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Connection failed:", err.message);
    setTimeout(startServer, 10000); 
  }
}

// --- AUTHENTICATION ---
app.post('/api/auth/login', async (req, res) => {
  try {
    const { businessName, username, password } = req.body;
    const usersColl = db.collection('users');
    const bizColl = db.collection('businesses');

    // Super Admin check (Doesn't need business name)
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

    // Get current state snapshot for this business
    const syncColl = db.collection('sync_history');
    const snapshot = await syncColl.findOne({ businessId: isPlatformLogin ? 'admin_node' : business.id });

    // Remove password from response
    const { password: _, ...userSafe } = user;

    res.status(200).json({ 
      user: userSafe, 
      business, 
      state: snapshot || null 
    });
  } catch (err) {
    res.status(500).json({ error: 'Login internal error' });
  }
});

// --- BUSINESS MANAGEMENT ---
app.get('/api/admin/businesses', async (req, res) => {
  try {
    const biz = await db.collection('businesses').find().toArray();
    res.json(biz);
  } catch (err) {
    res.status(500).json({ error: 'Fetch failed' });
  }
});

app.post('/api/admin/businesses', async (req, res) => {
  try {
    const { business, owner } = req.body;
    await db.collection('businesses').insertOne(business);
    await db.collection('users').insertOne(owner);
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Provisioning failed' });
  }
});

// --- SYNC ---
app.post('/api/sync', async (req, res) => {
  if (!db) return res.status(503).json({ error: "Database offline" });
  try {
    const { businessId, businessName, data } = req.body;
    const collection = db.collection('sync_history');
    
    // Ensure we are merging or overwriting based on the client's latest data
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

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'active', db: !!db });
});

startServer();
