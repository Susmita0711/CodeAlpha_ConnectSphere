import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import { authenticate } from './middleware/auth.js';
import { config } from './config.js';
import { addFileRoutes } from './routes/files.js';

export function createApp(isRoomMember, notifyRoom) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: config.clientOrigin, methods: ['GET', 'POST'], allowedHeaders: ['Content-Type', 'Authorization'] }));
  app.use(express.json({ limit: '32kb' }));
  app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }));
  app.use('/api/auth', authRoutes);
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'ConnectSphere API' }));
  app.get('/api/rtc-config', authenticate, (_req, res) => {
    const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
    if (config.turnUrl && config.turnUsername && config.turnCredential) {
      iceServers.push({ urls: config.turnUrl, username: config.turnUsername, credential: config.turnCredential });
    }
    return res.json({ iceServers });
  });
  addFileRoutes(app, isRoomMember, notifyRoom);
  app.use((error, _req, res, _next) => {
    console.error(error);
    if (res.headersSent) return;
    return res.status(500).json({ message: 'An unexpected server error occurred.' });
  });
  return app;
}
