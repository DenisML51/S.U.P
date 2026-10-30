import { describe, expect, it } from 'vitest';
import type { DndBuild, Character } from '@itd/schema';
import { startingSkills } from '../src';
import { DND, applyBuild, choiceOptions, collect, levelPlan, weaponProficient } from '../src/dnd';
import { makeCharacter, singleClass, type SingleClassBuild, atLevel } from './helpers';

const build = (patch: Partial<SingleClassBuild> = {}): DndBuild => singleClass({
  ruleset: 'dnd2024',
  species: 'human',
  background: 'soldier',
  class: 'rogue',
  abilityMethod: 'pointBuy',
  // Dexterity 17 (+3), Constitution 14 (+2), Intelligence 14 (+2).
  baseAttributes: { strength: 8, dexterity: 15, constitution: 14, intelligence: 13, wisdom: 10, charisma: 10 },
  backgroundBonuses: { dexterity: 2, intelligence: 1 },
  choices: {},
  hitPoints: [],
  level: 1,
  ...patch,
});

const fresh = (): Character => makeCharacter({ skills: startingSkills(), maxHP: 10, currentHP: 10 });
const applied = (b: DndBuild) => applyBuild(fresh(), b);
const apply = (b: DndBuild) => applied(b).character;
const sneak = (c: Character) => c.abilities.find((a) => a.name === 'Коварная атака');

describe('rogue', () => {
  it('writes a level-1 rogue onto the sheet', () => {
    const c = apply(build());
    expect(c.class).toBe('Плут');
    expect(c.maxHP).toBe(10);
    expect(c.savingThrowProficiencies).toEqual(expect.arrayContaining(['dexterity', 'intelligence']));
    const proficiencies = c.traits.find((t) => t.id === 'g-proficiencies')?.description ?? '';
    expect(proficiencies).toContain('Лёгкие доспехи');
    expect(proficiencies).toContain('Воинское оружие (фехтовальное или лёгкое)');
    expect(proficiencies).toContain('Воровские инструменты');
    expect(proficiencies).toContain('Воровской жаргон');
    expect(sneak(c)?.damage).toBe('1d6');
    expect(c.spells).toHaveLength(0);
  });

  it('asks for four skills, two expertise, two masteries and a language on level 1', () => {
    const plan = levelPlan(atLevel(build(), 1), 1);
    expect(plan.choices.find((c) => c.key === 'class:rogue.skills/skills')?.count).toBe(4);
    expect(plan.choices.find((c) => c.key === 'class:rogue.expertise/expertise')?.count).toBe(2);
    expect(plan.choices.find((c) => c.key === 'class:rogue.weapon-mastery/mastery')?.count).toBe(2);
    const language = plan.choices.find((c) => c.key === 'class:rogue.thieves-cant/language')!;
    expect(language.count).toBe(1);
    expect(choiceOptions(atLevel(build(), 1), 1, language).find((o) => o.id === 'Воровской жаргон')?.disabled).toBe('Уже знаете');
    expect(levelPlan(atLevel(build(), 6), 6).choices.find((c) => c.choice.id === 'expertise')?.count).toBe(2);
  });

  it('is proficient with finesse and light martial weapons only', () => {
    const effects = collect(build()).effects.map((e) => e.effect);
    const weapon = (id: string) => DND.weapons.find((w) => w.id === id)!;
    expect(weaponProficient(weapon('rapier'), effects)).toBe(true);
    expect(weaponProficient(weapon('shortsword'), effects)).toBe(true);
    expect(weaponProficient(weapon('dagger'), effects)).toBe(true);
    expect(weaponProficient(weapon('longsword'), effects)).toBe(false);
  });

  it('grows Sneak Attack by a die every odd level', () => {
    const at = (level: number) => sneak(apply(build({ level })))?.damage;
    expect([1, 2, 3, 5, 10, 11, 19, 20].map(at)).toEqual(['1d6', '1d6', '2d6', '3d6', '5d6', '6d6', '10d6', '10d6']);
  });

  it('gets its features on the right levels', () => {
    const c5 = apply(build({ level: 5 }));
    expect(c5.abilities.find((a) => a.name === 'Хитрый удар')?.saveDC).toBe(8 + 3 + 3);
    expect(c5.abilities.find((a) => a.name === 'Невероятное уклонение')?.actionType).toBe('reaction');
    expect(c5.abilities.find((a) => a.name === 'Хитрое действие')?.actionType).toBe('bonus');
    expect(c5.abilities.find((a) => a.name === 'Точное прицеливание')?.actionType).toBe('bonus');
    expect(levelPlan(atLevel(build(), 10), 10).choices.some((c) => c.key.startsWith('class:rogue.asi-10'))).toBe(true);
    const c15 = apply(build({ level: 15 }));
    expect(c15.savingThrowProficiencies).toEqual(expect.arrayContaining(['wisdom', 'charisma']));
    const c20 = apply(build({ level: 20 }));
    expect(c20.resources.find((r) => r.id === 'rogue.stroke-of-luck')).toMatchObject({ max: 1, recovery: 'short' });
    expect(levelPlan(atLevel(build(), 19), 19).choices.some((c) => c.key.startsWith('class:rogue.epic-boon'))).toBe(true);
  });
});

