import {
  ChangePasswordRequestSchema,
  LoginRequestSchema,
  RegisterRequestSchema,
  UpdateProfileRequestSchema,
  type AuthResponse,
} from '@itd/schema';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod, ZodTypeProvider } from 'fastify-type-provider-zod';
import { unauthorized } from '../../lib/errors';
import type { RealtimeHub } from '../realtime/hub';
import type { AuthService, Session } from './auth.service';
import { authenticate, requireClientHeader } from './authenticate';

export const REFRESH_COOKIE = 'itd_refresh';
const REFRESH_COOKIE_PATH = '/api/auth';

interface AuthRoutesOptions {
  auth: AuthService;
  hub: RealtimeHub;
  cookieSecure: boolean;
}

export const authRoutes: FastifyPluginAsyncZod<AuthRoutesOptions> = async (app, { auth, hub, cookieSecure }) => {
  const client = (request: FastifyRequest) => ({ userAgent: request.headers['user-agent'] });

  const respondWithSession = (reply: FastifyReply, session: Session, status = 200) => {
    reply.setCookie(REFRESH_COOKIE, session.refreshToken, {
      path: REFRESH_COOKIE_PATH,
      httpOnly: true,
      secure: cookieSecure,
      sameSite: 'strict',
      expires: session.refreshTokenExpiresAt,
    });
    const body: AuthResponse = {
      user: session.user,
      accessToken: session.accessToken,
      accessTokenExpiresAt: session.accessTokenExpiresAt.toISOString(),
    };
    return reply.status(status).send(body);
  };

  const clearCookie = (reply: FastifyReply) =>
    reply.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH, httpOnly: true, secure: cookieSecure, sameSite: 'strict' });

  const strictLimit = (max: number) => ({ rateLimit: { max, timeWindow: '1 minute' } });

  app.get('/auth/config', async () => ({ registrationEnabled: auth.registrationEnabled }));

  app.post(
    '/auth/register',
    { schema: { body: RegisterRequestSchema }, config: strictLimit(5) },
    async (request, reply) => respondWithSession(reply, await auth.register(request.body, client(request)), 201),
  );

  app.post(
    '/auth/login',
    { schema: { body: LoginRequestSchema }, config: strictLimit(10) },
    async (request, reply) => respondWithSession(reply, await auth.login(request.body, client(request))),
  );

  app.post(
    '/auth/refresh',
    { preHandler: requireClientHeader, config: strictLimit(60) },
    async (request, reply) => {
      const token = request.cookies[REFRESH_COOKIE];
      if (!token) throw unauthorized('Сессия не найдена');
      try {
        return respondWithSession(reply, await auth.refresh(token, client(request)));
      } catch (error) {
        clearCookie(reply);
        throw error;
      }
    },
  );

  app.post('/auth/logout', { preHandler: requireClientHeader }, async (request, reply) => {
    const token = request.cookies[REFRESH_COOKIE];
    if (token) await auth.logout(token);
    clearCookie(reply);
    return reply.status(204).send();
  });

  app.register(async (plugin) => {
    const account = plugin.withTypeProvider<ZodTypeProvider>();
    account.addHook('preHandler', authenticate(auth));

    account.get('/me', async (request) => auth.getUser(request.userId));

    account.patch('/me', { schema: { body: UpdateProfileRequestSchema } }, async (request) =>
      auth.updateProfile(request.userId, request.body.displayName),
    );

    account.post(
      '/me/password',
      { schema: { body: ChangePasswordRequestSchema }, config: strictLimit(5) },
      async (request, reply) => {
        const session = await auth.changePassword(request.userId, request.body, client(request));
        hub.disconnectUser(request.userId, 'Пароль изменён');
        return respondWithSession(reply, session);
      },
    );
  });
};
