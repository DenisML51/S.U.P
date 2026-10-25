import { describe, expect, it } from 'vitest';
import type { Build, Character } from '@itd/schema';
import { startingSkills } from '../src';
import { DND, applyBuild, choiceOptions, levelPlan } from '../src/dnd';
import { makeCharacter } from './helpers';

/** Ranger: Wisdom 15 (+2); rogue: Dexterity 17 (+3), Intelligence 14 (+2); sorcerer: Charisma 17 (+3). */
const ATTRIBUTES: Record<string, Pick<Build, 'background' | 'baseAttributes' | 'backgroundBonuses'>> = {
  ranger: {
    background: 'guide',
    baseAttributes: { strength: 10, dexterity: 15, constitution: 14, intelligence: 8, wisdom: 14, charisma: 8 },
    backgroundBonuses: { dexterity: 2, wisdom: 1 },
  },
  rogue: {
    background: 'criminal',
    baseAttributes: { strength: 8, dexterity: 15, constitution: 13, intelligence: 14, wisdom: 12, charisma: 10 },
    backgroundBonuses: { dexterity: 2, constitution: 1 },
  },
  sorcerer: {
    background: 'sage',
    baseAttributes: { strength: 8, dexterity: 14, constitution: 14, intelligence: 10, wisdom: 10, charisma: 15 },
    backgroundBonuses: { charisma: 2, dexterity: 1 },
  },
};

const build = (cls: string, subclass: string, level: number, choices: Build['choices'] = {}): Build => ({
  ruleset: 'dnd2024',
  species: 'human',
  class: cls,
  abilityMethod: 'pointBuy',
  ...ATTRIBUTES[cls]!,
  subclass,
  choices,
  hitPoints: [],
  level,
});

const fresh = (): Character => makeCharacter({ skills: startingSkills(), maxHP: 10, currentHP: 10, inventory: [] });
const applied = (b: Build) => applyBuild(fresh(), b);
const apply = (b: Build) => applied(b).character;
const resource = (c: Character, id: string) => c.resources.find((r) => r.id === id);
const ability = (c: Character, name: string) => c.abilities.find((a) => a.name === name);
const trait = (c: Character, name: string) => c.traits.find((t) => t.name === name);
const spell = (c: Character, id: string) => c.spells.find((s) => s.id === `spell-${id}`);

const NEW: { cls: string; id: string; source: string }[] = [
  { cls: 'ranger', id: 'winter-walker', source: 'Forgotten Realms: Heroes of Faerûn' },
  { cls: 'ranger', id: 'hollow-warden', source: 'Ravenloft: The Horrors Within' },
  { cls: 'rogue', id: 'scion-of-the-three', source: 'Forgotten Realms: Heroes of Faerûn' },
  { cls: 'rogue', id: 'phantom', source: 'Ravenloft: The Horrors Within' },
  { cls: 'sorcerer', id: 'spellfire-sorcery', source: 'Forgotten Realms: Heroes of Faerûn' },
  { cls: 'sorcerer', id: 'shadow-sorcery', source: 'Ravenloft: The Horrors Within' },
];

