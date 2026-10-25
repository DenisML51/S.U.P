import { ErrorCode, WsClientMessageSchema, type WsServerMessage } from '@itd/schema';
import type { FastifyPluginAsync } from 'fastify';
import type { AuthService } from '../auth/auth.service';
import type { RealtimeHub } from './hub';
import type { PresenceService } from './presence';

const AUTH_TIMEOUT_MS = 5_000;
/** Clients ping every ~25 s; a socket silent for longer than this is considered dead. */
const IDLE_TIMEOUT_MS = 70_000;
const MAX_MESSAGE_BYTES = 8 * 1024;

interface RealtimeRoutesOptions {
  auth: AuthService;
  hub: RealtimeHub;
  presence: PresenceService;
}

/**
 * `GET /api/ws`. The access token travels in the first message rather than the URL, so it never
 * ends up in proxy access logs. The socket only receives notifications; data is pulled over HTTP.
 */
export const realtimeRoutes: FastifyPluginAsync<RealtimeRoutesOptions> = async (app, { auth, hub, presence }) => {
  app.get('/ws', { websocket: true }, (socket, request) => {
    const send = (message: WsServerMessage) => {
      if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
    };
    const fail = (code: number, message: string) => {
      send({ type: 'error', error: ErrorCode.unauthorized, message });
      socket.close(code, message);
    };

    let unregister: (() => void) | null = null;
    let userId: string | null = null;
    const presenceFailed = (error: unknown) => request.log.warn({ err: error }, 'presence update failed');
    /** Set while the token is checked, so a second auth message cannot register the socket twice. */
    let authenticating = false;
    let closed = false;
    let idleTimer: NodeJS.Timeout | undefined;
    const touch = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => socket.close(4000, 'idle'), IDLE_TIMEOUT_MS);
    };
    const authTimer = setTimeout(() => fail(4001, 'Не пройдена авторизация'), AUTH_TIMEOUT_MS);

    socket.on('message', async (raw: Buffer, isBinary: boolean) => {
      if (isBinary || raw.length > MAX_MESSAGE_BYTES) return socket.close(1009, 'Message too large');
      touch();

      let parsed;
      try {
        parsed = WsClientMessageSchema.safeParse(JSON.parse(raw.toString('utf8')));
      } catch {
        parsed = null;
      }
      if (!parsed?.success) return send({ type: 'error', error: ErrorCode.validation, message: 'Некорректное сообщение' });

      const message = parsed.data;
      if (message.type === 'ping') {
        if (userId) void presence.renew(userId).catch(presenceFailed);
        return send({ type: 'pong' });
      }

      if (unregister || authenticating) return;
      authenticating = true;
      const verified = await auth.authenticate(message.token);
      authenticating = false;
      // Closed while the token was checked: nothing to register.
      if (closed) return;
      if (!verified) return fail(4001, 'Токен недействителен');

      clearTimeout(authTimer);
      userId = verified;
      const firstSocket = !hub.has(userId);
      unregister = hub.add(userId, { send, close: (code, reason) => socket.close(code, reason) });
      request.log.debug({ userId }, 'realtime connection authenticated');
      send({ type: 'ready', userId });
      if (firstSocket) void presence.connected(userId).catch(presenceFailed);
    });

    socket.on('close', () => {
      closed = true;
      clearTimeout(authTimer);
      clearTimeout(idleTimer);
      unregister?.();
      if (userId && !hub.has(userId)) presence.disconnected(userId, presenceFailed);
    });
  });
};
