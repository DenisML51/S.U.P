import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../prisma.js';
import { encryptJson } from '../../utils/crypto.js';
import { buildCharacter } from '../../../../game-logic/src/character/creation.js';
import { getUserId } from './helpers.js';

const skillSchema = z.object({
  id: z.string(),
  name: z.string(),
  attribute: z.string(),
  proficient: z.boolean(),
  expertise: z.boolean(),
});

const buildSchema = z.object({
  name: z.string().min(1).max(120),
  race: z.string().min(1).max(80),
  subrace: z.string().optional(),
  class: z.string().min(1).max(80),
  subclass: z.string().optional(),
  avatar: z.string().optional(),
  concept: z.string().optional(),
  speed: z.number().int().min(0).default(30),
  attributes: z.record(z.number().int().min(1).max(30)),
  skills: z.array(skillSchema),
  savingThrowProficiencies: z.array(z.string()),
  languagesAndProficiencies: z.string().default(''),
});

const generateId = () => `char_${randomUUID().replace(/-/g, '')}`;

export const buildRoutes: FastifyPluginAsync = async (app) => {
  /**
   * POST /characters/build
   * Build a character from the creation form data, persist it, and return the saved character.
   * This replaces the frontend's buildCharacter() + createCharacter() flow.
   */
  app.post(
    '/characters/build',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const parsed = buildSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ message: 'Invalid build data', errors: parsed.error.issues });
      }

      const builtData = buildCharacter(parsed.data);
      const id = generateId();
      const character = { ...builtData, id };

      const encrypted = encryptJson(character);

      const created = await prisma.character.create({
        data: {
          id,
          userId,
          name: character.name,
          class: character.class,
          level: character.level,
          ...encrypted,
        },
        select: { id: true },
      });

      return reply.code(201).send({ character: { ...character, id: created.id } });
    }
  );
};
