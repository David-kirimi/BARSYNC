import { MongoClient, ServerApiVersion } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root (two levels up from api/lib/db.js)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

let db = null;
let client = null;

const clientOptions = {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
    serverSelectionTimeoutMS: 20000,
    connectTimeoutMS: 20000,
    socketTimeoutMS: 20000,
    family: 4, // Forces IPv4 (solves connection issues on some cloud providers)
};

export async function connectToMongo() {
    if (db) return db;

    const uri = process.env.MONGODB_URI;
    const DB_NAME = process.env.DB_NAME || 'barsync';

    if (!uri) {
        console.error("❌ CRITICAL: MONGODB_URI environment variable is missing!");
        console.error("DEBUG: process.env keys present:", Object.keys(process.env).filter(k => k.includes('MONGO') || k.includes('DB')));
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
        
        // ping the deployment to verify a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("📡 Connection Pinged: Success!");
        
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
