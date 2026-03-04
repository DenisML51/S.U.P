import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { withCharacter, notFound, getUserId } from './helpers.js';
import type { Character, Trait } from '../../../../game-logic/src/types.js';

const traitSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(''),
});

export const traitRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/characters/:id/traits',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const { id } = request.params as { id: string };
      const parsed = traitSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ message: 'Invalid body' });

      try {
        const character = await withCharacter(id, userId, (char: Character) => {
          const trait = parsed.data as Trait;
          const current = char.traits ?? [];
          const idx = current.findIndex(t => t.id === trait.id);
          const traits = idx >= 0
            ? current.map((t, i) => (i === idx ? trait : t))
            : [...current, trait];
          return { ...char, traits };
        });
        return { character };
      } catch (e: unknown) {
        if ((e as { code?: string }).code === 'NOT_FOUND') return notFound(reply);
        throw e;
      }
    }
  );

  app.patch(
    '/characters/:id/traits/:traitId',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const { id, traitId } = request.params as { id: string; traitId: string };
      const parsed = traitSchema.partial().safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ message: 'Invalid body' });

      try {
        const character = await withCharacter(id, userId, (char: Character) => ({
          ...char,
          traits: (char.traits ?? []).map(t =>
            t.id === traitId ? { ...t, ...parsed.data } : t
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
    '/characters/:id/traits/:traitId',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const { id, traitId } = request.params as { id: string; traitId: string };

      try {
        const character = await withCharacter(id, userId, (char: Character) => ({
          ...char,
          traits: (char.traits ?? []).filter(t => t.id !== traitId),
        }));
        return { character };
      } catch (e: unknown) {
        if ((e as { code?: string }).code === 'NOT_FOUND') return notFound(reply);
        throw e;
      }
    }
  );
};
