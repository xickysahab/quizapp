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
import { responseBatcher } from './utils/responseBatcher';
import prisma from './config/prisma';
import { createAdapter } from '@socket.io/redis-adapter';
import { closeRedis, createRedisClient, redisEnabled } from './config/redis';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const frontendOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';

// Deployments behind a proxy (Render, Fly, nginx) need this for req.ip to be the
// real client address. Leave unset when the server is directly exposed, otherwise
// clients can spoof their IP through X-Forwarded-For and evade the rate limiter.
const trustProxy = process.env.TRUST_PROXY;
if (trustProxy) {
  const hops = Number(trustProxy);
  app.set('trust proxy', Number.isFinite(hops) ? hops : trustProxy === 'true' ? true : trustProxy);
}

app.disable('x-powered-by');

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: frontendOrigin,
    methods: ['GET', 'POST'],
  },
});

// The Redis adapter is what lets several instances share one quiz: without it
// each process keeps its own rooms and counters, so a participant on instance B
// never receives a question broadcast from instance A.
if (redisEnabled) {
  io.adapter(createAdapter(createRedisClient(), createRedisClient()));
  console.log('Socket.IO Redis adapter enabled.');
} else {
  const warning =
    'REDIS_URL is not set: live state is per-process. Run exactly one instance, and do not deploy while an event is live.';
  if (process.env.NODE_ENV === 'production') {
    console.warn(`WARNING: ${warning}`);
  } else {
    console.log(warning);
  }
}

initializeSocket(io);

app.use(cors({
  origin: frontendOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

// This server only ever returns JSON and CSV, so a handful of headers covers it.
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

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

async function start() {
  // Awaited before the port opens: while no users exist, POST /auth/login promotes
  // the first caller to ADMIN, so the bootstrap admin must already be in place.
  try {
    await ensureBootstrapAdmin();
  } catch (error) {
    console.error('Failed to bootstrap admin:', error);
    process.exit(1);
  }

  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, shutting down...`);

  // Hard stop if a step hangs, so the platform's kill timer does not cut the flush short.
  const forceExit = setTimeout(() => {
    console.error('Shutdown timed out, forcing exit.');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  try {
    io.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    await responseBatcher.stop();
    await prisma.$disconnect();
    await closeRedis();
    clearTimeout(forceExit);
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

void start();
