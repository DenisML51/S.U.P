import { describe, expect, it } from 'vitest';
import type { Build, Character } from '@itd/schema';
import { startingSkills } from '../src';
import { DND, type Effect, applyBuild, choiceOptions, levelPlan, setPicks, weaponProficient } from '../src/dnd';
import { makeCharacter } from './helpers';

const warlockBuild = (patch: Partial<Build> = {}): Build => ({
  ruleset: 'dnd2024',
  species: 'human',
  background: 'sage',
  class: 'warlock',
  abilityMethod: 'pointBuy',
  // Charisma 17 (+3).
  baseAttributes: { strength: 8, dexterity: 14, constitution: 14, intelligence: 10, wisdom: 10, charisma: 15 },
  backgroundBonuses: { charisma: 2, constitution: 1 },
  choices: {},
  hitPoints: [],
  level: 1,
  ...patch,
});

const wizardBuild = (patch: Partial<Build> = {}): Build => ({
  ...warlockBuild(),
  class: 'wizard',
  // Intelligence 17 (+3).
  baseAttributes: { strength: 8, dexterity: 14, constitution: 14, intelligence: 15, wisdom: 10, charisma: 10 },
  backgroundBonuses: { intelligence: 2, dexterity: 1 },
  ...patch,
});

const fresh = (): Character => makeCharacter({ skills: startingSkills(), maxHP: 10, currentHP: 10, inventory: [] });
const applied = (b: Build) => applyBuild(fresh(), b);
const apply = (b: Build) => applied(b).character;
const resource = (c: Character, id: string) => c.resources.find((r) => r.id === id);
const ability = (c: Character, name: string) => c.abilities.find((a) => a.name === name);
const prepared = (c: Character, id: string) => c.spells.find((s) => s.id === `spell-${id}`)?.alwaysPrepared;
const school = (id: string) => DND.spells.find((s) => s.id === id)?.school;

const SUPPLEMENT: Record<string, Record<string, string>> = {
  warlock: { 'undead-patron': 'Ravenloft: The Horrors Within', 'vestige-patron': 'Arcana Unleashed' },
  wizard: {
    bladesinger: 'Forgotten Realms: Heroes of Faerûn',
    necromancer: 'Arcana Unleashed',
    enchanter: 'Arcana Unleashed',
    transmuter: 'Arcana Unleashed',
    conjurer: 'Arcana Unleashed',
  },
};

