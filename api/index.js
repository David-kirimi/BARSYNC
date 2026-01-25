import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectToMongo } from './lib/db.js';
import usersRouter, { seedDatabase } from './lib/users.js';
import productsRouter from './lib/products.js';
import salesRouter from './lib/sales.js';
import auditLogsRouter from './lib/auditLogs.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true
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

// Duplicate mounts for robustness
app.use('/auth', usersRouter);
app.use('/users', usersRouter);
app.use('/products', productsRouter);
app.use('/sales', salesRouter);
app.use('/auditLogs', auditLogsRouter);

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
        const isConnected = await connectToMongo();
        res.status(200).json({
            status: 'active',
            db: !!isConnected,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({ error: 'Health check failed' });
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
        console.log(`🚀 BarSync Node local active on port ${PORT}`);
        connectToMongo().then(() => {
            seedDatabase();
        });
    });
}

// Ensure database connection is initialized for Vercel (side effect)
connectToMongo().then(() => seedDatabase()).catch(console.error);

export default app;
