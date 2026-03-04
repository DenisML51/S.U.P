import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { withCharacter, notFound, getUserId } from './helpers.js';
import type { Character, Spell } from '../../../../game-logic/src/types.js';

const spellSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  level: z.number().int().min(0).max(9),
  school: z.string().default(''),
  castingTime: z.string().default(''),
  actionType: z.enum(['action', 'bonus', 'reaction']).default('action'),
  range: z.string().default(''),
  components: z.string().default(''),
  duration: z.string().default(''),
  description: z.string().default(''),
  effect: z.string().default(''),
  damage: z.string().optional(),
  damageType: z.string().optional(),
  damageComponents: z.array(z.object({ damage: z.string(), type: z.string() })).optional(),
  prepared: z.boolean().default(false),
  resourceId: z.string().optional(),
  iconName: z.string().optional(),
  color: z.string().optional(),
});

export const spellRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/characters/:id/spells',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const { id } = request.params as { id: string };
      const parsed = spellSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ message: 'Invalid body' });

      try {
        const character = await withCharacter(id, userId, (char: Character) => {
          const spell = parsed.data as Spell;
          const idx = char.spells.findIndex(s => s.id === spell.id);
          const spells = idx >= 0
            ? char.spells.map((s, i) => (i === idx ? spell : s))
            : [...char.spells, spell];
          return { ...char, spells };
        });
        return { character };
      } catch (e: unknown) {
        if ((e as { code?: string }).code === 'NOT_FOUND') return notFound(reply);
        throw e;
      }
    }
  );

  app.patch(
    '/characters/:id/spells/:spellId',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const { id, spellId } = request.params as { id: string; spellId: string };
      const parsed = spellSchema.partial().safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ message: 'Invalid body' });

      try {
        const character = await withCharacter(id, userId, (char: Character) => ({
          ...char,
          spells: char.spells.map(s =>
            s.id === spellId ? { ...s, ...parsed.data } : s
          ),
        }));
        return { character };
      } catch (e: unknown) {
        if ((e as { code?: string }).code === 'NOT_FOUND') return notFound(reply);
        throw e;
      }
    }
  );

  // Toggle prepared status
  app.patch(
    '/characters/:id/spells/:spellId/prepare',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const { id, spellId } = request.params as { id: string; spellId: string };

      try {
        const character = await withCharacter(id, userId, (char: Character) => ({
          ...char,
          spells: char.spells.map(s =>
            s.id === spellId ? { ...s, prepared: !s.prepared } : s
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
    '/characters/:id/spells/:spellId',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const { id, spellId } = request.params as { id: string; spellId: string };

      try {
        const character = await withCharacter(id, userId, (char: Character) => ({
          ...char,
          spells: char.spells.filter(s => s.id !== spellId),
        }));
        return { character };
      } catch (e: unknown) {
        if ((e as { code?: string }).code === 'NOT_FOUND') return notFound(reply);
        throw e;
      }
    }
  );
};