describe('supplement warlock and wizard subclasses', () => {
  for (const [classId, subclasses] of Object.entries(SUPPLEMENT)) {
    const make = classId === 'warlock' ? warlockBuild : wizardBuild;
    for (const [id, source] of Object.entries(subclasses)) {
      it(`${id} applies at 3 and 20 with nothing missing`, () => {
        const def = DND.classes.find((c) => c.id === classId)!.subclasses.find((s) => s.id === id)!;
        expect(def.source).toBe(source);
        for (const level of [3, 20]) {
          const result = applied(make({ level, subclass: id }));
          expect(result.missing).toEqual([]);
          expect(result.character.subclass).toBe(def.name);
        }
      });
    }
  }

  it('keeps the PHB subclasses first', () => {
    expect(DND.classes.find((c) => c.id === 'warlock')!.subclasses.slice(0, 4).every((s) => !s.source)).toBe(true);
    expect(DND.classes.find((c) => c.id === 'wizard')!.subclasses.slice(0, 4).every((s) => !s.source)).toBe(true);
  });

  it('undead patron: spells, Form of Dread and Unholy Revival', () => {
    const c3 = apply(warlockBuild({ level: 3, subclass: 'undead-patron' }));
    expect(['bane', 'blindness-deafness', 'phantasmal-force', 'ray-of-sickness'].every((s) => prepared(c3, s))).toBe(true);
    expect(prepared(c3, 'summon-undead')).toBeUndefined();
    expect(resource(c3, 'undead.form-of-dread')).toMatchObject({ max: 3, recovery: 'long' });
    expect(ability(c3, 'Аватар ужаса')).toMatchObject({ damage: '1d10+3', saveAttribute: 'wisdom', saveDC: 8 + 2 + 3 });
    const c10 = apply(warlockBuild({ level: 10, subclass: 'undead-patron' }));
    expect(c10.resistances.some((r) => r.type === 'Некротический')).toBe(true);
    expect(resource(c10, 'undead.unholy-revival')?.max).toBe(1);
    expect(ability(c10, 'Нечестивое оживление')).toMatchObject({ damage: '2d10+3', saveAttribute: 'constitution', saveDC: 8 + 4 + 3 });
    const c9 = apply(warlockBuild({ level: 9, subclass: 'undead-patron' }));
    expect(prepared(c9, 'cloudkill') && prepared(c9, 'antilife-shell')).toBe(true);
  });

  it('vestige patron: picks a cleric domain whose spells follow the warlock level', () => {
    let b = warlockBuild({ level: 5, subclass: 'vestige-patron' });
    const domain = levelPlan(b, 3).choices.find((c) => c.key === 'subclass:vestige.vestige-spells/domain')!;
    expect(choiceOptions(b, 3, domain).map((o) => o.id)).toEqual(['war', 'life', 'trickery', 'light']);
    b = setPicks(b, domain.key, ['war']);
    const c = apply(b);
    expect(['guiding-bolt', 'magic-weapon', 'shield-of-faith', 'spiritual-weapon', 'crusaders-mantle', 'spirit-guardians'].every((s) => prepared(c, s))).toBe(true);
    expect(prepared(c, 'fire-shield')).toBeUndefined();
    expect(applied(b).missing).toEqual([]);
    const c20 = apply({ ...setPicks(warlockBuild({ level: 20, subclass: 'vestige-patron' }), domain.key, ['life']) });
    expect(prepared(c20, 'mass-cure-wounds')).toBe(true);
    expect(resource(c20, 'vestige.vestige-restoration')?.max).toBe(1);
    expect(resource(c20, 'vestige.semblance-of-life')?.max).toBe(1);
  });

  it('bladesinger: Bladesong uses, weapons and skill', () => {
    let b = wizardBuild({ level: 3, subclass: 'bladesinger' });
    const c = apply(b);
    expect(resource(c, 'bladesinger.bladesong')).toMatchObject({ max: 3, recovery: 'long' });
    const profs = DND.classes.find((k) => k.id === 'wizard')!.subclasses.find((s) => s.id === 'bladesinger')!.levels[3]!.find((f) => f.id === 'bladesinger.training-in-war-and-song')!.effects as Effect[];
    const weapon = (id: string) => DND.weapons.find((w) => w.id === id)!;
    expect(weaponProficient(weapon('rapier'), profs)).toBe(true);
    expect(weaponProficient(weapon('longsword'), profs)).toBe(true);
    expect(weaponProficient(weapon('greatsword'), profs)).toBe(false);
    expect(weaponProficient(weapon('lance'), profs)).toBe(false);
    expect(weaponProficient(weapon('longbow'), profs)).toBe(false);
    const skill = levelPlan(b, 3).choices.find((k) => k.key === 'subclass:bladesinger.training-in-war-and-song/skill')!;
    expect(choiceOptions(b, 3, skill).map((o) => o.id).sort()).toEqual(['acrobatics', 'athletics', 'performance', 'persuasion']);
    b = setPicks(b, skill.key, ['acrobatics']);
    expect(apply(b).skills.find((s) => s.id === 'acrobatics')?.proficient).toBe(true);
    expect(ability(apply(wizardBuild({ level: 14, subclass: 'bladesinger' })), 'Песнь победы')?.actionType).toBe('bonus');
  });

  for (const [id, schoolName] of [
    ['necromancer', 'Некромантия'],
    ['enchanter', 'Очарование'],
    ['transmuter', 'Преобразование'],
    ['conjurer', 'Вызов'],
  ] as const) {
    it(`${id}: Savant picks of its school at 3 and on new spell levels`, () => {
      const b = wizardBuild({ level: 17, subclass: id });
      const at3 = levelPlan(b, 3).choices.find((c) => c.key === `subclass:${id}.savant/spells`)!;
      expect(at3.count).toBe(2);
      const options = choiceOptions(b, 3, at3);
      expect(options.length).toBeGreaterThan(0);
      expect(options.every((o) => school(o.id) === schoolName)).toBe(true);
      for (const level of [5, 7, 9, 11, 13, 15, 17]) {
        expect(levelPlan(b, level).choices.find((c) => c.key === `subclass:${id}.savant-${level}/spells`)?.count).toBe(1);
      }
    });
  }

  it('necromancer: resistance, familiar in the book and Undead Thralls', () => {
    const c = apply(wizardBuild({ level: 6, subclass: 'necromancer' }));
    expect(c.resistances.some((r) => r.type === 'Некротический')).toBe(true);
    expect(c.spells.find((s) => s.id === 'spell-find-familiar')).toBeDefined();
    expect(prepared(c, 'find-familiar')).toBeFalsy();
    expect(prepared(c, 'animate-dead')).toBe(true);
    expect(resource(c, 'necromancer.undead-thralls')?.max).toBe(1);
    const c14 = apply(wizardBuild({ level: 14, subclass: 'necromancer' }));
    expect(resource(c14, 'necromancer.death-lord')?.max).toBe(1);
    expect(ability(c14, 'Погасание нежизни')).toMatchObject({ saveAttribute: 'dexterity', saveDC: 8 + 5 + 3 });
  });

  it('enchanter: Beguiling Speaker skill with an Intelligence bonus and Mesmerizing Presence', () => {
    let b = wizardBuild({ level: 10, subclass: 'enchanter' });
    const speaker = levelPlan(b, 3).choices.find((c) => c.key === 'subclass:enchanter.beguiling-speaker/skill')!;
    expect(choiceOptions(b, 3, speaker).map((o) => o.id)).toEqual(['intimidation', 'deception', 'persuasion']);
    b = setPicks(b, speaker.key, ['persuasion']);
    const c = apply(b);
    expect(c.skills.find((s) => s.id === 'persuasion')).toMatchObject({ proficient: true, bonus: 3 });
    expect(resource(c, 'enchanter.mesmerizing-presence')?.max).toBe(3);
    expect(resource(c, 'enchanter.split-enchantment')?.max).toBe(3);
    expect(ability(c, 'Гипнотизирующее присутствие')).toMatchObject({ saveAttribute: 'wisdom', saveDC: 8 + 4 + 3 });
    expect(resource(c, 'enchanter.instinctive-charm')?.max).toBe(1);
  });

  it('transmuter: Alter Self and Polymorph always prepared with free casts', () => {
    const c3 = apply(wizardBuild({ level: 3, subclass: 'transmuter' }));
    expect(prepared(c3, 'alter-self')).toBe(true);
    expect(resource(c3, 'transmuter.magical-transformation')?.max).toBe(1);
    const c10 = apply(wizardBuild({ level: 10, subclass: 'transmuter' }));
    expect(prepared(c10, 'polymorph')).toBe(true);
    expect(resource(c10, 'transmuter.empowered-transmutation')?.max).toBe(3);
    expect(resource(c10, 'transmuter.master-of-polymorph')?.max).toBe(1);
  });

  it('conjurer: Benign Transposition uses and Durable Summons', () => {
    const c = apply(wizardBuild({ level: 6, subclass: 'conjurer' }));
    expect(resource(c, 'conjurer.benign-transposition')).toMatchObject({ max: 3, recovery: 'long' });
    expect(ability(c, 'Безопасный перенос')?.actionType).toBe('bonus');
    expect(resource(apply(wizardBuild({ level: 14, subclass: 'conjurer' })), 'conjurer.split-summons')?.max).toBe(1);
  });
});
