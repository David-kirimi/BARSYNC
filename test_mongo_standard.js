import { MongoClient } from 'mongodb';

const uri = "mongodb://muriiradavie_db_user:6ty0GtMN5lQ5E7xM@ac-tta3tzc-shard-00-00.vgv8uz9.mongodb.net:27017,ac-tta3tzc-shard-00-01.vgv8uz9.mongodb.net:27017,ac-tta3tzc-shard-00-02.vgv8uz9.mongodb.net:27017/barsync?ssl=true&replicaSet=atlas-4ihb3k-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  console.log("📡 Standard Diagnostic: Attempting connect...");
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 20000,
    connectTimeoutMS: 20000,
  });

  try {
    const start = Date.now();
    await client.connect();
    console.log(`✅ Success! Connected in ${Date.now() - start}ms`);
  } catch (err) {
    console.error("❌ FAILED!");
    console.error(err.name, ":", err.message);
  } finally {
    await client.close();
  }
}

run();
