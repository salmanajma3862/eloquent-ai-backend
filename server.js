import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import connectDB from './src/config/db.js';
import authRoutes from './src/routes/auth.routes.js';
import testRoutes from './src/routes/test.routes.js';
import analysisRoutes from './src/routes/analysis.routes.js';
import sessionRoutes from './src/routes/session.routes.js';
import ttsRoutes from './src/routes/tts.routes.js';

// Connect to database
connectDB();

// Initialize Express app
const app = express();

// Enable trust proxy to get the real IP address from behind proxies
app.set('trust proxy', 1); // The '1' means we trust the first proxy in the chain.

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://192.168.69.2:5173' // <-- ADD THIS LINE (use your IP)
  ]
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/test', testRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/tts', ttsRoutes);

// Basic health check route
app.get('/', (req, res) => {
    res.json({ message: 'Eloquent AI Backend API is running!' });
});

// Define PORT
const PORT = process.env.PORT || 5000;

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});