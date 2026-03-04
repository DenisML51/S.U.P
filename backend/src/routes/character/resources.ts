import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  spendResource,
  resetAllResources,
  upsertResource,
  removeResource,
} from '../../../../game-logic/src/character/resources.js';
import { withCharacter, notFound, getUserId } from './helpers.js';
import type { Resource } from '../../../../game-logic/src/types.js';

const resourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  iconName: z.string().default(''),
  current: z.number().min(0).default(0),
  max: z.number().min(0).default(0),
  description: z.string().default(''),
  spellSlotLevel: z.number().int().optional(),
  color: z.string().optional(),
});

const spendSchema = z.object({ delta: z.number().int() });

export const resourceRoutes: FastifyPluginAsync = async (app) => {
  // Create or update resource
  app.post(
    '/characters/:id/resources',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const { id } = request.params as { id: string };
      const parsed = resourceSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ message: 'Invalid body' });

      try {
        const character = await withCharacter(id, userId, char =>
          upsertResource(char, parsed.data as Resource)
        );
        return { character };
      } catch (e: unknown) {
        if ((e as { code?: string }).code === 'NOT_FOUND') return notFound(reply);
        throw e;
      }
    }
  );

  // Update resource fields
  app.patch(
    '/characters/:id/resources/:resourceId',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const { id, resourceId } = request.params as { id: string; resourceId: string };
      const parsed = resourceSchema.partial().safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ message: 'Invalid body' });

      try {
        const character = await withCharacter(id, userId, char => {
          const existing = char.resources.find(r => r.id === resourceId);
          if (!existing) return char;
          return upsertResource(char, { ...existing, ...parsed.data, id: resourceId } as Resource);
        });
        return { character };
      } catch (e: unknown) {
        if ((e as { code?: string }).code === 'NOT_FOUND') return notFound(reply);
        throw e;
      }
    }
  );

  // Spend / restore resource by delta (clamped to [0, max])
  app.patch(
    '/characters/:id/resources/:resourceId/spend',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const { id, resourceId } = request.params as { id: string; resourceId: string };
      const parsed = spendSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ message: 'Invalid body' });

      try {
        const character = await withCharacter(id, userId, char =>
          spendResource(char, resourceId, parsed.data.delta)
        );
        return { character };
      } catch (e: unknown) {
        if ((e as { code?: string }).code === 'NOT_FOUND') return notFound(reply);
        throw e;
      }
    }
  );

  // Long rest: reset all resources to max
  app.post(
    '/characters/:id/resources/reset',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const { id } = request.params as { id: string };

      try {
        const character = await withCharacter(id, userId, resetAllResources);
        return { character };
      } catch (e: unknown) {
        if ((e as { code?: string }).code === 'NOT_FOUND') return notFound(reply);
        throw e;
      }
    }
  );

  // Delete resource
  app.delete(
    '/characters/:id/resources/:resourceId',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const { id, resourceId } = request.params as { id: string; resourceId: string };

      try {
        const character = await withCharacter(id, userId, char =>
          removeResource(char, resourceId)
        );
        return { character };
      } catch (e: unknown) {
        if ((e as { code?: string }).code === 'NOT_FOUND') return notFound(reply);
        throw e;
      }
    }
  );
};
