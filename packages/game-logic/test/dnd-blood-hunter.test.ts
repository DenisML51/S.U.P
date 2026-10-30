import { describe, expect, it } from 'vitest';
import { createCharacterDocument, type Character, type DndBuild } from '@itd/schema';
import { activeFeaturesOf, armorClassOf, longRest, performAction, planD20, savingThrowModifier, shortRest, speedOf, totalMaxHP } from '../src';
import { applyBuild, choiceOptions, createDndHero, levelPlan, setPicks, sheetChoices, unfinishedChoices } from '../src/dnd';
import { sequence, singleClass, type SingleClassBuild, atLevel } from './helpers';

/**
 * The homebrew Blood Hunters: Matthew Mercer's (2020, errata 2022) and laserllama's Alternate Blood
 * Hunter (v2.2.0), with the core mechanics they brought — hit points paid for features, a Vital
 * Sacrifice off the maximum, amplified uses, dice of a stance dealt beside a weapon's damage.
 */

const build = (patch: Partial<SingleClassBuild> = {}): DndBuild => singleClass({
  ruleset: 'dnd2024',
  species: 'human',
  background: 'soldier',
  class: 'blood-hunter',
  abilityMethod: 'manual',
  baseAttributes: { strength: 15, dexterity: 13, constitution: 14, intelligence: 14, wisdom: 12, charisma: 8 },
  backgroundBonuses: { strength: 2, constitution: 1 },
  choices: {},
  hitPoints: [],
  level: 1,
  ...patch,
});
const alt = (patch: Partial<SingleClassBuild> = {}): DndBuild => build({ class: 'alt-blood-hunter', ...patch });

const hero = (b: DndBuild): Character => createCharacterDocument(createDndHero({ name: 'Т', build: b, classKitId: 'a', backgroundKitId: 'b' }));
const rebuilt = (c: Character): Character => applyBuild(c, c.build as DndBuild).character;
const ability = (c: Character, name: string) => c.abilities.find((a) => a.name === name);
/** What the sheet does on a use: perform it with the given dice, then rebuild for what turned on. */
const use = (c: Character, name: string, options: { amplify?: boolean; dice?: number[] } = {}) => {
  const entry = ability(c, name);
  if (!entry) throw new Error(`no ability ${name}`);
  const result = performAction(c, { kind: 'ability', id: entry.id, amplify: options.amplify, random: sequence(...(options.dice ?? [0.99])) });
  if (!result.ok) throw new Error(result.message);
  return { character: rebuilt(result.character), costs: result.costs, message: result.message };
};
const longsword = (c: Character) => c.attacks.find((a) => a.name === 'Длинный меч')!;

