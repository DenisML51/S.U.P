import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { applyAttributeChange } from '../../../../game-logic/src/character/experience.js';
import { withCharacter, notFound, getUserId } from './helpers.js';
import type { Character, Skill } from '../../../../game-logic/src/types.js';

const attributeSchema = z.object({
  attribute: z.string().min(1),
  value: z.number().int().min(1).max(30),
  bonus: z.number().int().default(0),
});

const skillSchema = z.object({
  skillId: z.string().min(1),
  proficient: z.boolean(),
  expertise: z.boolean().optional(),
});

const savingThrowSchema = z.object({
  attribute: z.string().min(1),
});

const conditionSchema = z.object({
  conditionId: z.string().min(1),
  active: z.boolean(),
});

const currencySchema = z.object({
  copper: z.number().int().min(0).optional(),
  silver: z.number().int().min(0).optional(),
  gold: z.number().int().min(0).optional(),
});

export const attributeRoutes: FastifyPluginAsync = async (app) => {
  // Update single attribute value
  app.patch(
    '/characters/:id/attributes',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const { id } = request.params as { id: string };
      const parsed = attributeSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ message: 'Invalid body' });

      try {
        const character = await withCharacter(id, userId, char =>
          applyAttributeChange(char, parsed.data.attribute, parsed.data.value, parsed.data.bonus)
        );
        return { character };
      } catch (e: unknown) {
        if ((e as { code?: string }).code === 'NOT_FOUND') return notFound(reply);
        throw e;
      }
    }
  );

  // Toggle skill proficiency / expertise
  app.patch(
    '/characters/:id/skills',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const { id } = request.params as { id: string };
      const parsed = skillSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ message: 'Invalid body' });

      try {
        const character = await withCharacter(id, userId, (char: Character) => {
          const skills: Skill[] = char.skills.map(s =>
            s.id === parsed.data.skillId
              ? {
                  ...s,
                  proficient: parsed.data.proficient,
                  expertise: parsed.data.expertise ?? (parsed.data.proficient ? s.expertise : false),
                }
              : s
          );
          return { ...char, skills };
        });
        return { character };
      } catch (e: unknown) {
        if ((e as { code?: string }).code === 'NOT_FOUND') return notFound(reply);
        throw e;
      }
    }
  );

  // Toggle saving throw proficiency
  app.patch(
    '/characters/:id/saving-throws',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const { id } = request.params as { id: string };
      const parsed = savingThrowSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ message: 'Invalid body' });

      try {
        const character = await withCharacter(id, userId, (char: Character) => {
          const current = char.savingThrowProficiencies ?? [];
          const next = current.includes(parsed.data.attribute)
            ? current.filter(a => a !== parsed.data.attribute)
            : [...current, parsed.data.attribute];
          return { ...char, savingThrowProficiencies: next };
        });
        return { character };
      } catch (e: unknown) {
        if ((e as { code?: string }).code === 'NOT_FOUND') return notFound(reply);
        throw e;
      }
    }
  );

  // Toggle condition
  app.patch(
    '/characters/:id/conditions',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const { id } = request.params as { id: string };
      const parsed = conditionSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ message: 'Invalid body' });

      try {
        const character = await withCharacter(id, userId, (char: Character) => {
          const current = char.conditions ?? [];
          const next = parsed.data.active
            ? [...new Set([...current, parsed.data.conditionId])]
            : current.filter(c => c !== parsed.data.conditionId);
          return { ...char, conditions: next };
        });
        return { character };
      } catch (e: unknown) {
        if ((e as { code?: string }).code === 'NOT_FOUND') return notFound(reply);
        throw e;
      }
    }
  );

  // Update currency
  app.patch(
    '/characters/:id/currency',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const { id } = request.params as { id: string };
      const parsed = currencySchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ message: 'Invalid body' });

      try {
        const character = await withCharacter(id, userId, (char: Character) => ({
          ...char,
          currency: {
            copper: parsed.data.copper ?? char.currency.copper,
            silver: parsed.data.silver ?? char.currency.silver,
            gold: parsed.data.gold ?? char.currency.gold,
          },
        }));
        return { character };
      } catch (e: unknown) {
        if ((e as { code?: string }).code === 'NOT_FOUND') return notFound(reply);
        throw e;
      }
    }
  );
};
