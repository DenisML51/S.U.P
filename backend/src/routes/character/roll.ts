import type { FastifyPluginAsync } from 'fastify';
import { findCharacterRow, decryptCharacter, notFound, getUserId } from './helpers.js';
import { rollInitiative } from '../../../../game-logic/src/character/roll.js';

export const rollRoutes: FastifyPluginAsync = async (app) => {
  // Roll initiative server-side (read-only, no save)
  app.post(
    '/characters/:id/roll-initiative',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const { id } = request.params as { id: string };

      const row = await findCharacterRow(id, userId);
      if (!row) return notFound(reply);

      const character = decryptCharacter(row);
      const result = rollInitiative(character);
      return { result };
    }
  );
};
