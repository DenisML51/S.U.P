import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { env } from '../env.js';
import { prisma } from '../prisma.js';

const readSchema = z.object({
  notificationIds: z.array(z.string().min(1)).min(1)
});

const publishSchema = z.object({
  title: z.string().min(1).max(120),
  message: z.string().min(1).max(5000),
  type: z.string().min(1).max(40).default('info'),
  publishedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  isActive: z.boolean().optional()
});

export const notificationRoutes: FastifyPluginAsync = async (app) => {
  app.post('/notifications/publish', async (request, reply) => {
    if (!env.ADMIN_API_KEY || request.headers['x-admin-key'] !== env.ADMIN_API_KEY) {
      return reply.code(403).send({ message: 'Forbidden' });
    }

    const parsed = publishSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid payload' });
    }

    const payload = parsed.data;
    const created = await (prisma as any).systemNotification.create({
      data: {
        title: payload.title,
        message: payload.message,
        type: payload.type,
        isActive: payload.isActive ?? true,
        publishedAt: payload.publishedAt ? new Date(payload.publishedAt) : new Date(),
        expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null
      }
    });

    return { notification: created };
  });

  app.get('/notifications', { preHandler: [app.authenticate] }, async (request) => {
    const userId = (request.user as { sub: string }).sub;
    const now = new Date();

    const notifications = await (prisma as any).systemNotification.findMany({
      where: {
        isActive: true,
        publishedAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
      },
      orderBy: { publishedAt: 'desc' },
      take: 50,
      include: {
        reads: {
          where: { userId },
          select: { id: true, readAt: true }
        }
      }
    });

    return {
      notifications: notifications.map((item: any) => ({
        id: item.id,
        title: item.title,
        message: item.message,
        type: item.type,
        publishedAt: item.publishedAt,
        isRead: item.reads.length > 0,
        readAt: item.reads[0]?.readAt ?? null
      }))
    };
  });

  app.post('/notifications/read', { preHandler: [app.authenticate] }, async (request, reply) => {
    const parsed = readSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid payload' });
    }

    const userId = (request.user as { sub: string }).sub;
    const { notificationIds } = parsed.data;
    const now = new Date();

    await prisma.$transaction(
      notificationIds.map((notificationId) =>
        (prisma as any).userNotificationRead.upsert({
          where: {
            userId_notificationId: { userId, notificationId }
          },
          update: { readAt: now },
          create: { userId, notificationId, readAt: now }
        })
      )
    );

    return { ok: true };
  });
};
