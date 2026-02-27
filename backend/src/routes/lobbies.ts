import { LobbyRole, MemberStatus, MessageVisibility, type Prisma } from '@prisma/client';
import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../prisma.js';
import {
  lobbyCreateSchema,
  lobbyJoinSchema,
  lobbyLeaveSchema,
  masterMessageSchema,
  masterNotificationSchema
} from '../lobby/contracts.js';
import { buildLobbyState, resolveMemberHealth } from '../lobby/service.js';
import { reserveUniqueLobbyKey } from '../lobby/utils.js';

const normalizeKey = (raw: string): string => raw.trim().toUpperCase();

export const lobbyRoutes: FastifyPluginAsync = async (app) => {
  app.post('/lobbies', { preHandler: [app.authenticate] }, async (request, reply) => {
    const parsed = lobbyCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid payload' });
    }

    const userId = (request.user as { sub: string }).sub;
    const key = await reserveUniqueLobbyKey(async (candidate) => {
      const existing = await prisma.lobby.findUnique({
        where: { key: candidate },
        select: { id: true }
      });
      return Boolean(existing);
    });

    const health = await resolveMemberHealth(userId, parsed.data.characterId);
    const created = await prisma.lobby.create({
      data: {
        key,
        hostId: userId,
        settings: (parsed.data.settings ?? {}) as Prisma.InputJsonValue,
        members: {
          create: {
            userId,
            role: LobbyRole.MASTER,
            status: MemberStatus.ONLINE,
            currentHP: health.currentHP,
            maxHP: health.maxHP,
            characterId: health.characterId
          }
        }
      }
    });

    const state = await buildLobbyState(created.key, userId);
    return reply.code(201).send(state);
  });

  app.post('/lobbies/join', { preHandler: [app.authenticate] }, async (request, reply) => {
    const parsed = lobbyJoinSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid payload' });
    }

    const userId = (request.user as { sub: string }).sub;
    const lobby = await prisma.lobby.findUnique({
      where: { key: parsed.data.key },
      select: { id: true, key: true, status: true }
    });
    if (!lobby || lobby.status === 'CLOSED') {
      return reply.code(404).send({ message: 'Lobby not found' });
    }

    const health = await resolveMemberHealth(userId, parsed.data.characterId);
    await prisma.lobbyMember.upsert({
      where: { lobbyId_userId: { lobbyId: lobby.id, userId } },
      create: {
        lobbyId: lobby.id,
        userId,
        role: LobbyRole.PLAYER,
        status: MemberStatus.ONLINE,
        currentHP: health.currentHP,
        maxHP: health.maxHP,
        characterId: health.characterId
      },
      update: {
        status: MemberStatus.ONLINE,
        lastSeenAt: new Date(),
        leftAt: null,
        ...(health.characterId ? { characterId: health.characterId } : {}),
        ...(health.currentHP !== null ? { currentHP: health.currentHP } : {}),
        ...(health.maxHP !== null ? { maxHP: health.maxHP } : {})
      }
    });

    const state = await buildLobbyState(lobby.key, userId);
    return reply.send(state);
  });

  app.post('/lobbies/leave', { preHandler: [app.authenticate] }, async (request, reply) => {
    const parsed = lobbyLeaveSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid payload' });
    }
    const userId = (request.user as { sub: string }).sub;
    const key = normalizeKey(parsed.data.key);
    const lobby = await prisma.lobby.findUnique({
      where: { key },
      select: { id: true, hostId: true }
    });
    if (!lobby) {
      return reply.code(404).send({ message: 'Lobby not found' });
    }

    const me = await prisma.lobbyMember.findUnique({
      where: { lobbyId_userId: { lobbyId: lobby.id, userId } },
      select: { id: true }
    });
    if (!me) {
      return reply.code(404).send({ message: 'You are not in lobby' });
    }

    await prisma.lobbyMember.update({
      where: { id: me.id },
      data: {
        status: MemberStatus.LEFT,
        leftAt: new Date(),
        currentAction: null
      }
    });

    if (lobby.hostId === userId) {
      await prisma.lobby.update({
        where: { id: lobby.id },
        data: { status: 'CLOSED' }
      });
    }

    return reply.send({ ok: true });
  });

  app.get('/lobbies/:key', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = (request.user as { sub: string }).sub;
    const { key } = request.params as { key: string };
    const state = await buildLobbyState(normalizeKey(key), userId);
    if (!state) {
      return reply.code(404).send({ message: 'Lobby not found' });
    }
    if (!state.meRole) {
      return reply.code(403).send({ message: 'Forbidden' });
    }
    return reply.send(state);
  });

  app.post('/lobbies/:key/messages', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = (request.user as { sub: string }).sub;
    const { key } = request.params as { key: string };
    const parsed = masterMessageSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid payload' });
    }

    const lobby = await prisma.lobby.findUnique({
      where: { key: normalizeKey(key) },
      include: {
        members: {
          where: { userId, status: { not: MemberStatus.LEFT } },
          take: 1
        }
      }
    });
    if (!lobby) {
      return reply.code(404).send({ message: 'Lobby not found' });
    }

    const membership = lobby.members[0];
    if (!membership) {
      return reply.code(403).send({ message: 'Forbidden' });
    }
    const message = await prisma.lobbyMessage.create({
      data: {
        lobbyId: lobby.id,
        senderId: userId,
        senderRole: membership.role,
        content: parsed.data.text,
        visibility: MessageVisibility.ALL
      }
    });

    return reply.send({
      message: {
        id: message.id,
        senderId: message.senderId,
        senderRole: message.senderRole,
        content: message.content,
        visibility: message.visibility,
        createdAt: message.createdAt.toISOString()
      }
    });
  });

  app.post('/lobbies/:key/notify', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = (request.user as { sub: string }).sub;
    const { key } = request.params as { key: string };
    const parsed = masterNotificationSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid payload' });
    }

    const lobby = await prisma.lobby.findUnique({
      where: { key: normalizeKey(key) },
      include: {
        members: {
          where: { userId, status: { not: MemberStatus.LEFT } },
          take: 1
        }
      }
    });
    if (!lobby) {
      return reply.code(404).send({ message: 'Lobby not found' });
    }
    const membership = lobby.members[0];
    if (!membership || membership.role !== LobbyRole.MASTER) {
      return reply.code(403).send({ message: 'Only master can send notification' });
    }

    const created = await (prisma as any).systemNotification.create({
      data: {
        title: parsed.data.title || 'Уведомление мастера',
        message: parsed.data.text,
        type: 'lobby',
        isActive: true,
        publishedAt: new Date()
      }
    });

    return reply.send({ ok: true, notificationId: created.id });
  });
};
