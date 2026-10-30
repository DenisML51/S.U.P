import { describe, expect, it } from 'vitest';
import { performAction, resetTurn, spentActionsOf, startingSkills, strikesLeft } from '../src';
import { applyBuild } from '../src/dnd';
import { makeCharacter, singleClass } from './helpers';

const fighter = (level: number) =>
  applyBuild(
    makeCharacter({
      skills: startingSkills(),
      maxHP: 10,
      currentHP: 10,
      attacks: [{ id: 'sword', name: 'Меч', damage: '1d8', damageType: 'Рубящий', hitBonus: 5, actionType: 'action' }],
      abilities: [{ id: 'dash', name: 'Рывок', description: '', actionType: 'action', effect: '' }],
    }),
    singleClass({
      ruleset: 'dnd2024', species: 'human', background: 'soldier', class: 'fighter', abilityMethod: 'pointBuy',
      baseAttributes: { strength: 15, dexterity: 14, constitution: 14, intelligence: 10, wisdom: 10, charisma: 10 },
      backgroundBonuses: {}, choices: {}, hitPoints: [], level,
    }),
  ).character;

const attack = (c: ReturnType<typeof fighter>) => performAction(c, { kind: 'attack', id: 'sword', trackActionEconomy: true });

describe('Extra Attack', () => {
  it('a level 5 fighter attacks twice with one action', () => {
    const hero = fighter(5);
    expect(hero.attacksPerAction).toBe(2);
    const first = attack(hero);
    expect(first.ok && first.character.spentActions).toMatchObject({ action: 1, strikes: 1 });
    expect(first.ok && strikesLeft(first.character)).toBe(1);
    const second = attack(first.ok ? first.character : hero);
    expect(second.ok).toBe(true);
    expect(second.ok && second.message).toContain('атака 2 из 2');
    const third = attack(second.ok ? second.character : hero);
    expect(third.ok).toBe(false);
  });

  it('a fighter gets three at 11 and four at 20; others one', () => {
    expect(fighter(11).attacksPerAction).toBe(3);
    expect(fighter(20).attacksPerAction).toBe(4);
    expect(fighter(4).attacksPerAction).toBeUndefined();
  });

  it('another action taken ends the Attack action', () => {
    const hero = fighter(5);
    const struck = attack(hero);
    if (!struck.ok) throw new Error();
    const limited = { ...struck.character, actionLimits: { action: 2, bonus: 1, reaction: 1 } };
    const dashed = performAction(limited, { kind: 'ability', id: 'dash', trackActionEconomy: true });
    expect(dashed.ok && spentActionsOf(dashed.character).strikes).toBeUndefined();
    expect(strikesLeft(resetTurn(struck.character))).toBe(0);
  });
});

describe('fighting styles and weapon properties', () => {
  const kit = (...refs: string[]) =>
    refs.map((ref, i) => ({ id: `w${i}`, ref, name: ref, type: 'weapon' as const, equipped: true, weight: 1, cost: 1, description: '', weaponClass: 'melee' as const, damage: '1d6' }));
  const build = (choices: Record<string, string[]>) =>
    singleClass({
      ruleset: 'dnd2024', species: 'human', background: 'soldier', class: 'fighter', abilityMethod: 'pointBuy',
      baseAttributes: { strength: 16, dexterity: 14, constitution: 14, intelligence: 10, wisdom: 10, charisma: 10 },
      backgroundBonuses: {}, choices, hitPoints: [], level: 1,
    });
  const armed = (refs: string[], style: string) => {
    const inventory = kit(...refs);
    const attacks = inventory.map((item) => ({ id: `attack_weapon_${item.id}`, name: item.name, damage: '1d6', damageType: '', hitBonus: 0, actionType: 'action' as const, weaponId: item.id }));
    return applyBuild(makeCharacter({ skills: startingSkills(), inventory, attacks }), build({ 'class:fighter.fighting-style/style': [style] })).character;
  };

  it('Dueling adds 2 to a one-handed weapon alone', () => {
    const hero = armed(['longsword'], 'dueling');
    expect(hero.attacks[0]).toMatchObject({ damage: '1d8+5', damageTwoHanded: '1d10+3' });
  });

  it('Great Weapon Fighting lifts the low dice of a two-handed weapon', () => {
    expect(armed(['greatsword'], 'great-weapon-fighting').attacks[0]).toMatchObject({ minDie: 3 });
  });

  it('two Light weapons give an extra attack with the other hand, without the ability unless Two-Weapon Fighting', () => {
    const plain = armed(['shortsword', 'scimitar'], 'defense');
    const offHand = plain.attacks.filter((a) => a.id.endsWith('_offhand'));
    expect(offHand).toHaveLength(2);
    expect(offHand[0]).toMatchObject({ actionType: 'bonus', damage: '1d6' });
    const twf = armed(['shortsword', 'scimitar'], 'two-weapon-fighting');
    expect(twf.attacks.find((a) => a.id.endsWith('_offhand'))!.damage).toBe('1d6+3');
  });
});

describe('rituals', () => {
  const spell = (patch: Record<string, unknown>) => ({
    id: 'detect', name: 'Обнаружение магии', level: 1, school: '', castingTime: '', actionType: 'action' as const, range: '', components: '',
    duration: '', description: '', effect: '', prepared: false, ritual: true, resourceId: 'slot-1', resourceCost: 1, ...patch,
  });
  const slots = [{ id: 'slot-1', name: 'Ячейки 1', current: 0, max: 2, description: '', iconName: '', spellSlotLevel: 1, recovery: 'long' as const }];

  it('cast as a ritual take no slot; only a Wizard casts them unprepared, never in a fight', () => {
    const cleric = makeCharacter({ spells: [spell({ prepared: true })], resources: slots });
    expect(performAction(cleric, { kind: 'spell', id: 'detect', asRitual: true }).ok).toBe(true);
    expect(performAction(cleric, { kind: 'spell', id: 'detect' }).ok).toBe(false);
    const unprepared = makeCharacter({ spells: [spell({})], resources: slots });
    expect(performAction(unprepared, { kind: 'spell', id: 'detect', asRitual: true }).ok).toBe(false);
    expect(performAction({ ...unprepared, ritualsFromBook: true }, { kind: 'spell', id: 'detect', asRitual: true }).ok).toBe(true);
    expect(performAction(cleric, { kind: 'spell', id: 'detect', asRitual: true, trackActionEconomy: true }).ok).toBe(false);
  });
});