describe('supplement subclasses of ranger, rogue and sorcerer', () => {
  it('come after the PHB ones, with their book and icon, and apply at levels 3 and 20 without missing content', () => {
    for (const { cls, id, source } of NEW) {
      const def = DND.classes.find((c) => c.id === cls)!;
      const index = def.subclasses.findIndex((s) => s.id === id);
      expect(index).toBeGreaterThanOrEqual(4);
      const subclass = def.subclasses[index]!;
      expect(subclass.source).toBe(source);
      for (const level of [3, 20]) {
        const result = applied(build(cls, id, level));
        expect(result.missing).toEqual([]);
        expect(result.character.subclass).toBe(subclass.name);
      }
    }
  });

  it('Winter Walker: frost resistance, growing Polar Strikes, Hunter’s Rime and the later features', () => {
    const at = (level: number) => apply(build('ranger', 'winter-walker', level));
    const c3 = at(3);
    expect(c3.resistances.some((r) => r.type === 'Холод')).toBe(true);
    expect(ability(c3, 'Ледяной исследователь')?.damage).toBe('1d4');
    expect(ability(c3, 'Изморозь охотника')?.damage).toBe('1d10+3');
    expect(spell(c3, 'ice-knife')?.alwaysPrepared).toBe(true);
    const c11 = at(11);
    expect(ability(c11, 'Ледяной исследователь')?.damage).toBe('1d6');
    expect(ability(c11, 'Укрепляющий дух')?.damage).toBe('1d10+11');
    expect(resource(c11, 'winter-walker.fortifying-soul')).toMatchObject({ max: 1, recovery: 'long' });
    expect(resource(c11, 'winter-walker.chilling-retribution')).toMatchObject({ max: 2, recovery: 'long' });
    expect(ability(c11, 'Выстужающее возмездие')).toMatchObject({ actionType: 'reaction' });
    const c17 = at(17);
    expect(resource(c17, 'winter-walker.frozen-haunt')?.max).toBe(1);
    for (const id of ['hold-person', 'remove-curse', 'ice-storm', 'cone-of-cold']) expect(spell(c17, id)?.alwaysPrepared).toBe(true);
  });

  it('Hollow Warden: Wild Rage spends Favored Enemy, healing and Undying Fury later', () => {
    const at = (level: number) => apply(build('ranger', 'hollow-warden', level));
    const c3 = at(3);
    expect(ability(c3, 'Ярость дикой природы')).toMatchObject({ actionType: 'bonus', resourceId: 'ranger.favored-enemy' });
    expect(spell(c3, 'wrathful-smite')?.alwaysPrepared).toBe(true);
    expect(ability(at(7), 'Алчущая мощь')?.damage).toBe('1d10+2');
    expect(resource(at(15), 'hollow-warden.undying-fury')).toMatchObject({ max: 1, recovery: 'long' });
    expect(spell(at(17), 'steel-wind-strike')?.alwaysPrepared).toBe(true);
  });

  it('Scion of the Three: Bloodthirst uses, a deity with resistance and an Intelligence cantrip', () => {
    const key = 'subclass:scion-of-the-three.dread-allegiance/deity';
    const b = build('rogue', 'scion-of-the-three', 3);
    const deity = levelPlan(b, 3).choices.find((c) => c.key === key)!;
    expect(choiceOptions(b, 3, deity).map((o) => o.id)).toEqual(['bhaal', 'bane', 'myrkul']);
    const c = apply(build('rogue', 'scion-of-the-three', 3, { [key]: ['myrkul'] }));
    expect(resource(c, 'scion-of-the-three.bloodthirst')).toMatchObject({ max: 2, recovery: 'long' });
    expect(ability(c, 'Кровожадность')?.actionType).toBe('reaction');
    expect(c.resistances.some((r) => r.type === 'Некротический')).toBe(true);
    expect(spell(c, 'chill-touch')).toMatchObject({ alwaysPrepared: true, ability: 'intelligence' });
    const bane = apply(build('rogue', 'scion-of-the-three', 9, { [key]: ['bane'] }));
    expect(bane.resistances.some((r) => r.type === 'Психический')).toBe(true);
    expect(spell(bane, 'minor-illusion')).toBeDefined();
    expect(spell(bane, 'chill-touch')).toBeUndefined();
    expect(ability(bane, 'Удар страха')).toBeDefined();
  });

  it('Phantom: Wails from the Grave with half the Sneak Attack dice, tokens and Voice of the Dead', () => {
    const at = (level: number) => apply(build('rogue', 'phantom', level));
    const c3 = at(3);
    expect(resource(c3, 'phantom.wails-from-the-grave')).toMatchObject({ max: 3, recovery: 'long' });
    expect(ability(c3, 'Могильные стенания')).toMatchObject({ damage: '1d6' });
    expect(trait(c3, 'Шёпот мёртвых')).toBeDefined();
    const c9 = at(9);
    expect(ability(c9, 'Могильные стенания')?.damage).toBe('3d6');
    expect(resource(c9, 'phantom.tokens-of-the-departed')).toMatchObject({ max: 2, recovery: 'manual' });
    expect(spell(c9, 'augury')).toMatchObject({ ability: 'constitution', resourceId: 'phantom.tokens-of-the-departed' });
    expect(spell(c9, 'speak-with-dead')).toMatchObject({ ability: 'dexterity', resourceId: 'phantom.voice-of-the-dead' });
    expect(resource(c9, 'phantom.voice-of-the-dead')).toMatchObject({ max: 1, recovery: 'short' });
    expect(resource(at(13), 'phantom.tokens-of-the-departed')?.max).toBe(3);
    expect(ability(at(13), 'Призрачная походка')?.actionType).toBe('bonus');
    const c20 = at(20);
    expect(resource(c20, 'phantom.tokens-of-the-departed')?.max).toBe(4);
    expect(ability(c20, 'Могильные стенания')?.damage).toBe('5d6');
  });

  it('Spellfire Sorcery: origin spells, Spellfire Burst growing at 14, Counterspell and the crown', () => {
    const at = (level: number) => apply(build('sorcerer', 'spellfire-sorcery', level));
    const c3 = at(3);
    for (const id of ['cure-wounds', 'guiding-bolt', 'lesser-restoration', 'scorching-ray']) expect(spell(c3, id)?.alwaysPrepared).toBe(true);
    expect(ability(c3, 'Прорыв чаропламени')?.damage).toBe('1d4');
    expect(spell(at(6), 'counterspell')?.alwaysPrepared).toBe(true);
    expect(ability(at(14), 'Прорыв чаропламени')?.damage).toBe('1d8');
    const c18 = at(18);
    expect(resource(c18, 'spellfire.crown-of-spellfire')).toMatchObject({ max: 1, recovery: 'long' });
    expect(spell(c18, 'flame-strike')?.alwaysPrepared).toBe(true);
  });

  it('Shadow Sorcery: Strength of the Grave, Hound of Ill Omen for 3 points and Umbral Form', () => {
    const at = (level: number) => apply(build('sorcerer', 'shadow-sorcery', level));
    const c3 = at(3);
    expect(resource(c3, 'shadow.strength-of-the-grave')).toMatchObject({ max: 1, recovery: 'long' });
    for (const id of ['bane', 'darkness', 'inflict-wounds', 'pass-without-trace']) expect(spell(c3, id)?.alwaysPrepared).toBe(true);
    expect(ability(at(6), 'Звери дурных знамений')).toMatchObject({ actionType: 'bonus', resourceId: 'sorcerer.sorcery-points', resourceCost: 3 });
    expect(ability(at(14), 'Хождение по теням')?.actionType).toBe('bonus');
    expect(resource(at(18), 'shadow.umbral-form')).toMatchObject({ max: 1, recovery: 'long' });
  });
});
