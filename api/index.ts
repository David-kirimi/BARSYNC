import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectToMongo } from './db.js';
import usersRouter, { seedDatabase } from './users.js';
import productsRouter from './products.js';
import salesRouter from './sales.js';
import auditLogsRouter from './auditLogs.js';

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

// Mount Modular Routers
app.use('/api/auth', usersRouter);
app.use('/api/users', usersRouter); // Re-use for user management
app.use('/api/products', productsRouter);
app.use('/api/sales', salesRouter);
app.use('/api/auditLogs', auditLogsRouter);

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
