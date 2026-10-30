import { describe, expect, it } from 'vitest';
import type { DndBuild, Character } from '@itd/schema';
import { armorClassOf, startingSkills } from '../src';
import { DND, applyBuild, choiceOptions, createDndHero, levelPlan, setPicks } from '../src/dnd';
import { makeCharacter, singleClass, type SingleClassBuild, atLevel } from './helpers';

const build = (patch: Partial<SingleClassBuild> = {}): DndBuild => singleClass({
  ruleset: 'dnd2024',
  species: 'human',
  background: 'soldier',
  class: 'bard',
  abilityMethod: 'pointBuy',
  // Charisma 17 (+3), Dexterity 15 (+2), Constitution 14 (+2).
  baseAttributes: { strength: 8, dexterity: 14, constitution: 14, intelligence: 10, wisdom: 10, charisma: 15 },
  backgroundBonuses: { charisma: 2, dexterity: 1 },
  choices: {},
  hitPoints: [],
  level: 1,
  ...patch,
});

const fresh = (): Character => makeCharacter({ skills: startingSkills(), maxHP: 10, currentHP: 10 });
const applied = (b: DndBuild) => applyBuild(fresh(), b);
const apply = (b: DndBuild) => applied(b).character;
/** Spells other agents are still writing may be missing; nothing else may. */
const PENDING = new Set(['spell:power-word-heal', 'spell:power-word-kill']);
const unexpectedMissing = (b: DndBuild) => applied(b).missing.filter((id) => !PENDING.has(id));

const inspiration = (c: Character) => c.abilities.find((a) => a.name === 'Бардовское вдохновение');

