import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { fs } from 'fs'; // For file check

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db;

try {
    const serviceAccountPath = path.resolve(__dirname, '../serviceAccountKey.json');
    let serviceAccount;

    // 1. Try environment variable (Standard for Render/Cloud)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        console.log("🔥 Initializing Firebase from Environment Variable...");
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } 
    // 2. Fallback to local file
    else {
        console.log("🔥 Initializing Firebase from Local File...");
        serviceAccount = serviceAccountPath;
    }

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
    
    db = admin.firestore();
    console.log("✅ Firestore Instance Initialized");

} catch (err) {
    console.error("❌ Firebase Initialization Error:", err.message);
    throw err;
}

export const getFirestore = () => db;
export default admin;