describe('Blood Hunter (Matthew Mercer)', () => {
  it('writes a level-1 hunter with hemocraft, Blood Maledict and a curse', () => {
    let b = build();
    const plan = levelPlan(atLevel(b, 1), 1);
    expect(plan.choices.map((c) => c.key)).toEqual(
      expect.arrayContaining(['class:blood-hunter.skills/skills', 'class:blood-hunter.key-ability/ability', 'class:blood-hunter.blood-maledict/curse']),
    );
    expect(plan.choices.find((c) => c.key === 'class:blood-hunter.skills/skills')!.count).toBe(3);
    b = setPicks(b, 'class:blood-hunter.blood-maledict/curse', ['curse-of-binding']);
    const c = applyBuild(hero(b), b).character;
    expect(c.class).toBe('Охотник на крови');
    // d10 + Constitution 15 (+2).
    expect(c.maxHP).toBe(12);
    expect(c.savingThrowProficiencies).toEqual(expect.arrayContaining(['dexterity', 'intelligence']));
    expect(c.resources.find((r) => r.id === 'blood-hunter.blood-maledict')).toMatchObject({ max: 1, recovery: 'short' });
    const binding = ability(c, 'Проклятие оков')!;
    expect(binding).toMatchObject({ actionType: 'bonus', resourceId: 'blood-hunter.blood-maledict', saveAttribute: 'strength', saveDC: 12 });
    expect(binding.amplify?.hpCost).toEqual({ dice: '1d4' });
    expect(c.traits.find((t) => t.id === 'g-proficiencies')?.description).toContain('Инструменты алхимика');
  });

  it('reads hemocraft from the ability the hero chose', () => {
    const base = setPicks(build(), 'class:blood-hunter.blood-maledict/curse', ['curse-of-binding']);
    const wise = setPicks(base, 'class:blood-hunter.key-ability/ability', ['wisdom']);
    // 8 + 2 + Intelligence 14 (+2), then Wisdom 12 (+1).
    expect(ability(applyBuild(hero(base), base).character, 'Проклятие оков')?.saveDC).toBe(12);
    expect(ability(applyBuild(hero(wise), wise).character, 'Проклятие оков')?.saveDC).toBe(11);
  });

  it('grows the hemocraft die, the maledict and the curses known', () => {
    const at = (level: number, subclass?: string) => applyBuild(hero(build({ level, subclass })), build({ level, subclass })).character;
    const uses = (level: number, subclass?: string) => at(level, subclass).resources.find((r) => r.id === 'blood-hunter.blood-maledict')!.max;
    expect([1, 6, 13, 17].map((l) => uses(l))).toEqual([1, 2, 3, 4]);
    // Curse Specialist of the Ghostslayer.
    expect(uses(3, 'order-of-the-ghostslayer')).toBe(2);
    const curses = (level: number) => levelPlan(atLevel(build({ level }), level), level).choices.filter((c) => c.choice.pool === 'blood-curses').length;
    expect([1, 6, 10, 14, 18].map(curses)).toEqual([1, 1, 1, 1, 1]);
    expect([2, 5, 9].map(curses)).toEqual([0, 0, 0]);
  });

  it('pays a hemocraft die for a crimson rite that adds its die to weapons until a rest', () => {
    const b = setPicks(build({ level: 2 }), 'class:blood-hunter.crimson-rite/rite', ['rite-of-the-flame']);
    const calm = applyBuild(hero(b), b).character;
    expect(longsword(calm).damageComponents).toBeUndefined();
    // A rolled 4 on the d4.
    const { character: lit, costs } = use(calm, 'Обряд пламени', { dice: [0.99] });
    expect(costs.hitPoints).toBe(4);
    expect(lit.currentHP).toBe(calm.currentHP - 4);
    expect(lit.maxHP).toBe(calm.maxHP);
    expect(activeFeaturesOf(lit).map((a) => a.name)).toEqual(['Обряд пламени']);
    expect(longsword(lit).damageComponents).toEqual([
      { damage: '1d8+3', type: 'Рубящий' },
      { damage: '1d4', type: 'Огонь', extra: true },
    ]);
    const rested = rebuilt(shortRest(lit).character);
    expect(rested.activeFeatures).toBeUndefined();
    expect(longsword(rested).damageComponents).toBeUndefined();
  });

  it('keeps the rite on weapons, and lets a Lycan put it on the claws of the hybrid form', () => {
    const plain = setPicks(build({ level: 3 }), 'class:blood-hunter.crimson-rite/rite', ['rite-of-the-storm']);
    const lit = use(applyBuild(hero(plain), plain).character, 'Обряд бури').character;
    expect(lit.attacks.find((a) => a.name === 'Безоружный удар')?.damageComponents).toBeUndefined();
    const lycan = setPicks(build({ level: 3, subclass: 'order-of-the-lycan' }), 'class:blood-hunter.crimson-rite/rite', ['rite-of-the-storm']);
    const beast = use(use(applyBuild(hero(lycan), lycan).character, 'Гибридная трансформация').character, 'Обряд бури').character;
    expect(beast.attacks.find((a) => a.name === 'Хищный удар')?.damageComponents?.[1]).toEqual({ damage: '1d4', type: 'Электричество', extra: true });
  });

  it('offers esoteric rites only from level 14', () => {
    const open = (level: number) => {
      const b = build({ level });
      const choice = levelPlan(atLevel(b, 2), 2).choices.find((c) => c.key === 'class:blood-hunter.crimson-rite/rite')!;
      return choiceOptions(atLevel(b, 2), 2, choice).find((o) => o.id === 'rite-of-the-dead')!.disabled;
    };
    expect(open(14)).toBe('С 14-го уровня');
    const b14 = build({ level: 14 });
    const later = levelPlan(atLevel(b14, 14), 14).choices.find((c) => c.choice.pool === 'crimson-rites')!;
    expect(choiceOptions(atLevel(b14, 14), 14, later).find((o) => o.id === 'rite-of-the-dead')!.disabled).toBeUndefined();
  });

  it('amplifies a curse for a hemocraft die of its own and refuses it with no maledict left', () => {
    const b = setPicks(build({ level: 5 }), 'class:blood-hunter.blood-maledict/curse', ['curse-of-the-eyeless']);
    const c = applyBuild(hero(b), b).character;
    const { character: cursed, costs, message } = use(c, 'Проклятие безглазия', { amplify: true, dice: [0.5] });
    // d6 at level 5: a 4.
    expect(costs.hitPoints).toBe(4);
    expect(message).toContain('(усилено)');
    expect(cursed.resources.find((r) => r.id === 'blood-hunter.blood-maledict')!.current).toBe(0);
    const again = performAction(cursed, { kind: 'ability', id: ability(cursed, 'Проклятие безглазия')!.id });
    expect(again.ok).toBe(false);
  });

  it('adds Dark Augmentation to physical saves and speed, and tightens the brand at 13', () => {
    const c = applyBuild(hero(build({ level: 13 })), build({ level: 13 })).character;
    // Intelligence 14 (+2) to Strength, Dexterity and Constitution saves.
    expect(c.saveBonuses).toEqual({ strength: 2, dexterity: 2, constitution: 2 });
    expect(savingThrowModifier(c, 'strength')).toBe(3 + 2);
    expect(speedOf(c)).toBe(35);
    expect(ability(c, 'Клеймо кары')?.damage).toBe('4');
  });

  it('takes a Lycan into its hybrid form with claws, a thicker hide and the might of the beast', () => {
    const b = build({ level: 11, subclass: 'order-of-the-lycan' });
    const c = applyBuild(hero(b), b).character;
    const ac = armorClassOf(c);
    expect(c.resources.find((r) => r.id === 'lycan.hybrid-transformation')?.max).toBe(2);
    const { character: beast } = use(c, 'Гибридная трансформация');
    const claws = beast.attacks.find((a) => a.name === 'Хищный удар')!;
    // 1d8 + Strength 17 (+3) + Feral Might 2; Improved Predatory Strikes +2 to hit.
    expect(claws.damage).toBe('1d8+5');
    expect(claws.hitBonus).toBe(4 + 3 + 2);
    expect(beast.attacks.some((a) => a.name === 'Хищный удар: бонусное действие' && a.actionType === 'bonus')).toBe(true);
    expect(armorClassOf(beast)).toBe(ac + 1);
    expect(beast.resistances.map((r) => r.type)).toEqual(expect.arrayContaining(['Дробящий', 'Колющий', 'Рубящий']));
    expect(planD20(beast, { kind: 'save', attribute: 'strength' }).mode).toBe('advantage');
    // From level 18 it has no uses to count.
    const master = applyBuild(hero(build({ level: 18, subclass: 'order-of-the-lycan' })), build({ level: 18, subclass: 'order-of-the-lycan' })).character;
    expect(master.resources.some((r) => r.id === 'lycan.hybrid-transformation')).toBe(false);
    expect(ability(master, 'Гибридная трансформация')?.resourceId).toBeUndefined();
  });

  it('lets a Mutant drink a mutagen that raises a score and gives its side effect', () => {
    let b = build({ level: 11, subclass: 'order-of-the-mutant' });
    b = setPicks(b, 'subclass:mutant.mutagencraft/formulas', ['mutagen-potency', 'mutagen-embers', 'mutagen-percipient', 'mutagen-precision']);
    const c = applyBuild(hero(b), b).character;
    expect(c.resources.find((r) => r.id === 'mutant.mutagens')?.max).toBe(2);
    const { character: strong } = use(c, 'Мощь');
    // Strength 17 → 21 (+4 at level 11, its maximum raised to 24).
    expect(strong.attributes.strength).toBe(c.attributes.strength + 4);
    expect(planD20(strong, { kind: 'save', attribute: 'dexterity' }).mode).toBe('disadvantage');
    const { character: hot } = use(strong, 'Угли');
    expect(hot.resistances.find((r) => r.type === 'Холод')?.level).toBe('vulnerability');
    expect(hot.resources.find((r) => r.id === 'mutant.mutagens')?.current).toBe(0);
    expect(rebuilt(shortRest(hot).character).activeFeatures).toBeUndefined();
  });

  it('gives a Profane Soul pact magic with the hemocraft ability and a patron', () => {
    let b = build({ level: 15, subclass: 'order-of-the-profane-soul' });
    b = setPicks(b, 'subclass:profane.otherworldly-patron/patron', ['fiend']);
    const c = applyBuild(hero(b), b).character;
    expect(c.resources.find((r) => r.id === 'pact-slots')).toMatchObject({ max: 2, spellSlotLevel: 3 });
    // 8 + 5 + Intelligence 14 (+2).
    expect(c.spellcastingDifficultyValue).toBe(15);
    expect(c.spells.find((s) => s.id === 'spell-scorching-ray')?.alwaysPrepared).toBe(true);
    expect(c.spells.find((s) => s.id === 'spell-fireball')?.resourceId).toBe('profane.unsealed-arcana');
    const known = levelPlan(atLevel(b, 3), 3).choices.find((c2) => c2.choice.pool === 'blood-hunter.known-spells')!;
    expect(known.count).toBe(2);
    expect(known.choice.spellAbility).toBe('intelligence');
  });

  it('rolls the blood twice and pays the lower at level 20', () => {
    const b = setPicks(build({ level: 20 }), 'class:blood-hunter.crimson-rite/rite', ['rite-of-the-frozen']);
    const c = applyBuild(hero(b), b).character;
    expect(ability(c, 'Обряд стужи')?.hpCost).toEqual({ dice: '1d10', rollTwice: true });
    const { costs } = use(c, 'Обряд стужи', { dice: [0.95, 0.05] });
    expect(costs.hitPoints).toBe(1);
  });
});

