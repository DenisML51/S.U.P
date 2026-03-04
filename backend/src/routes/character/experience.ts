import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { applyExperience } from '../../../../game-logic/src/character/experience.js';
import { withCharacter, notFound, getUserId } from './helpers.js';

const experienceSchema = z.object({
  experience: z.number().int().min(0),
});

export const experienceRoutes: FastifyPluginAsync = async (app) => {
  app.patch(
    '/characters/:id/experience',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const { id } = request.params as { id: string };
      const parsed = experienceSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ message: 'Invalid body' });

      try {
        const character = await withCharacter(id, userId, char =>
          applyExperience(char, parsed.data.experience)
        );
        return { character };
      } catch (e: unknown) {
        if ((e as { code?: string }).code === 'NOT_FOUND') return notFound(reply);
        throw e;
      }
    }
  );
};
