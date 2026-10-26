import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import { sql } from 'drizzle-orm';
import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from 'fastify-type-provider-zod';
import type { Config } from './config';
import type { DatabaseConnection } from './db/client';
import { registerErrorHandler } from './lib/errors';
import { assetRoutes } from './modules/assets/assets.routes';
import { AssetsService } from './modules/assets/assets.service';
import { authRoutes } from './modules/auth/auth.routes';
import { AuthService } from './modules/auth/auth.service';
import { AccessTokenSigner } from './modules/auth/crypto';
import { characterRoutes } from './modules/characters/characters.routes';
import { CharactersService } from './modules/characters/characters.service';
import { CombatService } from './modules/parties/combat.service';
import { MessagesService } from './modules/parties/messages.service';
import { RollsService } from './modules/parties/rolls.service';
import { PartyAccess } from './modules/parties/partyAccess';
import { PartyQueries } from './modules/parties/parties.queries';
import { partyRoutes } from './modules/parties/parties.routes';
import { PartiesService } from './modules/parties/parties.service';
import { RealtimeHub } from './modules/realtime/hub';
import { PostgresChangeNotifier } from './modules/realtime/pgNotifier';
import { PresenceService } from './modules/realtime/presence';
import { realtimeRoutes } from './modules/realtime/realtime.routes';

/** Character documents embed avatars as data URLs; the schema caps one at ~4 MB. */
const BODY_LIMIT_BYTES = 6 * 1024 * 1024;

export interface AppServices {
  auth: AuthService;
  assets: AssetsService;
  characters: CharactersService;
  parties: PartiesService;
  combat: CombatService;
  partyQueries: PartyQueries;
  messages: MessagesService;
  rolls: RollsService;
  /** Sockets of this process. */
  hub: RealtimeHub;
  presence: PresenceService;
  /** Cross-process change bus; the app forwards it into `hub`. */
  notifier: PostgresChangeNotifier;
}

export function createServices(config: Config, { db, sql }: DatabaseConnection): AppServices {
  const hub = new RealtimeHub();
  const notifier = new PostgresChangeNotifier(sql, (error) => console.error('change notification failed', error));
  const signer = new AccessTokenSigner(config.JWT_SECRET, config.ACCESS_TOKEN_TTL_SECONDS);
  const partyAccess = new PartyAccess(db, notifier);
  const combat = new CombatService(partyAccess);
  const parties = new PartiesService(db, partyAccess, combat, (error) => console.error('party update failed', error));
  return {
    hub,
    notifier,
    presence: new PresenceService(db, notifier),
    auth: new AuthService(db, signer, {
      refreshTokenTtlDays: config.REFRESH_TOKEN_TTL_DAYS,
      registrationEnabled: config.REGISTRATION_ENABLED,
    }),
    characters: new CharactersService(db, notifier, [parties]),
    parties,
    combat,
    partyQueries: new PartyQueries(db),
    messages: new MessagesService(db, notifier),
    rolls: new RollsService(db, notifier),
    assets: new AssetsService(db),
  };
}

export async function buildApp(
  config: Config,
  database: DatabaseConnection,
  services = createServices(config, database),
) {
  const { db } = database;
  const trustedHops = config.TRUST_PROXY;
  const app = Fastify({
    logger:
      config.LOG_LEVEL === 'silent'
        ? false
        : {
            level: config.LOG_LEVEL,
            redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
          },
    bodyLimit: BODY_LIMIT_BYTES,
    // A hop count trusts that many proxies next to the API, whatever their address.
    trustProxy: typeof trustedHops === 'number' ? (_address: string, hop: number) => hop < trustedHops : trustedHops,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  registerErrorHandler(app);

  // The API answers with JSON and images only: nothing it sends may run or be framed. The page's own
  // policy is set by the web container's nginx.
  await app.register(helmet, {
    contentSecurityPolicy: { useDefaults: false, directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
    crossOriginResourcePolicy: { policy: 'same-site' },
  });
  await app.register(cookie);
  if (config.RATE_LIMIT_ENABLED) {
    await app.register(rateLimit, { global: true, max: 600, timeWindow: '1 minute' });
  }
  await app.register(websocket, { options: { maxPayload: 64 * 1024 } });

  if (config.CORS_ORIGINS.length > 0) {
    await app.register(cors, { origin: config.CORS_ORIGINS, credentials: true });
  }

  const stopForwarding = await services.notifier.forwardTo(services.hub);
  app.addHook('onClose', async () => {
    await stopForwarding();
    services.hub.closeAll();
    services.presence.dispose();
  });

  await app.register(
    async (api) => {
      // Probed every few seconds by Docker: keep them out of the request log.
      api.get('/health', { logLevel: 'warn' }, async () => ({ status: 'ok' }));
      api.get('/health/ready', { logLevel: 'warn' }, async (_request, reply) => {
        try {
          await db.execute(sql`select 1`);
          return { status: 'ready' };
        } catch {
          return reply.status(503).send({ status: 'unavailable' });
        }
      });

      await api.register(authRoutes, { auth: services.auth, hub: services.hub, cookieSecure: config.COOKIE_SECURE });
      await api.register(characterRoutes, { auth: services.auth, characters: services.characters });
      await api.register(partyRoutes, {
        auth: services.auth,
        parties: services.parties,
        combat: services.combat,
        queries: services.partyQueries,
        messages: services.messages,
        rolls: services.rolls,
      });
      await api.register(assetRoutes, { auth: services.auth, assets: services.assets });
      await api.register(realtimeRoutes, { auth: services.auth, hub: services.hub, presence: services.presence });
    },
    { prefix: '/api' },
  );

  return app;
}
