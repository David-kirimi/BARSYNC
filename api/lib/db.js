import { MongoClient, ServerApiVersion } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

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
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
    });
}

export async function connectToMongo() {
    if (db) return db;
    if (!uri) {
        console.error("❌ CRITICAL: MONGODB_URI environment variable is missing!");
        throw new Error("CONFIG_MISSING");
    }

    if (!client) {
        client = new MongoClient(uri, {
            serverApi: {
                version: ServerApiVersion.v1,
                strict: true,
                deprecationErrors: true,
            },
            serverSelectionTimeoutMS: 10000, // Increased to 10s for Vercel cold starts
            connectTimeoutMS: 10000,
        });
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
