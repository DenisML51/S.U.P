import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { withCharacter, notFound, getUserId } from './helpers.js';

const limbSchema = z.object({
  id: z.string(),
  name: z.string(),
  currentHP: z.number(),
  maxHP: z.number(),
  ac: z.number(),
});

const resistanceSchema = z.object({
  id: z.string(),
  type: z.string(),
  level: z.enum(['resistance', 'vulnerability', 'immunity', 'none']),
});

const acBodySchema = z.object({
  armorClass: z.number().int().min(0),
  limbs: z.array(limbSchema),
  resistances: z.array(resistanceSchema),
});

export const armorClassRoutes: FastifyPluginAsync = async (app) => {
  app.patch(
    '/characters/:id/armor-class',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const { id } = request.params as { id: string };
      const parsed = acBodySchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ message: 'Invalid body' });

      try {
        const character = await withCharacter(id, userId, char => ({
          ...char,
          armorClass: parsed.data.armorClass,
          limbs: parsed.data.limbs,
          resistances: parsed.data.resistances,
        }));
        return { character };
      } catch (e: unknown) {
        if ((e as { code?: string }).code === 'NOT_FOUND') return notFound(reply);
        throw e;
      }
    }
  );
};
