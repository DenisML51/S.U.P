import { ErrorCode, WsClientMessageSchema, type WsServerMessage } from '@itd/schema';
import type { FastifyPluginAsync } from 'fastify';
import type { AuthService } from '../auth/auth.service';
import type { RealtimeHub } from './hub';

const AUTH_TIMEOUT_MS = 5_000;
/** Clients ping every ~25 s; a socket silent for longer than this is considered dead. */
const IDLE_TIMEOUT_MS = 70_000;
const MAX_MESSAGE_BYTES = 8 * 1024;

interface RealtimeRoutesOptions {
  auth: AuthService;
  hub: RealtimeHub;
}

/**
 * `GET /api/ws`. The access token travels in the first message rather than the URL, so it never
 * ends up in proxy access logs. The socket only receives notifications; data is pulled over HTTP.
 */
export const realtimeRoutes: FastifyPluginAsync<RealtimeRoutesOptions> = async (app, { auth, hub }) => {
  app.get('/ws', { websocket: true }, (socket, request) => {
    const send = (message: WsServerMessage) => {
      if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
    };
    const fail = (code: number, message: string) => {
      send({ type: 'error', error: ErrorCode.unauthorized, message });
      socket.close(code, message);
    };

    let unregister: (() => void) | null = null;
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
      if (message.type === 'ping') return send({ type: 'pong' });

      if (unregister) return;
      const userId = await auth.authenticate(message.token);
      if (!userId) return fail(4001, 'Токен недействителен');

      clearTimeout(authTimer);
      unregister = hub.add(userId, { send, close: (code, reason) => socket.close(code, reason) });
      request.log.debug({ userId }, 'realtime connection authenticated');
      send({ type: 'ready', userId });
    });

    socket.on('close', () => {
      clearTimeout(authTimer);
      clearTimeout(idleTimer);
      unregister?.();
    });
  });
};
