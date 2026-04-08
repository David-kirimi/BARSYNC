import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env at the very beginning
dotenv.config();

import express from 'express';
import cors from 'cors';
import { connectToMongo } from './lib/db.js';
import usersRouter, { seedDatabase } from './lib/users.js';
import productsRouter from './lib/products.js';
import salesRouter from './lib/sales.js';
import auditLogsRouter from './lib/auditLogs.js';
import tabsRouter from './lib/tabs.js';
import shiftsRouter from './lib/shifts.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
    'https://barsync.vercel.app',
    'https://barsync-pos.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
            callback(null, true);
        } else {
            console.warn(`[CORS Reject] Origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '50mb' }));

// Logging Middleware
app.use((req, res, next) => {
    console.log(`[API] ${req.method} ${req.path}`);
    next();
});

// Mount Modular Routers
app.use('/api/auth', usersRouter);
app.use('/api/users', usersRouter);
app.use('/api/products', productsRouter);
app.use('/api/sales', salesRouter);
app.use('/api/auditLogs', auditLogsRouter);
app.use('/api/tabs', tabsRouter);
app.use('/api/shifts', shiftsRouter);

// Duplicate mounts for robustness
app.use('/auth', usersRouter);
app.use('/users', usersRouter);
app.use('/products', productsRouter);
app.use('/sales', salesRouter);
app.use('/auditLogs', auditLogsRouter);
app.use('/tabs', tabsRouter);
app.use('/shifts', shiftsRouter);

// Test Routes
app.get('/api/test', (req, res) => res.json({ message: 'API /api/test is reachable' }));
app.get('/test', (req, res) => res.json({ message: 'API /test is reachable' }));
app.get('/api/auth/test', (req, res) => res.json({ message: 'API /api/auth/test is reachable' }));

// Diagnostic Route
app.get('/api/diag', (req, res) => {
    res.json({
        url: req.url,
        path: req.path,
        method: req.method,
        baseUrl: req.baseUrl,
        originalUrl: req.originalUrl,
        params: req.params,
        query: req.query,
        vercel: !!process.env.VERCEL
    });
});

app.get('/health', async (req, res) => {
    try {
        const startTime = Date.now();
        const db = await connectToMongo();
        const duration = Date.now() - startTime;
        
        res.status(200).json({
            status: 'active',
            database: 'connected',
            latency: `${duration}ms`,
            uri_found: !!process.env.MONGODB_URI,
            uri_masked: process.env.MONGODB_URI ? process.env.MONGODB_URI.replace(/\/\/(.*):(.*)@/, "//****:****@") : 'NOT_FOUND',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error("Health Check Failed:", err.message);
        res.status(503).json({ 
            status: 'degraded', 
            database: 'disconnected',
            uri_found: !!process.env.MONGODB_URI,
            uri_masked: process.env.MONGODB_URI ? process.env.MONGODB_URI.replace(/\/\/(.*):(.*)@/, "//****:****@") : 'NOT_FOUND',
            error: err.message,
            timestamp: new Date().toISOString()
        });
    }
});

// API Diagnostic Catch-all for /api/*
app.all('/api/*', (req, res) => {
    console.log(`[API 404] No match for ${req.method} ${req.path}`);
    res.status(404).json({
        error: 'API route not found',
        method: req.method,
        path: req.path,
        url: req.url,
        suggestion: 'Check if the route is correctly mounted in api/index.js'
    });
});

// For Vercel, we can also add a catch-all for anything else hitting this function
app.all('*', (req, res) => {
    res.status(404).json({
        error: 'Backend endpoint not found',
        path: req.path
    });
});

// Start server locally
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 BarSync Node active on port ${PORT}`);
    });
}

// Ensure database connection is initialized for Vercel/Cloud Platforms
connectToMongo()
    .then(() => {
        console.log("🌱 Syncing Database Snapshots...");
        seedDatabase();
    })
    .catch((err) => {
        console.error("❌ Database initialization error during startup:", err.message);
        // Important: We don't crash the server here so it can still serve /health or static files
    });

export default app;
