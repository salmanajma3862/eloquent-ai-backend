import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import connectDB from './src/config/db.js';
import authRoutes from './src/routes/auth.routes.js';

// Connect to database
connectDB();

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

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