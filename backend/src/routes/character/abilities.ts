import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { withCharacter, notFound, getUserId } from './helpers.js';
import type { Character, Ability } from '../../../../game-logic/src/types.js';

const abilitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(''),
  actionType: z.enum(['action', 'bonus', 'reaction']).default('action'),
  resourceId: z.string().optional(),
  resourceCost: z.number().int().optional(),
  effect: z.string().default(''),
  damage: z.string().optional(),
  damageType: z.string().optional(),
  damageComponents: z.array(z.object({ damage: z.string(), type: z.string() })).optional(),
  iconName: z.string().optional(),
  color: z.string().optional(),
});

export const abilityRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/characters/:id/abilities',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const { id } = request.params as { id: string };
      const parsed = abilitySchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ message: 'Invalid body' });

      try {
        const character = await withCharacter(id, userId, (char: Character) => {
          const ability = parsed.data as Ability;
          const idx = char.abilities.findIndex(a => a.id === ability.id);
          const abilities = idx >= 0
            ? char.abilities.map((a, i) => (i === idx ? ability : a))
            : [...char.abilities, ability];
          return { ...char, abilities };
        });
        return { character };
      } catch (e: unknown) {
        if ((e as { code?: string }).code === 'NOT_FOUND') return notFound(reply);
        throw e;
      }
    }
  );

  app.patch(
    '/characters/:id/abilities/:abilityId',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const { id, abilityId } = request.params as { id: string; abilityId: string };
      const parsed = abilitySchema.partial().safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ message: 'Invalid body' });

      try {
        const character = await withCharacter(id, userId, (char: Character) => ({
          ...char,
          abilities: char.abilities.map(a =>
            a.id === abilityId ? { ...a, ...parsed.data } : a
          ),
        }));
        return { character };
      } catch (e: unknown) {
        if ((e as { code?: string }).code === 'NOT_FOUND') return notFound(reply);
        throw e;
      }
    }
  );

  app.delete(
    '/characters/:id/abilities/:abilityId',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const { id, abilityId } = request.params as { id: string; abilityId: string };

      try {
        const character = await withCharacter(id, userId, (char: Character) => ({
          ...char,
          abilities: char.abilities.filter(a => a.id !== abilityId),
        }));
        return { character };
      } catch (e: unknown) {
        if ((e as { code?: string }).code === 'NOT_FOUND') return notFound(reply);
        throw e;
      }
    }
  );
};
