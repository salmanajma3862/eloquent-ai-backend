import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import connectDB from './src/config/db.js';
import authRoutes from './src/routes/auth.routes.js';
import testRoutes from './src/routes/test.routes.js';
import analysisRoutes from './src/routes/analysis.routes.js';
import sessionRoutes from './src/routes/session.routes.js';
import ttsRoutes from './src/routes/tts.routes.js';
import helmet from 'helmet';  
import cookieParser from 'cookie-parser';

connectDB();
const app = express();

app.use(cookieParser());
app.set('trust proxy', 1);
app.use(helmet())
app.use(express.json({ limit: '10mb' }));

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://192.168.69.2:5173',
    process.env.FRONTEND_URL
  ],
  credentials: true
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/test', testRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/tts', ttsRoutes);

app.get('/health', (req, res) => {
    res.json({ message: 'Ok!' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});