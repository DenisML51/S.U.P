import { describe, expect, it } from 'vitest';
import { HISTORY_LIMIT, deepEqual, mergeCharacters, revertCharacter, type InventoryItem } from '../src';
import { makeCharacter } from './fixtures';

const item = (id: string, patch: Partial<InventoryItem> = {}): InventoryItem => ({
  id,
  name: id,
  type: 'item',
  equipped: false,
  weight: 0,
  cost: 0,
  description: '',
  ...patch,
});

const entry = (id: string, timestamp: number) => ({ id, timestamp, message: id, type: 'other' as const });

describe('deepEqual', () => {
  it('compares structurally', () => {
    expect(deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toBe(true);
    expect(deepEqual({ a: 1 }, { a: 1, b: undefined })).toBe(false);
    expect(deepEqual([1, 2], [2, 1])).toBe(false);
    expect(deepEqual(null, {})).toBe(false);
  });
});

describe('mergeCharacters', () => {
  const base = makeCharacter({ currentHP: 20, maxHP: 20, sanity: 50 });

  it('takes non-overlapping edits from both sides', () => {
    const local = { ...base, currentHP: 12 };
    const remote = { ...base, sanity: 40 };

    const { merged, conflicts } = mergeCharacters(base, local, remote);

    expect(merged.currentHP).toBe(12);
    expect(merged.sanity).toBe(40);
    expect(conflicts).toEqual([]);
  });

  it('lets the local edit win a true conflict and reports it', () => {
    const { merged, conflicts } = mergeCharacters(base, { ...base, currentHP: 5 }, { ...base, currentHP: 15 });

    expect(merged.currentHP).toBe(5);
    expect(conflicts).toEqual(['currentHP']);
  });

  it('does not report a conflict when both sides made the same edit', () => {
    const { conflicts } = mergeCharacters(base, { ...base, currentHP: 5 }, { ...base, currentHP: 5 });
    expect(conflicts).toEqual([]);
  });

  it('merges nested objects key by key', () => {
    const local = { ...base, attributes: { ...base.attributes, strength: 18 } };
    const remote = { ...base, attributes: { ...base.attributes, wisdom: 16 } };

    const { merged } = mergeCharacters(base, local, remote);

    expect(merged.attributes).toMatchObject({ strength: 18, wisdom: 16, dexterity: 14 });
  });

  describe('entity lists', () => {
    const withItems = { ...base, inventory: [item('rope'), item('torch'), item('ration', { quantity: 3 })] };

    it('keeps items added on both devices', () => {
      const local = { ...withItems, inventory: [...withItems.inventory, item('lantern')] };
      const remote = { ...withItems, inventory: [...withItems.inventory, item('map')] };

      const { merged } = mergeCharacters(withItems, local, remote);

      expect(merged.inventory.map((i) => i.id)).toEqual(['rope', 'torch', 'ration', 'map', 'lantern']);
    });

    it('merges edits to different items', () => {
      const local = { ...withItems, inventory: withItems.inventory.map((i) => (i.id === 'rope' ? { ...i, equipped: true } : i)) };
      const remote = {
        ...withItems,
        inventory: withItems.inventory.map((i) => (i.id === 'ration' ? { ...i, quantity: 2 } : i)),
      };

      const { merged, conflicts } = mergeCharacters(withItems, local, remote);

      expect(merged.inventory.find((i) => i.id === 'rope')?.equipped).toBe(true);
      expect(merged.inventory.find((i) => i.id === 'ration')?.quantity).toBe(2);
      expect(conflicts).toEqual([]);
    });

    it('applies a deletion of an untouched item', () => {
      const local = { ...withItems, inventory: withItems.inventory.filter((i) => i.id !== 'torch') };
      const remote = { ...withItems, inventory: [...withItems.inventory, item('map')] };

      const { merged } = mergeCharacters(withItems, local, remote);

      expect(merged.inventory.map((i) => i.id)).toEqual(['rope', 'ration', 'map']);
    });

    it('keeps an item that was edited on one device and deleted on the other', () => {
      const local = { ...withItems, inventory: withItems.inventory.filter((i) => i.id !== 'ration') };
      const remote = {
        ...withItems,
        inventory: withItems.inventory.map((i) => (i.id === 'ration' ? { ...i, quantity: 10 } : i)),
      };

      const { merged, conflicts } = mergeCharacters(withItems, local, remote);

      expect(merged.inventory.find((i) => i.id === 'ration')?.quantity).toBe(10);
      expect(conflicts).toEqual([]);
    });

    it('resolves a field conflict inside one item in favour of the local edit', () => {
      const edit = (quantity: number) => ({
        ...withItems,
        inventory: withItems.inventory.map((i) => (i.id === 'ration' ? { ...i, quantity } : i)),
      });

      const { merged, conflicts } = mergeCharacters(withItems, edit(1), edit(5));

      expect(merged.inventory.find((i) => i.id === 'ration')?.quantity).toBe(1);
      expect(conflicts).toEqual(['inventory[ration].quantity']);
    });
  });

  describe('string-set fields', () => {
    it('keeps conditions added on both devices', () => {
      const start = { ...base, conditions: ['Отравлен'] };
      const local = { ...start, conditions: ['Отравлен', 'Испуган'] };
      const remote = { ...start, conditions: ['Отравлен', 'Ошеломлён'] };

      const { merged, conflicts } = mergeCharacters(start, local, remote);

      expect([...merged.conditions].sort()).toEqual(['Испуган', 'Отравлен', 'Ошеломлён']);
      expect(conflicts).toEqual([]);
    });

    it('honours a condition removed on one device without resurrecting it', () => {
      const start = { ...base, conditions: ['Отравлен', 'Испуган'] };
      const local = { ...start, conditions: ['Отравлен'] };
      const remote = { ...start, conditions: ['Отравлен', 'Испуган', 'Ошеломлён'] };

      const { merged } = mergeCharacters(start, local, remote);

      expect([...merged.conditions].sort()).toEqual(['Отравлен', 'Ошеломлён']);
    });
  });

  it('unions history from both devices, newest first and capped', () => {
    const shared = Array.from({ length: HISTORY_LIMIT }, (_, i) => entry(`old_${i}`, 1_000 - i));
    const local = { ...base, history: [entry('local', 3_000), ...shared] };
    const remote = { ...base, history: [entry('remote', 2_000), ...shared] };

    const { merged } = mergeCharacters({ ...base, history: shared }, local, remote);

    expect(merged.history).toHaveLength(HISTORY_LIMIT);
    expect(merged.history.slice(0, 3).map((e) => e.id)).toEqual(['local', 'remote', 'old_0']);
  });

  it('merges without a common ancestor by keeping everything from both sides', () => {
    const local = { ...base, currentHP: 1, inventory: [item('a')] };
    const remote = { ...base, currentHP: 2, inventory: [item('b')] };

    const { merged, conflicts } = mergeCharacters(null, local, remote);

    expect(merged.currentHP).toBe(1);
    expect(merged.inventory.map((i) => i.id)).toEqual(['b', 'a']);
    expect(conflicts).toContain('currentHP');
  });

  it('removes a field deleted on one side and untouched on the other', () => {
    const withAvatar = { ...base, avatar: 'data:image/png;base64,AAA' };
    const { avatar: _avatar, ...local } = withAvatar;

    const { merged } = mergeCharacters(withAvatar, local, { ...withAvatar, sanity: 1 });

    expect(merged.avatar).toBeUndefined();
    expect('avatar' in merged).toBe(false);
    expect(merged.sanity).toBe(1);
  });
});

describe('revertCharacter', () => {
  const before = makeCharacter({ currentHP: 20, sanity: 50, history: [entry('old', 1)] });
  const after = { ...before, currentHP: 12, sanity: 45, history: [entry('hit', 2), entry('old', 1)] };

  it('takes the character back to how it was before the edits', () => {
    const reverted = revertCharacter(before, after, after, new Set(['hit']));
    expect(reverted).toMatchObject({ currentHP: 20, sanity: 50 });
    expect(reverted.history.map((e) => e.id)).toEqual(['old']);
  });

  it('keeps what changed since on another device', () => {
    const current = { ...after, sanity: 30, level: 2, history: [entry('remote', 3), ...after.history] };
    const reverted = revertCharacter(before, after, current, new Set(['hit']));
    // Hit points go back; sanity, edited by both, keeps the other device's value; the level stays.
    expect(reverted).toMatchObject({ currentHP: 20, sanity: 30, level: 2 });
    expect(reverted.history.map((e) => e.id)).toEqual(['remote', 'old']);
  });

  it('removes a field the edits added', () => {
    const concentrating = { ...before, concentratingOn: { kind: 'spell' as const, id: 's', name: 'Щит', startedAt: 1 } };
    expect('concentratingOn' in revertCharacter(before, concentrating, concentrating)).toBe(false);
  });
});
