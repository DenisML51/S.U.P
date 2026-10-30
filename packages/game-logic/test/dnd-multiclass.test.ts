import { describe, expect, it } from 'vitest';
import { ATTRIBUTES_LIST } from '../src/content/attributes';
import { DND } from '../src/dnd';

const attributes = new Set<string>(ATTRIBUTES_LIST.map((a) => a.id));
const classOf = (id: string) => DND.classes.find((c) => c.id === id)!;

describe('multiclass content', () => {
  it('gives every class a requirement of real scores', () => {
    for (const classDef of DND.classes) {
      expect(classDef.multiclass.requires.length, classDef.id).toBeGreaterThan(0);
      for (const group of classDef.multiclass.requires) {
        expect(group.length, classDef.id).toBeGreaterThan(0);
        for (const attribute of group) expect(attributes.has(attribute), `${classDef.id}: ${attribute}`).toBe(true);
      }
    }
  });

  it('follows the 2024 requirements: "or" between groups, "and" within one', () => {
    expect(classOf('fighter').multiclass.requires).toEqual([['strength'], ['dexterity']]);
    expect(classOf('monk').multiclass.requires).toEqual([['dexterity', 'wisdom']]);
    expect(classOf('paladin').multiclass.requires).toEqual([['strength', 'charisma']]);
    expect(classOf('ranger').multiclass.requires).toEqual([['dexterity', 'wisdom']]);
    expect(classOf('wizard').multiclass.requires).toEqual([['intelligence']]);
  });

  it('gives no saving throws and only the multiclass part of the proficiencies', () => {
    const names = (id: string) => classOf(id).multiclass.proficiencies.map((e) => (e.type === 'proficiency' ? e.value : e.type));
    expect(names('barbarian')).toEqual(['Щиты', 'Воинское оружие']);
    expect(names('cleric')).toEqual(['Лёгкие доспехи', 'Средние доспехи', 'Щиты']);
    expect(names('rogue')).toEqual(['Лёгкие доспехи', 'Воровские инструменты']);
    expect(names('monk')).toEqual([]);
    expect(names('wizard')).toEqual([]);
    for (const classDef of DND.classes) expect(classDef.multiclass.proficiencies.every((e) => e.type === 'proficiency'), classDef.id).toBe(true);
  });

  it('gives a skill to a bard, a ranger and a rogue only', () => {
    const withSkills = DND.classes.filter((c) => c.multiclass.skills).map((c) => c.id);
    expect(withSkills.sort()).toEqual(['bard', 'ranger', 'rogue']);
  });

  it('keeps the starting-only picks out of the class levels', () => {
    const bard = classOf('bard');
    expect(bard.starting?.[0]?.choices?.[0]?.count).toBe(3);
    expect(bard.multiclass.features?.[0]?.choices?.[0]?.count).toBe(1);
    expect(bard.levels[1]!.some((f) => f.id === 'bard.instruments')).toBe(false);
    expect(classOf('monk').levels[1]!.some((f) => f.id === 'monk.tool-proficiency')).toBe(false);
  });

  it('names a slot progression for every casting', () => {
    const castings = DND.classes.flatMap((c) => [c.spellcasting, ...c.subclasses.map((s) => s.spellcasting)]).filter((s) => !!s);
    for (const casting of castings) {
      expect(['full', 'half', 'third', 'pact']).toContain(casting.progression);
      expect(!!casting.pact).toBe(casting.progression === 'pact');
    }
    expect(classOf('paladin').spellcasting?.progression).toBe('half');
    expect(classOf('fighter').subclasses.find((s) => s.id === 'eldritch-knight')?.spellcasting?.progression).toBe('third');
  });
});
