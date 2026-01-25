import { MongoClient, ServerApiVersion, Db } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'barsync';

let db: Db | null = null;
let client: MongoClient | null = null;

if (uri) {
    client = new MongoClient(uri, {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        },
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
    });
}

export async function connectToMongo(): Promise<Db | null> {
    if (db) return db;
    if (!client) {
        console.error("❌ MONGODB_URI not found in environment");
        return null;
    }
    try {
        await client.connect();
        db = client.db(DB_NAME);
        console.log("✅ Connected to MongoDB Atlas");
        return db;
    } catch (err: any) {
        console.error("❌ MongoDB Connection failed:", err.message);
        return null;
    }
}

export function getDb(): Db | null {
    return db;
}
