import type { FastifyReply, FastifyRequest } from 'fastify';
import { unauthorized, forbidden } from '../../lib/errors';
import type { AuthService } from './auth.service';

declare module 'fastify' {
  interface FastifyRequest {
    /** Set by `authenticate` on protected routes. */
    userId: string;
  }
}

const BEARER = /^Bearer\s+(.+)$/i;

export const bearerToken = (request: FastifyRequest): string | null =>
  request.headers.authorization?.match(BEARER)?.[1] ?? null;

/** preHandler for routes that require a signed-in user. */
export const authenticate =
  (auth: AuthService) =>
  async (request: FastifyRequest): Promise<void> => {
    const token = bearerToken(request);
    const userId = token ? await auth.authenticate(token) : null;
    if (!userId) throw unauthorized();
    request.userId = userId;
  };

/**
 * Cookie-authenticated endpoints additionally require a custom header. Browsers cannot attach one
 * to a cross-site request without a CORS preflight, which closes the CSRF hole SameSite leaves open
 * in older browsers.
 */
export const CLIENT_HEADER = 'x-itd-client';

export const requireClientHeader = async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
  if (!request.headers[CLIENT_HEADER]) throw forbidden('Запрос отклонён');
};

/** Identifies the browser tab that made a change, so it can ignore its own change notification. */
export const clientSessionId = (request: FastifyRequest): string | null => {
  const value = request.headers['x-client-session'];
  return typeof value === 'string' && /^[\w-]{1,64}$/.test(value) ? value : null;
};
