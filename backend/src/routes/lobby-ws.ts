import { LobbyRole, MemberStatus, MessageVisibility } from '@prisma/client';
import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma.js';
import { applyCombatEvent, buildLobbyState } from '../lobby/service.js';
import { combatEventSchema, masterMessageSchema, wsClientMessageSchema } from '../lobby/contracts.js';

type LiveConnection = {
  userId: string;
  role: LobbyRole;
  socket: { send: (data: string) => void; close: () => void; on: (event: string, cb: (...args: any[]) => void) => void };
};

const toJson = (value: unknown): string => JSON.stringify(value);

const getBearerToken = (authorization?: string): string | null => {
  if (!authorization) {
    return null;
  }
  const [scheme, token] = authorization.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }
  return token;
};

export const lobbyWsRoutes: FastifyPluginAsync = async (app) => {
  const lobbySockets = new Map<string, Set<LiveConnection>>();

  const removeConnection = (lobbyKey: string, socketRef: LiveConnection['socket']) => {
    const pool = lobbySockets.get(lobbyKey);
    if (!pool) {
      return;
    }
    for (const conn of pool) {
      if (conn.socket === socketRef) {
        pool.delete(conn);
      }
    }
    if (!pool.size) {
      lobbySockets.delete(lobbyKey);
    }
  };

  const emitLobbyEvent = (
    lobbyKey: string,
    event: unknown,
    filter: (conn: LiveConnection) => boolean = () => true
  ) => {
    const pool = lobbySockets.get(lobbyKey);
    if (!pool) {
      return;
    }
    for (const conn of pool) {
      if (!filter(conn)) {
        continue;
      }
      conn.socket.send(toJson(event));
    }
  };

  const syncStateForLobby = async (lobbyKey: string) => {
    const pool = lobbySockets.get(lobbyKey);
    if (!pool) {
      return;
    }
    const sockets = Array.from(pool);
    for (const conn of sockets) {
      const state = await buildLobbyState(lobbyKey, conn.userId);
      if (!state) {
        conn.socket.send(toJson({ type: 'error', payload: { message: 'Lobby not found' } }));
        continue;
      }
      conn.socket.send(toJson({ type: 'lobby.state', payload: state }));
    }
  };

  app.get('/ws/lobby', { websocket: true }, async (socket, request) => {
    const ws = ((socket as any)?.socket ?? socket) as {
      send: (data: string) => void;
      close: () => void;
      on: (event: string, cb: (...args: any[]) => void) => void;
    };
    if (!ws || typeof ws.on !== 'function') {
      app.log.error({ socketType: typeof socket }, 'WebSocket object is invalid');
      return;
    }

    const query = request.query as { key?: string; token?: string };
    const keyRaw = String(query.key ?? '');
    const lobbyKey = keyRaw.trim().toUpperCase();
    if (!lobbyKey) {
      ws.send(toJson({ type: 'error', payload: { message: 'Missing lobby key' } }));
      ws.close();
      return;
    }

    const token = query.token ?? getBearerToken(request.headers.authorization);
    if (!token) {
      ws.send(toJson({ type: 'error', payload: { message: 'Unauthorized' } }));
      ws.close();
      return;
    }

    let userId = '';
    try {
      const decoded = (await app.jwt.verify(token)) as { sub: string };
      userId = decoded.sub;
    } catch {
      ws.send(toJson({ type: 'error', payload: { message: 'Unauthorized' } }));
      ws.close();
      return;
    }

    const lobby = await prisma.lobby.findUnique({
      where: { key: lobbyKey },
      include: {
        members: {
          where: { userId },
          take: 1
        }
      }
    });
    if (!lobby) {
      ws.send(toJson({ type: 'error', payload: { message: 'Lobby not found' } }));
      ws.close();
      return;
    }

    const membership = lobby.members[0];
    if (!membership || membership.status === MemberStatus.LEFT) {
      ws.send(toJson({ type: 'error', payload: { message: 'Forbidden' } }));
      ws.close();
      return;
    }

    await prisma.lobbyMember.update({
      where: { id: membership.id },
      data: {
        status: MemberStatus.ONLINE,
        lastSeenAt: new Date()
      }
    });

    const liveConn: LiveConnection = {
      userId,
      role: membership.role,
      socket: ws as any
    };

    const pool = lobbySockets.get(lobbyKey) ?? new Set<LiveConnection>();
    pool.add(liveConn);
    lobbySockets.set(lobbyKey, pool);

    ws.on('close', async () => {
      removeConnection(lobbyKey, ws as any);
      await prisma.lobbyMember.update({
        where: { id: membership.id },
        data: {
          status: MemberStatus.OFFLINE,
          lastSeenAt: new Date()
        }
      });
      await syncStateForLobby(lobbyKey);
      emitLobbyEvent(lobbyKey, {
        type: 'lobby.member_left',
        payload: { memberId: membership.id, userId }
      });
    });

    ws.on('message', async (raw: Buffer | string) => {
      let parsedBody: unknown = {};
      try {
        const rawText = typeof raw === 'string' ? raw : raw.toString('utf8');
        parsedBody = JSON.parse(rawText);
      } catch {
        ws.send(toJson({ type: 'error', payload: { message: 'Invalid JSON payload' } }));
        return;
      }

      const parsed = wsClientMessageSchema.safeParse(parsedBody);
      if (!parsed.success) {
        ws.send(toJson({ type: 'error', payload: { message: 'Invalid message payload' } }));
        return;
      }

      const { type, payload, clientEventId } = parsed.data;

      if (type === 'presence.ping') {
        await prisma.lobbyMember.update({
          where: { id: membership.id },
          data: { status: MemberStatus.ONLINE, lastSeenAt: new Date() }
        });
        ws.send(toJson({ type: 'ack', payload: { clientEventId } }));
        return;
      }

      if (type === 'master.message.send') {
        const messageInput = masterMessageSchema.safeParse(payload);
        if (!messageInput.success) {
          ws.send(toJson({ type: 'error', payload: { message: 'Invalid message payload' } }));
          return;
        }

        const message = await prisma.lobbyMessage.create({
          data: {
            lobbyId: lobby.id,
            senderId: userId,
            senderRole: membership.role,
            content: messageInput.data.text,
            visibility: MessageVisibility.ALL
          }
        });

        emitLobbyEvent(lobbyKey, {
          type: 'master.message',
          payload: {
            id: message.id,
            senderId: message.senderId,
            senderRole: message.senderRole,
            content: message.content,
            visibility: message.visibility,
            createdAt: message.createdAt.toISOString()
          }
        });
        ws.send(toJson({ type: 'ack', payload: { clientEventId } }));
        return;
      }

      if (type === 'combat.event') {
        const eventInput = combatEventSchema.safeParse(payload);
        if (!eventInput.success) {
          ws.send(toJson({ type: 'error', payload: { message: 'Invalid combat payload' } }));
          return;
        }
        try {
          const combatState = await applyCombatEvent(lobby.id, eventInput.data, {
            userId,
            role: membership.role
          });
          emitLobbyEvent(lobbyKey, { type: 'combat.state', payload: combatState });
          await syncStateForLobby(lobbyKey);
          ws.send(toJson({ type: 'ack', payload: { clientEventId } }));
        } catch (error) {
          ws.send(
            toJson({
              type: 'error',
              payload: { message: error instanceof Error ? error.message : 'Failed to apply combat event' }
            })
          );
        }
        return;
      }

      if (type === 'lobby.join') {
        const state = await buildLobbyState(lobbyKey, userId);
        ws.send(toJson({ type: 'lobby.state', payload: state }));
        ws.send(toJson({ type: 'ack', payload: { clientEventId } }));
        return;
      }

      ws.send(toJson({ type: 'error', payload: { message: `Unknown message type: ${type}` } }));
    });

    const initial = await buildLobbyState(lobbyKey, userId);
    ws.send(toJson({ type: 'lobby.state', payload: initial }));
    emitLobbyEvent(lobbyKey, { type: 'lobby.member_joined', payload: { memberId: membership.id, userId } });
    await syncStateForLobby(lobbyKey);
  });
};