describe('Alternate Blood Hunter (laserllama)', () => {
  it('writes a level-1 hunter: d12, Constitution and Charisma saves, a style and occult lore', () => {
    let b = alt();
    const plan = levelPlan(atLevel(b, 1), 1);
    expect(plan.choices.map((c) => c.key)).toEqual(
      expect.arrayContaining(['class:alt-blood-hunter.fighting-style/style', 'class:alt-blood-hunter.occult-lore/skill']),
    );
    b = setPicks(b, 'class:alt-blood-hunter.occult-lore/skill', ['religion']);
    const c = applyBuild(hero(b), b).character;
    expect(c.maxHP).toBe(12 + 2);
    expect(c.savingThrowProficiencies).toEqual(expect.arrayContaining(['constitution', 'charisma']));
    expect(c.skills.find((s) => s.id === 'religion')?.proficient).toBe(true);
    expect(ability(c, 'Зловещая проницательность')?.actionType).toBe('bonus');
  });

  it('checks the prerequisites of its fighting styles', () => {
    const b = alt({ baseAttributes: { strength: 15, dexterity: 10, constitution: 14, intelligence: 10, wisdom: 12, charisma: 8 }, backgroundBonuses: { strength: 2, constitution: 1 } });
    const open = levelPlan(atLevel(b, 1), 1).choices.find((c) => c.key === 'class:alt-blood-hunter.fighting-style/style')!;
    const options = choiceOptions(atLevel(b, 1), 1, open);
    expect(options.find((o) => o.id === 'archery')?.disabled).toBe('Ловкость 13+');
    expect(options.find((o) => o.id === 'polearm-fighting')?.disabled).toBe('Сила и Ловкость 11+');
    expect(options.find((o) => o.id === 'featherweight-fighting')?.disabled).toBe('Ловкость 13+');
    expect(options.find((o) => o.id === 'great-weapon-fighting')?.disabled).toBeUndefined();
  });

  it('grows the Rite Die, and the Order of Undying Thirst grows it further', () => {
    const die = (level: number, subclass?: string) => {
      let b = alt({ level, subclass });
      b = setPicks(b, 'class:alt-blood-hunter.blood-rites/rites', ['rite-of-agony', 'rite-of-siphoning']);
      return ability(applyBuild(hero(b), b).character, 'Обряд агонии')!.damage;
    };
    expect([2, 5, 11, 17].map((l) => die(l))).toEqual(['1d4', '1d6', '1d8', '1d10']);
    expect([3, 5, 11, 17].map((l) => die(l, 'order-of-undying-thirst'))).toEqual(['1d6', '1d8', '1d10', '1d12']);
  });

  it('invokes a rite free once, then for a Vital Sacrifice off the maximum until a long rest', () => {
    const b = setPicks(alt({ level: 2 }), 'class:alt-blood-hunter.blood-rites/rites', ['rite-of-agony', 'rite-of-siphoning']);
    const c = applyBuild(hero(b), b).character;
    const max = totalMaxHP(c);
    // What it drains comes back to the hunter as temporary hit points.
    expect(ability(c, 'Обряд высасывания')?.tempHPFromDamage).toBe(1);
    const first = use(c, 'Обряд высасывания');
    expect(first.costs.hitPoints).toBeUndefined();
    expect(first.costs.resource?.amount).toBe(1);
    // No free use left: a d4 of 3 off the current and the maximum.
    const second = use(first.character, 'Обряд высасывания', { dice: [0.6] });
    expect(second.costs).toMatchObject({ hitPoints: 3, maxHitPoints: 3 });
    expect(totalMaxHP(second.character)).toBe(max - 3);
    expect(second.character.currentHP).toBe(max - 3);
    // Empowered without a free use: two sacrifices.
    const third = use(second.character, 'Обряд высасывания', { amplify: true, dice: [0.6, 0.99] });
    expect(third.costs.hitPoints).toBe(3 + 4);
    expect(totalMaxHP(third.character)).toBe(max - 10);
    const slept = longRest(third.character).character;
    expect(slept.maxHPReduction).toBeUndefined();
    expect(slept.currentHP).toBe(max);
  });

  it('caps the rites of level 17 at once a rest', () => {
    let b = alt({ level: 17 });
    b = setPicks(b, 'class:alt-blood-hunter.blood-rites/rites', ['rite-of-agony', 'rite-of-siphoning']);
    b = setPicks(b, 'class:alt-blood-hunter.rites-17/rite', ['rite-of-reaping']);
    const c = applyBuild(hero(b), b).character;
    const reaping = ability(c, 'Обряд жатвы')!;
    expect(reaping.damage).toBe('5d10');
    expect(reaping.hpCostWhenSpent).toBeUndefined();
    const used = use(c, 'Обряд жатвы').character;
    expect(performAction(used, { kind: 'ability', id: reaping.id }).ok).toBe(false);
    // Vital Control and Sanguine Mastery: the lower of two, less Constitution (+2), at least 1.
    expect(ability(c, 'Обряд агонии')?.hpCostWhenSpent).toEqual({ dice: '1d10', lowersMax: true, rollTwice: true });
    const twenty = applyBuild(hero(atLevel(b, 20)), atLevel(b, 20)).character;
    expect(ability(twenty, 'Обряд агонии')?.hpCostWhenSpent).toEqual({ dice: '1d10', lowersMax: true, rollTwice: true, minus: 2, min: 1 });
  });

  it('makes a Crimson Offering of the chosen type, free once a rest from level 6', () => {
    const pick = (level: number, type: string) => setPicks(alt({ level }), 'class:alt-blood-hunter.crimson-offering/type', [type]);
    const open = levelPlan(atLevel(alt({ level: 5 }), 2), 2).choices.find((c) => c.key === 'class:alt-blood-hunter.crimson-offering/type')!;
    expect(choiceOptions(atLevel(alt({ level: 5 }), 2), 2, open).find((o) => o.id === 'necrotic')?.disabled).toBe('С 11-го уровня');
    const early = applyBuild(hero(pick(5, 'acid')), pick(5, 'acid')).character;
    const { character: acid, costs } = use(early, 'Багровое подношение: кислота', { dice: [0.2] });
    expect(costs.maxHitPoints).toBe(2);
    expect(longsword(acid).damageComponents?.[1]).toEqual({ damage: '1d6', type: 'Кислота', extra: true });
    const later = applyBuild(hero(pick(6, 'cold')), pick(6, 'cold')).character;
    expect(use(later, 'Багровое подношение: холод').costs.hitPoints).toBeUndefined();
    // The type is changed on the sheet from the offering itself as well as from the class feature.
    const offering = later.abilities.find((a) => a.name === 'Багровое подношение: холод')!;
    expect(sheetChoices(pick(6, 'cold'), offering.grant).map((c) => c.key)).toEqual(['class:alt-blood-hunter.crimson-offering/type']);
  });

  it('adds the Rite Die to physical rolls from Dark Augmentation and to mental saves from Hardened Soul', () => {
    const c = applyBuild(hero(alt({ level: 15 })), alt({ level: 15 })).character;
    expect(planD20(c, { kind: 'save', attribute: 'strength' }).dice).toEqual(['1d8']);
    expect(planD20(c, { kind: 'check', attribute: 'dexterity', skill: 'acrobatics' }).dice).toEqual(['1d8']);
    expect(planD20(c, { kind: 'save', attribute: 'wisdom' }).dice).toEqual(['1d8']);
    expect(planD20(c, { kind: 'check', attribute: 'charisma' }).dice).toBeUndefined();
  });

  it('gives Witch Knights pact magic of Constitution from their own list', () => {
    const b = alt({ level: 7, subclass: 'order-of-witch-knights' });
    const c = applyBuild(hero(b), b).character;
    expect(c.resources.find((r) => r.id === 'pact-slots')).toMatchObject({ max: 2, spellSlotLevel: 2 });
    // 8 + 3 + Constitution 15 (+2).
    expect(c.spellcastingDifficultyValue).toBe(13);
    const cantrips = levelPlan(atLevel(b, 3), 3).choices.find((ch) => ch.choice.pool === 'alt-blood-hunter.known-cantrips')!;
    const names = choiceOptions(atLevel(b, 3), 3, cantrips).map((o) => o.id);
    expect(names).toEqual(expect.arrayContaining(['booming-blade', 'toll-the-dead', 'frostbite']));
    expect(names).not.toContain('eldritch-blast');
  });

  it('curses a Pale Moon hunter with a beast of challenge 1 to shift into', () => {
    let b = alt({ level: 3, subclass: 'order-of-the-pale-moon' });
    const choice = levelPlan(atLevel(b, 3), 3).choices.find((c) => c.key === 'subclass:pale-moon.lycanthropic-curse/beast')!;
    const options = choiceOptions(atLevel(b, 3), 3, choice);
    expect(options.find((o) => o.id === 'dire-wolf')?.disabled).toBeUndefined();
    expect(options.find((o) => o.id === 'giant-eagle')?.disabled).toBeUndefined();
    expect(options.find((o) => o.id === 'polar-bear')?.disabled).toBeDefined();
    b = setPicks(b, choice.key, ['dire-wolf']);
    const c = applyBuild(hero(b), b).character;
    const { character: wolf } = use(c, 'Облик зверя: Лютоволк');
    expect(wolf.attributes.strength).toBe(17);
    expect(wolf.speed).toBe(50);
    // A second shift without its free use is a Vital Sacrifice.
    const back = rebuilt({ ...wolf, activeFeatures: undefined });
    expect(use(back, 'Гибридный облик', { dice: [0.99] }).costs.maxHitPoints).toBe(4);
  });

  it('lets a Heretic take a domain Channel Divinity with the Rite DC', () => {
    let b = alt({ level: 3, subclass: 'order-of-heretics' });
    const choice = levelPlan(atLevel(b, 3), 3).choices.find((c) => c.key === 'subclass:heretics.blasphemous-prayer/domain')!;
    expect(choiceOptions(atLevel(b, 3), 3, choice).length).toBeGreaterThanOrEqual(4);
    b = setPicks(b, choice.key, [choiceOptions(atLevel(b, 3), 3, choice).find((o) => o.name.includes('Домен света'))!.id]);
    const c = applyBuild(hero(b), b).character;
    const dawn = c.abilities.find((a) => a.grant?.includes('heretics.') && a.saveAttribute);
    // 8 + 2 + Constitution 15 (+2).
    expect(dawn?.saveDC).toBe(12);
    expect(dawn?.hpCostWhenSpent?.lowersMax).toBe(true);
    expect(ability(c, 'Порицание божественного')?.amplify).toBeUndefined();
    const anathema = applyBuild(hero(atLevel(b, 13)), atLevel(b, 13)).character;
    expect(ability(anathema, 'Порицание божественного')?.amplify?.hpCost?.lowersMax).toBe(true);
  });

  it('turns an Alchemist latent mutagen on as a free toggle while mutating', () => {
    let b = alt({ level: 13, subclass: 'order-of-alchemists' });
    b = setPicks(b, 'subclass:alchemists.mutate/mutagens', ['synthetic-carapace', 'monstrous-flight', 'aberrant-sight']);
    const c = applyBuild(hero(b), b).character;
    const ac = armorClassOf(c);
    const { character: mutated } = use(c, 'Мутация');
    const { character: shelled } = use(mutated, 'Искусственный панцирь');
    expect(armorClassOf(shelled)).toBe(ac + 2);
    expect(ability(c, 'Искусственный панцирь')?.actionType).toBe('passive');
    expect(unfinishedChoices(b, levelPlan(atLevel(b, 3), 3)).some((ch) => ch.key === 'subclass:alchemists.mutate/mutagens')).toBe(false);
  });
});

