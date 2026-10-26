import { describe, expect, it } from 'vitest';
import type { DndBuild } from '@itd/schema';
import { performAction, resetTurn, spentActionsOf, startingSkills, strikesLeft } from '../src';
import { applyBuild } from '../src/dnd';
import { makeCharacter } from './helpers';

const fighter = (level: number) =>
  applyBuild(
    makeCharacter({
      skills: startingSkills(),
      maxHP: 10,
      currentHP: 10,
      attacks: [{ id: 'sword', name: 'Меч', damage: '1d8', damageType: 'Рубящий', hitBonus: 5, actionType: 'action' }],
      abilities: [{ id: 'dash', name: 'Рывок', description: '', actionType: 'action', effect: '' }],
    }),
    {
      ruleset: 'dnd2024', species: 'human', background: 'soldier', class: 'fighter', abilityMethod: 'pointBuy',
      baseAttributes: { strength: 15, dexterity: 14, constitution: 14, intelligence: 10, wisdom: 10, charisma: 10 },
      backgroundBonuses: {}, choices: {}, hitPoints: [], level,
    } as DndBuild,
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
