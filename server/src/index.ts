import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.routes';
import eventRoutes from './routes/event.routes';
import questionRoutes from './routes/question.routes';
import participantRoutes from './routes/participant.routes';
import analyticsRoutes from './routes/analytics.routes';
import logRoutes from './routes/log.routes';
import { initializeSocket } from './socket';
import { ensureBootstrapAdmin } from './controllers/auth.controller';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const frontendOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: frontendOrigin,
    methods: ['GET', 'POST'],
  },
});

initializeSocket(io);

app.use(cors({
  origin: frontendOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/events', eventRoutes);
app.use('/questions', questionRoutes);
app.use('/participants', participantRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/logs', logRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Quiz server is healthy' });
});

httpServer.listen(PORT, () => {
  void ensureBootstrapAdmin().catch((error) => {
    console.error('Failed to bootstrap admin:', error);
  });
  console.log(`Server running on http://localhost:${PORT}`);
});