describe('Blood Hunters built to level 20', () => {
  /** Every choice of every level made with the first options that can be taken. */
  const filled = (start: DndBuild): DndBuild => {
    let b = start;
    for (let level = 1; level <= 20; level += 1) {
      for (let guard = 0; guard < 12; guard += 1) {
        const open = unfinishedChoices(b, levelPlan(atLevel(b, level), level));
        if (open.length === 0) break;
        for (const choice of open) {
          const free = choiceOptions(atLevel(b, level), level, choice).filter((o) => !o.disabled && !choice.picked.includes(o.id));
          b = setPicks(b, choice.key, [...choice.picked, ...free.slice(0, choice.count - choice.picked.length).map((o) => o.id)]);
        }
      }
    }
    return b;
  };

  for (const [classId, orders] of [
    ['blood-hunter', ['order-of-the-ghostslayer', 'order-of-the-lycan', 'order-of-the-mutant', 'order-of-the-profane-soul']],
    ['alt-blood-hunter', ['order-of-alchemists', 'order-of-heretics', 'order-of-the-pale-moon', 'order-of-salt-and-iron', 'order-of-undying-thirst', 'order-of-witch-knights']],
  ] as const) {
    for (const subclass of orders) {
      it(`${classId} / ${subclass}: every pick made, nothing missing`, () => {
        const b = filled(build({ class: classId, subclass, level: 20 }));
        for (let level = 1; level <= 20; level += 1) expect(unfinishedChoices(b, levelPlan(atLevel(b, level), level))).toEqual([]);
        const { character, missing } = applyBuild(hero(b), b);
        expect(missing).toEqual([]);
        expect(character.level).toBe(20);
        // Every ability that can be used is usable once (a free toggle, a pool, or hit points).
        for (const entry of character.abilities.filter((a) => a.actionType !== 'passive' || a.resourceId || a.stance || a.hpCost)) {
          const result = performAction(character, { kind: 'ability', id: entry.id, random: sequence(0.5) });
          expect(result.ok, `${entry.name}: ${result.ok ? '' : result.message}`).toBe(true);
        }
      });
    }
  }
});
