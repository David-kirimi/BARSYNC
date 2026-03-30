import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'barsync';

async function check() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(DB_NAME);
  
  const shiftsCount = await db.collection('shifts').countDocuments();
  console.log('Total shifts:', shiftsCount);
  
  const shifts = await db.collection('shifts').find().sort({ startTime: -1 }).limit(5).toArray();
  console.log(JSON.stringify(shifts, null, 2));
  
  await client.close();
}

check().catch(console.error);
