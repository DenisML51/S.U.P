import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { withCharacter, notFound, getUserId } from './helpers.js';
import type { Character } from '../../../../game-logic/src/types.js';

// Allowed scalar/text fields that can be updated generically.
// Structured/computed fields must use their dedicated endpoints.
const ALLOWED_FIELDS = new Set([
  'name', 'race', 'subrace', 'class', 'subclass', 'alignment', 'avatar',
  'speed', 'initiativeBonus', 'armorClass', 'tempHP', 'maxHPBonus',
  'languagesAndProficiencies', 'appearance', 'backstory', 'alliesAndOrganizations',
  'personalityTraits', 'ideals', 'bonds', 'flaws',
  'inventoryNotes', 'attacksNotes', 'equipmentNotes', 'abilitiesNotes',
  'spellsNotes', 'spellcastingDifficultyName', 'spellcastingDifficultyValue',
  'knownSchools', 'maxPreparedSpells',
  'resistances',
  'spentActions', 'actionLimits',
]);

const fieldsSchema = z.object({
  updates: z.record(z.unknown()),
});

export const fieldsRoutes: FastifyPluginAsync = async (app) => {
  app.patch(
    '/characters/:id/fields',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const { id } = request.params as { id: string };
      const parsed = fieldsSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ message: 'Invalid body' });

      const updates = parsed.data.updates;

      // Validate only allowed fields are being set
      const invalidKeys = Object.keys(updates).filter(k => !ALLOWED_FIELDS.has(k));
      if (invalidKeys.length > 0) {
        return reply.code(400).send({ message: `Disallowed fields: ${invalidKeys.join(', ')}` });
      }

      try {
        const character = await withCharacter(id, userId, (char: Character) => ({
          ...char,
          ...updates,
        } as Character));
        return { character };
      } catch (e: unknown) {
        if ((e as { code?: string }).code === 'NOT_FOUND') return notFound(reply);
        throw e;
      }
    }
  );
};
