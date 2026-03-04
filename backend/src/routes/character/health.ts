import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { applyHealthUpdate, applySanityUpdate, applyLimbUpdate } from '../../../../game-logic/src/character/health.js';
import { withCharacter, notFound, getUserId } from './helpers.js';

const healthSchema = z.object({
  currentHP: z.number(),
  maxHP: z.number().min(0),
  tempHP: z.number().min(0),
  maxHPBonus: z.number().min(0),
});

const sanitySchema = z.object({
  sanity: z.number().min(0).max(100),
});

const limbSchema = z.object({
  field: z.enum(['currentHP', 'maxHP', 'ac']),
  value: z.number(),
});

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.patch(
    '/characters/:id/health',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const { id } = request.params as { id: string };
      const parsed = healthSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ message: 'Invalid body' });

      try {
        const character = await withCharacter(id, userId, char =>
          applyHealthUpdate(char, parsed.data)
        );
        return { character };
      } catch (e: unknown) {
        if ((e as { code?: string }).code === 'NOT_FOUND') return notFound(reply);
        throw e;
      }
    }
  );

  app.patch(
    '/characters/:id/sanity',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const { id } = request.params as { id: string };
      const parsed = sanitySchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ message: 'Invalid body' });

      try {
        const character = await withCharacter(id, userId, char =>
          applySanityUpdate(char, parsed.data.sanity)
        );
        return { character };
      } catch (e: unknown) {
        if ((e as { code?: string }).code === 'NOT_FOUND') return notFound(reply);
        throw e;
      }
    }
  );

  app.patch(
    '/characters/:id/limbs/:limbId',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const { id, limbId } = request.params as { id: string; limbId: string };
      const parsed = limbSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ message: 'Invalid body' });

      try {
        const character = await withCharacter(id, userId, char =>
          applyLimbUpdate(char, limbId, parsed.data.field, parsed.data.value)
        );
        return { character };
      } catch (e: unknown) {
        if ((e as { code?: string }).code === 'NOT_FOUND') return notFound(reply);
        throw e;
      }
    }
  );
};
