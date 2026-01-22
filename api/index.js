
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

    const businessName = (req.body.businessName || "").trim();
    const username = (req.body.username || "").trim();
    const password = (req.body.password || "").trim();

    console.log(`[Auth] ATTEMPT: Business="${businessName}" User="${username}"`);

    const usersColl = database.collection('users');
    const bizColl = database.collection('businesses');

    const isPlatformLogin = !businessName || businessName.toLowerCase() === 'platform';

    let user;
    let business = null;

    if (isPlatformLogin) {
      console.log(`[Auth] Checking PLATFORM login for ${username}`);
      user = await usersColl.findOne({
        name: { $regex: new RegExp(`^${username}$`, 'i') },
        role: 'SUPER_ADMIN'
      });
    } else {
      console.log(`[Auth] Checking ORGANIZATION login for ${businessName} -> ${username}`);
      business = await bizColl.findOne({ name: { $regex: new RegExp(`^${businessName}$`, 'i') } });

      if (!business) {
        console.warn(`[Auth] FAILURE: Business not found: "${businessName}"`);
        return res.status(404).json({ error: 'Business not found' });
      }

      console.log(`[Auth] Found BusinessID: ${business.id}. Searching for user "${username}" under this ID...`);
      user = await usersColl.findOne({
        businessId: business.id,
        name: { $regex: new RegExp(`^${username}$`, 'i') }
      });
    }

    if (!user) {
      console.warn(`[Auth] FAILURE: User "${username}" not found in organization "${businessName}"`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log(`[Auth] Found User record. Cmp Passwords...`);
    if (user.password !== password) {
      console.warn(`[Auth] FAILURE: Password mismatch for user: ${username}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log(`[Auth] SUCCESS: Session authenticated for ${username}`);

    const syncColl = database.collection('sync_history');
    const snapshot = await syncColl.findOne({ businessId: isPlatformLogin ? 'admin_node' : business.id });

    const { password: _, ...userSafe } = user;
    res.status(200).json({ user: userSafe, business, state: snapshot || null });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const database = await connectToMongo();
    if (!database) return res.status(503).json({ error: "Database offline" });

    const { businessName, ownerName, password, plan } = req.body;

    if (!businessName || !ownerName || !password) {
      return res.status(400).json({ error: "Missing required registration details" });
    }

    const bizColl = database.collection('businesses');
    const usersColl = database.collection('users');

    // Check if business name exists
    const existing = await bizColl.findOne({ name: { $regex: new RegExp(`^${businessName.trim()}$`, 'i') } });
    if (existing) {
      return res.status(409).json({ error: "Business name already registered" });
    }

    const businessId = `bus_${Math.random().toString(36).substr(2, 5)}`;
    const newBusiness = {
      id: businessId,
      name: businessName.trim(),
      ownerName: ownerName.trim(),
      subscriptionStatus: 'Trial',
      subscriptionPlan: plan || 'Basic',
      paymentStatus: 'Pending',
      createdAt: new Date().toISOString(),
      mongoDatabase: 'barsync_prod',
      mongoCollection: 'sync_history',
      mongoConnectionString: 'https://barsync-backend.onrender.com'
    };

    const ownerId = `user_${Math.random().toString(36).substr(2, 5)}`;
    const newOwner = {
      id: ownerId,
      name: ownerName.trim(),
      role: 'OWNER',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${ownerName.trim()}`,
      businessId,
      status: 'Active',
      password: password.trim()
    };

    await bizColl.insertOne(newBusiness);
    await usersColl.insertOne(newOwner);

    console.log(`[Register] SUCCESS: New Business "${businessName}" by "${ownerName}"`);

    const { password: _, ...userSafe } = newOwner;
    res.status(201).json({ user: userSafe, business: newBusiness });
  } catch (err) {
    console.error("Registration Error:", err);
    res.status(500).json({ error: "Internal server error during registration" });
  }
});

app.post('/api/sync', async (req, res) => {
  const database = await connectToMongo();
  if (!database) return res.status(503).json({ error: "Database offline" });

  try {
    const { businessId, businessName, data } = req.body;

    if (!data) {
      console.error("[Sync] Missing 'data' object in request body");
      return res.status(400).json({ error: "Missing data payload" });
    }

    console.log(`[Sync] START: Business="${businessName}" ID="${businessId}" Sales=${data.sales?.length || 0} Users=${data.users?.length || 0}`);

    const collection = database.collection('sync_history');
    const existing = await collection.findOne({ businessId });

    const mergeArrays = (base = [], incoming = []) => {
      const map = new Map();
      base.forEach(item => map.set(item.id, item));
      incoming.forEach(item => {
        if (item.id) {
          // Deep merge or simple replace? Simple replace for now, 
          // but we follow current item as truth for its own ID
          map.set(item.id, { ...(map.get(item.id) || {}), ...item });
        }
      });
      return Array.from(map.values());
    };

    const mergedData = {
      businessName: businessName || (existing ? existing.businessName : 'Unknown'),
      lastSync: new Date(),
      products: mergeArrays(existing?.products, data.products),
      sales: mergeArrays(existing?.sales, data.sales),
      auditLogs: mergeArrays(existing?.auditLogs, data.auditLogs),
      users: mergeArrays(existing?.users, data.users)
    };

    await collection.updateOne(
      { businessId },
      { $set: mergedData },
      { upsert: true }
    );

    // Sync users to main authentication collection
    if (data.users && Array.isArray(data.users)) {
      const usersColl = database.collection('users');
      console.log(`[Sync] Processing ${data.users.length} users for auth collection...`);

      for (const u of data.users) {
        if (!u.id) {
          console.warn(`[Sync] Skipping user without ID: ${u.name}`);
          continue;
        }

        try {
          const { password, ...otherData } = u;
          const updateData = { ...otherData };
          if (password) updateData.password = password;

          await usersColl.updateOne(
            { id: u.id },
            { $set: updateData },
            { upsert: true }
          );
        } catch (uErr) {
          console.error(`[Sync] Error updating user ${u.id}:`, uErr.message);
        }
      }
    }

    console.log(`[Sync] SUCCESS: Data merged for ${businessName}`);
    res.status(200).json({ success: true, state: mergedData });
  } catch (err) {
    console.error("[Sync] CRITICAL FAILURE:", err);
    res.status(500).json({ error: "Sync internal error", details: err.message });
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
