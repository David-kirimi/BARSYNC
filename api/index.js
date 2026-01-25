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
// We mount them both with and without /api prefix for robustness on different platforms
app.use('/api/auth', usersRouter);
app.use('/api/users', usersRouter);
app.use('/api/products', productsRouter);
app.use('/api/sales', salesRouter);
app.use('/api/auditLogs', auditLogsRouter);

// Fallback for Vercel rewrites that might strip /api
app.use('/auth', usersRouter);
app.use('/users', usersRouter);
app.use('/products', productsRouter);
app.use('/sales', salesRouter);
app.use('/auditLogs', auditLogsRouter);

// Basic health check
app.get('/health', async (req, res) => {
    const isConnected = await connectToMongo();
    res.status(200).json({
        status: 'active',
        db: !!isConnected,
        timestamp: new Date().toISOString()
    });
});

// Serve static assets from Vite build
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API route not found' });
    }
    res.sendFile(path.join(distPath, 'index.html'));
});

// Start server
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 BarSync Node active on port ${PORT}`);
        connectToMongo().then(() => {
            seedDatabase();
        });
    });
}

export default app;
