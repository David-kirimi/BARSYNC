import { MongoClient } from 'mongodb';

const uri = "mongodb+srv://muriiradavie_db_user:6ty0GtMN5lQ5E7xM@cluster0.vgv8uz9.mongodb.net/barsync?appName=Cluster0";

async function run() {
  console.log("📡 Simple Test: Connecting...");
  const client = new MongoClient(uri); // No complex options

  try {
    const start = Date.now();
    await client.connect();
    console.log(`✅ OK! Connected in ${Date.now() - start}ms`);
  } catch (err) {
    console.error("❌ FAILED!");
    console.error(err.name, ":", err.message);
  } finally {
    await client.close();
  }
}

run();
