import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import { env } from './env.js';
import { auth } from './plugins/auth.js';
import { authRoutes } from './routes/auth.js';
import { characterRoutes } from './routes/characters.js';
import { lobbyRoutes } from './routes/lobbies.js';
import { lobbyWsRoutes } from './routes/lobby-ws.js';
import { notificationRoutes } from './routes/notifications.js';

export const buildApp = () => {
  const app = Fastify({ logger: true });
  const allowedOrigins = new Set([env.APP_ORIGIN, 'http://localhost:5174']);

  app.register(cookie);
  app.register(cors, {
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.has(origin)) {
        cb(null, true);
        return;
      }
      cb(new Error('Not allowed by CORS'), false);
    },
    credentials: true
  });
  app.register(helmet);
  app.register(rateLimit, {
    global: false,
    max: 100,
    timeWindow: '1 minute'
  });
  app.register(jwt, {
    secret: env.JWT_ACCESS_SECRET
  });
  app.register(auth);
  app.register(websocket);

  app.get('/health', async () => ({ ok: true }));

  app.register(authRoutes);
  app.register(characterRoutes);
  app.register(notificationRoutes);
  app.register(lobbyRoutes);
  app.register(lobbyWsRoutes);

  return app;
};
