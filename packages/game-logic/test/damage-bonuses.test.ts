import { describe, expect, it } from 'vitest';
import { createCharacterDocument, type Character, type DndBuild } from '@itd/schema';
import { onHitAttacks, spellDamageAt } from '../src';
import { applyBuild, createDndHero, levelPlan, setPicks } from '../src/dnd';

const build = (patch: Partial<DndBuild> = {}): DndBuild => ({
  ruleset: 'dnd2024',
  species: 'human',
  background: 'sage',
  class: 'warlock',
  abilityMethod: 'pointBuy',
  // The class's main ability ends at 17 (+3).
  baseAttributes: { strength: 15, dexterity: 14, constitution: 14, intelligence: 15, wisdom: 15, charisma: 15 },
  backgroundBonuses: { charisma: 2, constitution: 1 },
  choices: {},
  hitPoints: [],
  level: 1,
  ...patch,
});
const hero = (b: DndBuild): Character => createCharacterDocument(createDndHero({ name: 'Т', build: b, classKitId: 'a', backgroundKitId: 'a' }));
/** Picks every open choice of `level` whose key ends with `suffix`. */
const pick = (b: DndBuild, level: number, suffix: string, ids: string[]): DndBuild => {
  const open = levelPlan(b, level).choices.find((c) => c.key.endsWith(suffix));
  if (!open) throw new Error(`No choice ${suffix} on level ${level}`);
  return setPicks(b, open.key, ids);
};
const spell = (c: Character, id: string) => c.spells.find((s) => s.id === `spell-${id}`)!;

describe('features that add to damage', () => {
  it('Agonizing Blast adds Charisma to every beam of Eldritch Blast', () => {
    let b = build({ level: 5 });
    b = pick(b, 1, '/cantrips', ['eldritch-blast', 'minor-illusion']);
    b = setPicks(b, 'class:warlock.eldritch-invocations/invocations', ['pact-of-the-blade']);
    b = pick(b, 2, '/invocations', ['agonizing-blast', 'armor-of-shadows']);
    b = pick(b, 2, ':agonizing-blast/cantrip', ['eldritch-blast']);
    const warlock = applyBuild(hero(build()), b).character;
    expect(spell(warlock, 'eldritch-blast').damageBonus).toBe(3);
    // Every beam is its own roll, each with +3.
    expect(spellDamageAt(warlock, spell(warlock, 'eldritch-blast'))).toBe('1d10+3');
    expect(spell(warlock, 'minor-illusion').damageBonus).toBeUndefined();
  });

  it('Potent Spellcasting adds Wisdom to a druid’s cantrips only', () => {
    let b = build({ class: 'druid', backgroundBonuses: { wisdom: 2, constitution: 1 }, level: 7 });
    b = pick(b, 1, '/cantrips', ['produce-flame', 'thorn-whip']);
    b = pick(b, 7, 'elemental-fury/fury', ['potent-spellcasting']);
    const druid = applyBuild(hero(build({ class: 'druid' })), b).character;
    expect(spell(druid, 'produce-flame').damageBonus).toBe(3);
    expect(spell(druid, 'cure-wounds').damageBonus).toBeUndefined();
  });

  it('Empowered Evocation adds Intelligence to a wizard’s evocations', () => {
    const b = { ...build({ class: 'wizard', backgroundBonuses: { intelligence: 2, constitution: 1 }, level: 10, subclass: 'evoker' }) };
    const withBook = pick(b, 1, '/spellbook', ['magic-missile', 'shield', 'burning-hands', 'detect-magic', 'sleep', 'alarm']);
    const wizard = applyBuild(hero(build({ class: 'wizard' })), withBook).character;
    expect(spell(wizard, 'magic-missile').damageBonus).toBe(3);
    expect(spell(wizard, 'shield').damageBonus).toBeUndefined();
  });

  it('Great Weapon Master adds the proficiency bonus to heavy weapons only', () => {
    const b = pick(build({ class: 'fighter', background: 'soldier', backgroundBonuses: { strength: 2, constitution: 1 }, level: 4 }), 4, 'asi-4/feat', ['great-weapon-master']);
    const fighter = applyBuild(hero(build({ class: 'fighter', background: 'soldier' })), b).character;
    const greatsword = fighter.attacks.find((a) => a.name === 'Двуручный меч');
    const others = fighter.attacks.filter((a) => a.weaponId && a.name !== 'Двуручный меч');
    expect(greatsword?.damage).toBe('2d6+6');
    for (const attack of others) expect(attack.damage).not.toContain('+6');
  });
});

describe('smites', () => {
  it('ride on a melee hit: the spell says so, and only melee attacks carry it', () => {
    const b = build({ class: 'paladin', backgroundBonuses: { strength: 2, charisma: 1 }, level: 2 });
    const paladin = applyBuild(hero(b), b).character;
    expect(spell(paladin, 'divine-smite').onHit).toBe('melee');
    expect(onHitAttacks(paladin, 'melee').map((a) => a.name)).toEqual(['Длинный меч']);
    const attack = (id: string, patch: Partial<Character['attacks'][number]> = {}) => ({ ...paladin.attacks[0]!, id, name: id, ...patch });
    const armed = {
      attacks: [
        attack('sword'),
        attack('bow', { ranged: true, usesAmmunition: true }),
        attack('dagger-throw', { ranged: true, thrown: true }),
        attack('fist', { weaponId: undefined }),
      ],
    };
    // A smite rides on a melee weapon or an unarmed strike; Eldritch and Branding Smite on any weapon.
    expect(onHitAttacks(armed, 'melee').map((a) => a.id)).toEqual(['sword', 'fist']);
    expect(onHitAttacks(armed, 'weapon').map((a) => a.id)).toEqual(['sword', 'bow', 'dagger-throw']);
  });
});