describe('bard', () => {
  it('writes a level-1 bard onto the sheet', () => {
    const c = apply(build());
    expect(c.class).toBe('Бард');
    expect(c.maxHP).toBe(10);
    expect(c.savingThrowProficiencies).toEqual(expect.arrayContaining(['dexterity', 'charisma']));
    const proficiencies = c.traits.find((t) => t.id === 'g-proficiencies')?.description ?? '';
    expect(proficiencies).toContain('Лёгкие доспехи');
    expect(proficiencies).toContain('Простое оружие');
    expect(proficiencies).not.toContain('Воинское оружие');
    expect(c.resources.find((r) => r.id === 'bard.bardic-inspiration')).toMatchObject({ max: 3, recovery: 'long' });
    expect(inspiration(c)).toMatchObject({ actionType: 'bonus', damage: '1d6', resourceId: 'bard.bardic-inspiration' });
    expect(c.resources.find((r) => r.id === 'slot-1')?.max).toBe(2);
    expect(c.spellcastingDifficultyValue).toBe(8 + 2 + 3);
    expect(c.halfProficiency).toBeFalsy();
  });

  it('asks for cantrips, known spells, three skills and three instruments on level 1', () => {
    const b = build();
    const plan = levelPlan(atLevel(b, 1), 1);
    const cantrips = plan.choices.find((c) => c.choice.id === 'cantrips')!;
    const spells = plan.choices.find((c) => c.choice.id === 'spells')!;
    expect(cantrips.count).toBe(2);
    expect(spells.count).toBe(4);
    const options = choiceOptions(atLevel(b, 1), 1, spells);
    expect(options.some((o) => o.id === 'healing-word')).toBe(true);
    expect(options.every((o) => o.meta?.startsWith('1 круг'))).toBe(true);
    expect(choiceOptions(atLevel(b, 1), 1, cantrips).every((o) => o.meta?.startsWith('Заговор'))).toBe(true);
    expect(plan.choices.find((c) => c.key === 'class:bard.skills/skills')?.count).toBe(3);
    expect(plan.choices.find((c) => c.key === 'class:bard.instruments/tools')?.count).toBe(3);
  });

  it('grows the inspiration die, its uses and recharge with level', () => {
    const at = (level: number) => apply(build({ level }));
    expect(inspiration(at(4))?.damage).toBe('1d6');
    expect(inspiration(at(5))?.damage).toBe('1d8');
    expect(inspiration(at(10))?.damage).toBe('1d10');
    expect(inspiration(at(15))?.damage).toBe('1d12');
    expect(at(5).resources.find((r) => r.id === 'bard.bardic-inspiration')?.recovery).toBe('short');
    const low = apply(build({ baseAttributes: { strength: 8, dexterity: 14, constitution: 14, intelligence: 10, wisdom: 10, charisma: 8 }, backgroundBonuses: {} }));
    expect(low.resources.find((r) => r.id === 'bard.bardic-inspiration')?.max).toBe(1);
  });

  it('gets Jack of All Trades and Expertise on level 2 and 9', () => {
    const c = apply(build({ level: 2 }));
    expect(c.halfProficiency).toBe(true);
    expect(levelPlan(atLevel(build(), 2), 2).choices.find((c) => c.choice.id === 'expertise')?.count).toBe(2);
    expect(levelPlan(atLevel(build(), 9), 9).choices.find((c) => c.choice.id === 'expertise')?.count).toBe(2);
  });

  it('follows the full caster slots and the prepared spells column', () => {
    const b = build();
    expect(apply(build({ level: 5 })).resources.find((r) => r.id === 'slot-3')?.max).toBe(2);
    const twenty = apply(build({ level: 20 }));
    expect(twenty.resources.find((r) => r.id === 'slot-9')?.max).toBe(1);
    expect(twenty.resources.find((r) => r.id === 'slot-7')?.max).toBe(2);
    const spellsAt = (level: number) => levelPlan(atLevel(b, level), level).choices.find((c) => c.choice.id === 'spells')?.count ?? 0;
    const cantripsAt = (level: number) => levelPlan(atLevel(b, level), level).choices.find((c) => c.choice.id === 'cantrips')?.count ?? 0;
    expect([1, 2, 3, 4, 5, 9, 12, 13, 20].map(spellsAt)).toEqual([4, 1, 1, 1, 2, 2, 0, 1, 1]);
    expect([1, 2, 4, 10, 11].map(cantripsAt)).toEqual([2, 0, 1, 1, 0]);
  });

  it('opens other lists with Magical Secrets on level 10', () => {
    const b = build();
    const before = levelPlan(atLevel(b, 9), 9).choices.find((c) => c.choice.id === 'spells')!;
    expect(choiceOptions(atLevel(b, 9), 9, before).some((o) => o.id === 'cone-of-cold')).toBe(false);
    const secrets = levelPlan(atLevel(b, 10), 10).choices.find((c) => c.choice.id === 'spells')!;
    const options = choiceOptions(atLevel(b, 10), 10, secrets);
    expect(options.some((o) => o.id === 'cone-of-cold')).toBe(true);
    expect(options.some((o) => o.id === 'mass-cure-wounds')).toBe(true);
  });

  it('lets a known spell be replaced on a later level', () => {
    let b = build();
    const spells = levelPlan(atLevel(b, 1), 1).choices.find((c) => c.choice.id === 'spells')!;
    const picks = choiceOptions(atLevel(b, 1), 1, spells).slice(0, 4).map((o) => o.id);
    b = setPicks(b, spells.key, picks);
    const forget = levelPlan(atLevel(b, 2), 2).choices.find((c) => c.choice.options.from === 'forget' && c.choice.label.startsWith('Замена заклинания'))!;
    expect(forget).toBeDefined();
    b = setPicks(atLevel(b, 2), forget.key, [picks[0]!]);
    const learn = levelPlan(atLevel(b, 2), 2).choices.find((c) => c.key === forget.key.replace(/forget$/, 'learn'))!;
    expect(learn.count).toBe(1);
    const options = choiceOptions(atLevel(b, 2), 2, learn).filter((o) => !o.disabled).map((o) => o.id);
    const replacement = options.find((id) => !picks.includes(id))!;
    b = setPicks(b, learn.key, [replacement]);
    const known = apply(b).spells.filter((s) => s.level > 0).map((s) => s.id);
    expect(known).not.toContain(`spell-${picks[0]}`);
    // Three kept and one learned instead; the new spell of level 2 is not picked here.
    expect(known).toHaveLength(4);
    expect(known).toContain(`spell-${replacement}`);
  });

  it('gets an epic boon on level 19 and Words of Creation on level 20', () => {
    expect(levelPlan(atLevel(build(), 19), 19).choices.some((c) => c.key.startsWith('class:bard.epic-boon'))).toBe(true);
    expect(levelPlan(atLevel(build(), 20), 20).features.some((f) => f.feature.id === 'bard.words-of-creation')).toBe(true);
  });
});

