import { MongoClient, ServerApiVersion } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'barsync';

let db = null;
let client = null;

const clientOptions = {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
};

if (uri) {
    client = new MongoClient(uri, clientOptions);
}

export async function connectToMongo() {
    if (db) return db;
    if (!uri) {
        console.error("❌ CRITICAL: MONGODB_URI environment variable is missing!");
        throw new Error("CONFIG_MISSING");
    }

    if (!client) {
        client = new MongoClient(uri, clientOptions);
    }

    try {
        console.log("📡 Attempting MongoDB heartbeat...");
        await client.connect();
        db = client.db(DB_NAME);
        console.log("✅ Database Link Established");
        return db;
    } catch (err) {
        console.error("❌ MongoDB Connectivity Error:", err.message);
        if (err.message.includes('IP') || err.message.includes('whitelist')) {
            throw new Error("IP_NOT_WHITELISTED");
        }
        throw err;
    }
}

export function getDb() {
    return db;
}