describe('rogue subclasses', () => {
  it('applies every subclass at level 20 without unknown content', () => {
    for (const subclass of DND.classes.find((c) => c.id === 'rogue')!.subclasses) {
      const result = applied(build({ subclass: subclass.id, level: 20 }));
      expect(result.missing).toEqual([]);
      expect(result.character.subclass).toBe(subclass.name);
    }
  });

  it('Arcane Trickster: Mage Hand, wizard cantrips and spells, third-caster slots', () => {
    const b = build({ subclass: 'arcane-trickster', level: 3 });
    const c = apply(b);
    expect(c.spells.find((s) => s.id === 'spell-mage-hand')?.alwaysPrepared).toBe(true);
    expect(c.resources.find((r) => r.id === 'slot-1')?.max).toBe(2);
    expect(c.spellcastingDifficultyValue).toBe(8 + 2 + 2);
    const plan = levelPlan(atLevel(b, 3), 3);
    const cantrips = plan.choices.find((ch) => ch.choice.id === 'cantrips')!;
    const spells = plan.choices.find((ch) => ch.choice.id === 'spells')!;
    expect(cantrips.count).toBe(2);
    expect(spells.count).toBe(3);
    expect(choiceOptions(atLevel(b, 3), 3, cantrips).find((o) => o.id === 'mage-hand')?.disabled).toBe('Уже известно');
    expect(choiceOptions(atLevel(b, 3), 3, spells).every((o) => o.meta?.startsWith('1 круг'))).toBe(true);
    expect(levelPlan(atLevel(b, 2), 2).choices.some((ch) => ch.choice.id === 'spells')).toBe(false);
    expect(levelPlan(atLevel(b, 10), 10).choices.find((ch) => ch.choice.id === 'cantrips')?.count).toBe(1);
    const spellsAt = (level: number) => levelPlan(atLevel(b, level), level).choices.find((ch) => ch.choice.id === 'spells')?.count ?? 0;
    expect([4, 5, 7, 8, 13, 19, 20].map(spellsAt)).toEqual([1, 0, 1, 1, 1, 1, 1]);
    const c20 = apply(atLevel(b, 20));
    expect(c20.resources.find((r) => r.id === 'slot-4')?.max).toBe(1);
    expect(c20.abilities.find((a) => a.name === 'Вор заклинаний')).toMatchObject({ actionType: 'reaction', saveAttribute: 'intelligence', saveDC: 8 + 6 + 2 });
  });

  it('Assassin: tools and first-round damage equal to the rogue level', () => {
    const c = apply(build({ subclass: 'assassin', level: 17 }));
    const proficiencies = c.traits.find((t) => t.id === 'g-proficiencies')?.description ?? '';
    expect(proficiencies).toContain('Набор для грима');
    expect(proficiencies).toContain('Инструменты отравителя');
    expect(c.abilities.find((a) => a.name === 'Ликвидация')?.damage).toBe('17');
    expect(c.abilities.find((a) => a.name === 'Покрытое ядом оружие')).toMatchObject({ damage: '2d6', damageType: 'Яд' });
    expect(c.abilities.find((a) => a.name === 'Смертельный удар')).toMatchObject({ saveAttribute: 'constitution', saveDC: 8 + 6 + 3 });
  });

  it('Soulknife: Psionic Energy dice and Psychic Blades', () => {
    const at = (level: number) => apply(build({ subclass: 'soulknife', level }));
    const c3 = at(3);
    expect(c3.resources.find((r) => r.id === 'soulknife.psionic-energy')).toMatchObject({ max: 4, recovery: 'short', recoveryAmount: 1 });
    expect(c3.attacks.find((a) => a.id === 'g-attack-soulknife.psychic-blade')).toMatchObject({
      damage: '1d6+3',
      damageType: 'Психический',
      attribute: 'dexterity',
      hitBonus: 2 + 3,
      actionType: 'action',
    });
    expect(c3.attacks.find((a) => a.id === 'g-attack-soulknife.psychic-blade-bonus')).toMatchObject({ damage: '1d4+3', actionType: 'bonus' });
    expect(c3.abilities.find((a) => a.name === 'Усиленная псионикой сноровка')).toMatchObject({ resourceId: 'soulknife.psionic-energy', damage: '1d6' });
    expect([5, 9, 13, 17].map((l) => at(l).resources.find((r) => r.id === 'soulknife.psionic-energy')?.max)).toEqual([6, 8, 10, 12]);
    expect(at(11).abilities.find((a) => a.name === 'Клинки души: психическая телепортация')).toMatchObject({ damage: '1d10', actionType: 'bonus' });
    expect(at(17).abilities.find((a) => a.name === 'Раздирание разума')?.saveDC).toBe(8 + 6 + 3);
  });

  it('Thief: Fast Hands and the later features', () => {
    const c = apply(build({ subclass: 'thief', level: 17 }));
    expect(c.abilities.find((a) => a.name === 'Быстрые руки')?.actionType).toBe('bonus');
    expect(c.traits.some((t) => t.name === 'Взлом с проникновением')).toBe(true);
    expect(c.abilities.some((a) => a.name === 'Воровские рефлексы')).toBe(true);
  });
});
