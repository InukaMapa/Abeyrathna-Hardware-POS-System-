import express from 'express';
import cors from 'cors';
import { config } from './src/config/env.js';
import authRoutes from './src/routes/authRoutes.js';
import menuRoutes from './src/routes/menuRoutes.js';
import inventoryRoutes from './src/routes/inventoryRoutes.js';
import tableRoutes from './src/routes/tableRoutes.js';
import placeRoutes from './src/routes/placeRoutes.js';
import orderRoutes from './src/routes/orderRoutes.js';
import uploadRoutes from './src/routes/uploadRoutes.js';
import cashierRoutes from './src/routes/cashierRoutes.js';
import cashRoutes from './src/routes/cashRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import supplierRoutes from './src/routes/supplierRoutes.js';
import websiteRoutes from './src/website/routes/websiteRoutes.js';
import ocrRoutes from './src/ocr/routes/ocrRoutes.js';

// Initialize App
const app = express();

// Middleware
app.use(express.json());

// Enhanced CORS configuration
app.use(cors({
    origin: '*', // Allow all origins (configure stricter in production)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/places', placeRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/cashier', cashierRoutes);
app.use('/api/cash', cashRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/website', websiteRoutes);

// OCR Routes
app.use('/api/ocr', ocrRoutes);

// Health Check
app.get('/', (req, res) => {
    res.send('Chill Grand Restaurant API is running...');
});

// 404 Handler - Route not found
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.path,
        method: req.method
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('[ERROR]', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        ...(config.env === 'development' && { stack: err.stack })
    });
});

// Start Server
const PORT = config.port || 5000;
const server = app.listen(PORT, () => {
    console.log(`Server running in ${config.env} mode on port ${PORT}`);
});

// Handle server errors
server.on('error', (err) => {
    console.error('[SERVER ERROR]', err);
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use.`);
        process.exit(1);
    }
});

// Keep process alive
setInterval(() => {
    // This just keeps the event loop active if needed
}, 1000 * 60 * 60);


// TODO: Integrate NLP routes if needed.
// import nlpRoutes from './src/nlp/routes/nlpRoutes.js';
// app.use('/api/nlp', nlpRoutes);

