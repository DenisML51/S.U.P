import type { Character, Resource } from '@itd/schema';

export interface ResourceChange {
  character: Character;
  resource: Resource;
  /** What actually changed after clamping to 0..max; 0 when the resource was already at a bound. */
  applied: number;
}

/** Spends (negative delta) or restores (positive delta) a resource within 0..max. */
export function changeResource(character: Character, resourceId: string, delta: number): ResourceChange | null {
  const resource = character.resources.find((r) => r.id === resourceId);
  if (!resource) return null;

  const current = Math.min(resource.max, Math.max(0, resource.current + delta));
  const updated = { ...resource, current };
  return {
    character: { ...character, resources: character.resources.map((r) => (r.id === resourceId ? updated : r)) },
    resource: updated,
    applied: current - resource.current,
  };
}

// ------------------------------------------------------------------------------------------------
// Spell slots and points (Font of Magic)
// ------------------------------------------------------------------------------------------------

/** Points a spell slot of level 1–5 costs to create: 2, 3, 5, 6, 7. */
export const SLOT_CREATION_COST = [2, 3, 5, 6, 7];

const slotOf = (character: Pick<Character, 'resources'>, level: number) =>
  character.resources.find((r) => r.spellSlotLevel === level && r.id.startsWith('slot-'));

/**
 * Slot levels a pool turns into or out of, with what stands in the way of each: a spent slot
 * gives as many points as its level; a slot is made for its cost, up to level 5 and only of a
 * level the hero already has slots of, and never above its maximum.
 */
export function slotConversions(
  character: Pick<Character, 'resources'>,
  poolId: string,
  direction: 'slotToPoints' | 'pointsToSlot',
): { level: number; amount: number; blocked: string | null }[] {
  const pool = character.resources.find((r) => r.id === poolId);
  const levels = character.resources
    .filter((r) => r.spellSlotLevel !== undefined && r.id.startsWith('slot-'))
    .map((r) => r.spellSlotLevel!)
    .sort((a, b) => a - b);
  return levels
    .filter((level) => direction === 'slotToPoints' || level <= SLOT_CREATION_COST.length)
    .map((level) => {
      const slot = slotOf(character, level)!;
      if (direction === 'slotToPoints') {
        const blocked = slot.current < 1 ? 'Нет свободной ячейки' : pool && pool.current >= pool.max ? 'Очки уже полны' : null;
        return { level, amount: level, blocked };
      }
      const cost = SLOT_CREATION_COST[level - 1]!;
      const blocked = slot.current >= slot.max ? 'Ячейки полны' : (pool?.current ?? 0) < cost ? `Нужно очков: ${cost}` : null;
      return { level, amount: cost, blocked };
    });
}

/** A spell slot turned into points of a pool, or points into a slot (Font of Magic). */
export function convertSlot(
  character: Character,
  poolId: string,
  direction: 'slotToPoints' | 'pointsToSlot',
  level: number,
): Character | null {
  const option = slotConversions(character, poolId, direction).find((o) => o.level === level);
  const slot = slotOf(character, level);
  if (!option || option.blocked || !slot) return null;
  const [slotDelta, poolDelta] = direction === 'slotToPoints' ? [-1, option.amount] : [1, -option.amount];
  const spent = changeResource(character, slot.id, slotDelta)?.character;
  return spent ? (changeResource(spent, poolId, poolDelta)?.character ?? null) : null;
}