describe('bard colleges', () => {
  it('applies every college at level 20 without unknown content', () => {
    for (const subclass of DND.classes.find((c) => c.id === 'bard')!.subclasses) {
      const b = build({ subclass: subclass.id, level: 20 });
      expect(unexpectedMissing(b)).toEqual([]);
      expect(apply(b).subclass).toBe(subclass.name);
    }
  });

  it('College of Dance: unarmoured defence with Charisma and a bardic unarmed strike', () => {
    const b = build({ subclass: 'college-of-dance', level: 3 });
    const hero = createDndHero({ name: 'Т', build: b, classKitId: 'b', backgroundKitId: 'b' });
    expect(armorClassOf(hero)).toBe(10 + 2 + 3);
    const strike = apply(b).attacks.find((a) => a.id === 'g-attack-dance.unarmed-strike')!;
    expect(strike).toMatchObject({ damage: '1d6+2', damageType: 'Дробящий', attribute: 'dexterity', hitBonus: 2 + 2 });
    expect(apply(atLevel(b, 10)).attacks.find((a) => a.id === 'g-attack-dance.unarmed-strike')?.damage).toBe('1d10+2');
    expect(apply(atLevel(b, 6)).abilities.some((a) => a.name === 'Вдохновляющие движения' && a.actionType === 'reaction')).toBe(true);
  });

  it('College of Glamour: always-prepared spells and once-a-rest features', () => {
    const c = apply(build({ subclass: 'college-of-glamour', level: 14 }));
    for (const id of ['charm-person', 'mirror-image', 'command']) expect(c.spells.find((s) => s.id === `spell-${id}`)?.alwaysPrepared).toBe(true);
    expect(c.resources.find((r) => r.id === 'glamour.unbreakable-majesty')).toMatchObject({ max: 1, recovery: 'short' });
    expect(c.resources.find((r) => r.id === 'glamour.mantle-of-majesty')).toMatchObject({ max: 1, recovery: 'long' });
    expect(c.abilities.find((a) => a.name === 'Чарующая магия')).toMatchObject({ saveAttribute: 'wisdom', saveDC: 8 + 5 + 3 });
  });

  it('College of Lore: three skills and two Magical Discoveries from other lists', () => {
    const b = build({ subclass: 'college-of-lore', level: 6 });
    expect(levelPlan(atLevel(b, 3), 3).choices.find((c) => c.key === 'subclass:lore.bonus-proficiencies/skills')?.count).toBe(3);
    const discoveries = levelPlan(atLevel(b, 6), 6).choices.find((c) => c.key === 'subclass:lore.magical-discoveries/spells')!;
    expect(discoveries.count).toBe(2);
    const options = choiceOptions(atLevel(b, 6), 6, discoveries);
    expect(options.some((o) => o.id === 'spirit-guardians')).toBe(true);
    expect(options.some((o) => o.id === 'guidance')).toBe(true);
    expect(options.every((o) => !o.meta?.startsWith('4 круг'))).toBe(true);
    const c = apply(setPicks(b, discoveries.key, ['spirit-guardians', 'guidance']));
    expect(c.spells.find((s) => s.id === 'spell-spirit-guardians')?.alwaysPrepared).toBe(true);
    // They can be swapped on a later level.
    const swap = levelPlan(atLevel(setPicks(atLevel(b, 7), discoveries.key, ['spirit-guardians', 'guidance']), 7), 7).choices;
    expect(swap.some((c) => c.choice.label.startsWith('Замена магического открытия'))).toBe(true);
  });

  it('College of Valor: martial training and Extra Attack', () => {
    const c = apply(build({ subclass: 'college-of-valor', level: 6 }));
    const proficiencies = c.traits.find((t) => t.id === 'g-proficiencies')?.description ?? '';
    expect(proficiencies).toContain('Воинское оружие');
    expect(proficiencies).toContain('Средние доспехи');
    expect(proficiencies).toContain('Щиты');
    expect(c.abilities.some((a) => a.name === 'Дополнительная атака')).toBe(true);
  });
});
