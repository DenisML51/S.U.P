import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { withCharacter, notFound, getUserId } from './helpers.js';
import type { Character, Attack } from '../../../../game-logic/src/types.js';

const attackSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  damage: z.string().default('1d6'),
  damageType: z.string().default('physical'),
  damageComponents: z.array(z.object({ damage: z.string(), type: z.string() })).optional(),
  hitBonus: z.number().int().default(0),
  actionType: z.enum(['action', 'bonus', 'reaction']).default('action'),
  weaponId: z.string().optional(),
  usesAmmunition: z.boolean().optional(),
  ammunitionCost: z.number().int().optional(),
  attribute: z.string().optional(),
  iconName: z.string().optional(),
  color: z.string().optional(),
});

export const attackRoutes: FastifyPluginAsync = async (app) => {
  // Create or update attack
  app.post(
    '/characters/:id/attacks',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const { id } = request.params as { id: string };
      const parsed = attackSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ message: 'Invalid body' });

      try {
        const character = await withCharacter(id, userId, (char: Character) => {
          const attack = parsed.data as Attack;
          const idx = char.attacks.findIndex(a => a.id === attack.id);
          const attacks = idx >= 0
            ? char.attacks.map((a, i) => (i === idx ? attack : a))
            : [...char.attacks, attack];
          return { ...char, attacks };
        });
        return { character };
      } catch (e: unknown) {
        if ((e as { code?: string }).code === 'NOT_FOUND') return notFound(reply);
        throw e;
      }
    }
  );

  // Update attack
  app.patch(
    '/characters/:id/attacks/:attackId',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const { id, attackId } = request.params as { id: string; attackId: string };
      const parsed = attackSchema.partial().safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ message: 'Invalid body' });

      try {
        const character = await withCharacter(id, userId, (char: Character) => {
          const attacks = char.attacks.map(a =>
            a.id === attackId ? { ...a, ...parsed.data } : a
          );
          return { ...char, attacks };
        });
        return { character };
      } catch (e: unknown) {
        if ((e as { code?: string }).code === 'NOT_FOUND') return notFound(reply);
        throw e;
      }
    }
  );

  // Delete attack
  app.delete(
    '/characters/:id/attacks/:attackId',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const { id, attackId } = request.params as { id: string; attackId: string };

      try {
        const character = await withCharacter(id, userId, (char: Character) => ({
          ...char,
          attacks: char.attacks.filter(a => a.id !== attackId),
        }));
        return { character };
      } catch (e: unknown) {
        if ((e as { code?: string }).code === 'NOT_FOUND') return notFound(reply);
        throw e;
      }
    }
  );
};
