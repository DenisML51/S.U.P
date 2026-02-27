import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { env } from './env.js';
import { auth } from './plugins/auth.js';
import { authRoutes } from './routes/auth.js';
import { characterRoutes } from './routes/characters.js';
import { notificationRoutes } from './routes/notifications.js';

export const buildApp = () => {
  const app = Fastify({ logger: true });

  app.register(cookie);
  app.register(cors, {
    origin: env.APP_ORIGIN,
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

  app.get('/health', async () => ({ ok: true }));

  app.register(authRoutes);
  app.register(characterRoutes);
  app.register(notificationRoutes);

  return app;
};
