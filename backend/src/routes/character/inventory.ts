import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  equipItem,
  unequipItem,
  upsertInventoryItem,
  removeInventoryItem,
  updateItemQuantity,
} from '../../../../game-logic/src/character/inventory.js';
import { withCharacter, notFound, getUserId } from './helpers.js';

const itemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['armor', 'weapon', 'ammunition', 'item']),
  equipped: z.boolean().default(false),
  weight: z.number().default(0),
  cost: z.number().default(0),
  description: z.string().default(''),
  quantity: z.number().int().min(0).optional(),
  itemClass: z.string().optional(),
  baseAC: z.number().optional(),
  dexModifier: z.boolean().optional(),
  maxDexModifier: z.number().nullable().optional(),
  limbACs: z.record(z.number()).optional(),
  weaponClass: z.enum(['melee', 'ranged']).optional(),
  damage: z.string().optional(),
  damageType: z.string().optional(),
  damageComponents: z.array(z.object({ damage: z.string(), type: z.string() })).optional(),
  ammunitionType: z.string().optional(),
  iconName: z.string().optional(),
  color: z.string().optional(),
});

const quantityDeltaSchema = z.object({ delta: z.number().int() });

export const inventoryRoutes: FastifyPluginAsync = async (app) => {
  // Add or update item
  app.post(
    '/characters/:id/inventory',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const { id } = request.params as { id: string };
      const parsed = itemSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ message: 'Invalid body' });

      try {
        const character = await withCharacter(id, userId, char =>
          upsertInventoryItem(char, parsed.data as Parameters<typeof upsertInventoryItem>[1])
        );
        return { character };
      } catch (e: unknown) {
        if ((e as { code?: string }).code === 'NOT_FOUND') return notFound(reply);
        throw e;
      }
    }
  );

  // Delete item
  app.delete(
    '/characters/:id/inventory/:itemId',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const { id, itemId } = request.params as { id: string; itemId: string };

      try {
        const character = await withCharacter(id, userId, char =>
          removeInventoryItem(char, itemId)
        );
        return { character };
      } catch (e: unknown) {
        if ((e as { code?: string }).code === 'NOT_FOUND') return notFound(reply);
        throw e;
      }
    }
  );

  // Update item (partial — replace entire item by id)
  app.patch(
    '/characters/:id/inventory/:itemId',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const { id, itemId } = request.params as { id: string; itemId: string };
      const parsed = itemSchema.partial().safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ message: 'Invalid body' });

      try {
        const character = await withCharacter(id, userId, char => {
          const existing = char.inventory.find(i => i.id === itemId);
          if (!existing) return char;
          return upsertInventoryItem(char, { ...existing, ...parsed.data, id: itemId } as Parameters<typeof upsertInventoryItem>[1]);
        });
        return { character };
      } catch (e: unknown) {
        if ((e as { code?: string }).code === 'NOT_FOUND') return notFound(reply);
        throw e;
      }
    }
  );

  // Equip item (game logic: AC recalc, weapon attack creation)
  app.post(
    '/characters/:id/inventory/:itemId/equip',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const { id, itemId } = request.params as { id: string; itemId: string };

      try {
        const character = await withCharacter(id, userId, char =>
          equipItem(char, itemId)
        );
        return { character };
      } catch (e: unknown) {
        if ((e as { code?: string }).code === 'NOT_FOUND') return notFound(reply);
        throw e;
      }
    }
  );

  // Unequip item (game logic: AC recalc, remove weapon attacks)
  app.post(
    '/characters/:id/inventory/:itemId/unequip',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const { id, itemId } = request.params as { id: string; itemId: string };

      try {
        const character = await withCharacter(id, userId, char =>
          unequipItem(char, itemId)
        );
        return { character };
      } catch (e: unknown) {
        if ((e as { code?: string }).code === 'NOT_FOUND') return notFound(reply);
        throw e;
      }
    }
  );

  // Update item quantity by delta
  app.patch(
    '/characters/:id/inventory/:itemId/quantity',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = getUserId(request);
      const { id, itemId } = request.params as { id: string; itemId: string };
      const parsed = quantityDeltaSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ message: 'Invalid body' });

      try {
        const character = await withCharacter(id, userId, char =>
          updateItemQuantity(char, itemId, parsed.data.delta)
        );
        return { character };
      } catch (e: unknown) {
        if ((e as { code?: string }).code === 'NOT_FOUND') return notFound(reply);
        throw e;
      }
    }
  );
};
