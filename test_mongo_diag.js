import { MongoClient, ServerApiVersion } from 'mongodb';

const uri = "mongodb+srv://muriiradavie_db_user:6ty0GtMN5lQ5E7xM@cluster0.vgv8uz9.mongodb.net/barsync?appName=Cluster0";

async function run() {
  console.log("📡 ESM Diagnostic: Attempting connect to MongoDB Atlas...");
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 20000,
    connectTimeoutMS: 20000,
  });

  try {
    const start = Date.now();
    await client.connect();
    const duration = Date.now() - start;
    console.log(`✅ Success! Connected in ${duration}ms`);
    
    const db = client.db("barsync");
    const collections = await db.listCollections().toArray();
    console.log("📂 Collections Found:", collections.map(c => c.name));
    
  } catch (err) {
    console.error("❌ Connection Failed!");
    console.error("Message:", err.message);
    if (err.reason) {
        console.error("Reason:", JSON.stringify(err.reason, null, 2));
    }
  } finally {
    await client.close();
  }
}

run();
