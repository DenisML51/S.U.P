import { describe, expect, it } from 'vitest';
import type { Spell } from '@itd/schema';
import { maxPrepared, preparationBlocker, preparedCount, setMaxPrepared, toggleKnownSchool, togglePrepared } from '../src';
import { makeCharacter } from './helpers';

const spell = (id: string, level: number, school: string, prepared = false): Spell => ({
  id,
  name: id,
  level,
  school,
  castingTime: '',
  actionType: 'action',
  range: '',
  components: '',
  duration: '',
  description: '',
  effect: '',
  prepared,
});

describe('spell preparation', () => {
  const caster = makeCharacter({
    knownSchools: ['Воплощение'],
    maxPreparedSpells: { '1': 1 },
    spells: [spell('a', 1, 'Воплощение', true), spell('b', 1, 'Воплощение'), spell('c', 2, 'Иллюзия'), spell('d', 3, 'Воплощение')],
  });

  it('counts prepared spells per level and reads limits, unlimited by default', () => {
    expect(preparedCount(caster, 1)).toBe(1);
    expect(maxPrepared(caster, 1)).toBe(1);
    expect(maxPrepared(caster, 5)).toBe(99);
  });

  it('refuses beyond the level limit and outside known schools', () => {
    expect(preparationBlocker(caster, caster.spells[1]!)).toMatch(/максимум/);
    expect(preparationBlocker(caster, caster.spells[2]!)).toMatch(/Иллюзия/);
    expect(preparationBlocker(caster, caster.spells[3]!)).toBeNull();
    expect(togglePrepared(caster, 'b')).toBe(caster);
  });

  it('always allows unpreparing', () => {
    expect(togglePrepared(caster, 'a').spells[0]!.prepared).toBe(false);
  });

  it('treats an empty list of schools as no restriction', () => {
    const anySchool = makeCharacter({ knownSchools: [], spells: [spell('x', 2, 'Некромантия')] });
    expect(togglePrepared(anySchool, 'x').spells[0]!.prepared).toBe(true);
  });

  it('edits limits and schools', () => {
    expect(setMaxPrepared(caster, 1, 3).maxPreparedSpells['1']).toBe(3);
    expect(toggleKnownSchool(caster, 'Иллюзия').knownSchools).toEqual(['Воплощение', 'Иллюзия']);
    expect(toggleKnownSchool(caster, 'Воплощение').knownSchools).toEqual([]);
  });
});
