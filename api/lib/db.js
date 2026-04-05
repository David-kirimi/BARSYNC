import { MongoClient, ServerApiVersion } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'barsync';

let db = null;
let client = null;

const clientOptions = {
    serverSelectionTimeoutMS: 20000,
    connectTimeoutMS: 20000,
    tls: true,
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

    // Diagnostic Logging (Masking Password)
    const maskedUri = uri.replace(/\/\/(.*):(.*)@/, (match, user, pass) => {
        return `//${user}:****@`;
    });

    if (!client) {
        client = new MongoClient(uri, clientOptions);
    }

    try {
        console.log(`📡 Attempting MongoDB: ${maskedUri}`);
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
