import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import { sql } from 'drizzle-orm';
import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from 'fastify-type-provider-zod';
import type { Config } from './config';
import type { Database } from './db/client';
import { registerErrorHandler } from './lib/errors';
import { authRoutes } from './modules/auth/auth.routes';
import { AuthService } from './modules/auth/auth.service';
import { AccessTokenSigner } from './modules/auth/crypto';
import { characterRoutes } from './modules/characters/characters.routes';
import { CharactersService } from './modules/characters/characters.service';
import { RealtimeHub } from './modules/realtime/hub';
import { realtimeRoutes } from './modules/realtime/realtime.routes';

/** Character documents embed avatars as data URLs; the schema caps one at ~4 MB. */
const BODY_LIMIT_BYTES = 6 * 1024 * 1024;

export interface AppServices {
  auth: AuthService;
  characters: CharactersService;
  hub: RealtimeHub;
}

export function createServices(config: Config, db: Database): AppServices {
  const hub = new RealtimeHub();
  const signer = new AccessTokenSigner(config.JWT_SECRET, config.ACCESS_TOKEN_TTL_SECONDS);
  return {
    hub,
    auth: new AuthService(db, signer, {
      refreshTokenTtlDays: config.REFRESH_TOKEN_TTL_DAYS,
      registrationEnabled: config.REGISTRATION_ENABLED,
    }),
    characters: new CharactersService(db, hub),
  };
}

export async function buildApp(config: Config, db: Database, services = createServices(config, db)) {
  const app = Fastify({
    logger:
      config.LOG_LEVEL === 'silent'
        ? false
        : {
            level: config.LOG_LEVEL,
            redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
          },
    bodyLimit: BODY_LIMIT_BYTES,
    trustProxy: config.TRUST_PROXY,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  registerErrorHandler(app);

  await app.register(helmet, { contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'same-site' } });
  await app.register(cookie);
  if (config.RATE_LIMIT_ENABLED) {
    await app.register(rateLimit, { global: true, max: 600, timeWindow: '1 minute' });
  }
  await app.register(websocket, { options: { maxPayload: 64 * 1024 } });

  if (config.CORS_ORIGINS.length > 0) {
    await app.register(cors, { origin: config.CORS_ORIGINS, credentials: true });
  }

  app.addHook('onClose', async () => services.hub.closeAll());

  await app.register(
    async (api) => {
      api.get('/health', async () => ({ status: 'ok' }));
      api.get('/health/ready', async (_request, reply) => {
        try {
          await db.execute(sql`select 1`);
          return { status: 'ready' };
        } catch {
          return reply.status(503).send({ status: 'unavailable' });
        }
      });

      await api.register(authRoutes, { auth: services.auth, hub: services.hub, cookieSecure: config.COOKIE_SECURE });
      await api.register(characterRoutes, { auth: services.auth, characters: services.characters });
      await api.register(realtimeRoutes, { auth: services.auth, hub: services.hub });
    },
    { prefix: '/api' },
  );

  return app;
}
