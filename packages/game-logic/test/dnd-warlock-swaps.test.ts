import { describe, expect, it } from 'vitest';
import type { Character, DndBuild } from '@itd/schema';
import { startingSkills } from '../src';
import { applyBuild, choiceOptions, levelPlan, setPicks } from '../src/dnd';
import { makeCharacter } from './helpers';

const build = (patch: Partial<DndBuild> = {}): DndBuild => ({
  ruleset: 'dnd2024',
  species: 'human',
  background: 'sage',
  class: 'warlock',
  abilityMethod: 'pointBuy',
  baseAttributes: { strength: 8, dexterity: 14, constitution: 14, intelligence: 10, wisdom: 10, charisma: 15 },
  backgroundBonuses: { charisma: 2, constitution: 1 },
  choices: {},
  hitPoints: [],
  level: 1,
  ...patch,
});
const apply = (b: DndBuild): Character =>
  applyBuild(makeCharacter({ skills: startingSkills(), maxHP: 10, currentHP: 10, inventory: [] }), b).character;
const ARCANUM = 'class:warlock.mystic-arcanum-6/spell';
const INVOCATIONS = 'class:warlock.eldritch-invocations/invocations';

describe('Mystic Arcanum swap', () => {
  it('offers on a later level to give the arcanum up for another spell of its level', () => {
    const at11 = build({ level: 11 });
    const [first, second] = choiceOptions(at11, 11, levelPlan(at11, 11).choices.find((c) => c.key === ARCANUM)!).map((o) => o.id);
    const b = setPicks(build({ level: 12 }), ARCANUM, [first!]);
    const plan = levelPlan(b, 12);
    const forget = plan.choices.find((c) => c.key === 'swap:arcanum-6@12/forget')!;
    expect(forget.choice.label).toBe('Замена арканума 6 круга');
    expect(choiceOptions(b, 12, forget).map((o) => o.id)).toEqual([first]);

    const swapped = setPicks(b, forget.key, [first!]);
    const learn = levelPlan(swapped, 12).choices.find((c) => c.key === 'swap:arcanum-6@12/learn')!;
    const offered = choiceOptions(swapped, 12, learn);
    // Only spells of the arcanum's level, not the pact slots' fifth.
    expect(offered.every((o) => o.meta?.startsWith('6 круг'))).toBe(true);
    const hero = apply(setPicks(swapped, learn.key, [second!]));
    expect(hero.spells.find((s) => s.id === `spell-${second}`)).toMatchObject({ resourceId: 'warlock.arcanum-6' });
    expect(hero.spells.some((s) => s.id === `spell-${first}`)).toBe(false);
  });
});

describe('a repeatable invocation in one choice', () => {
  it('takes Agonizing Blast twice, each for its own cantrip', () => {
    let b = build({ level: 5, choices: { [INVOCATIONS]: ['pact-of-the-blade'] } });
    const at2 = levelPlan(b, 2).choices.find((c) => c.key.endsWith('/invocations') && c.level === 2)!;
    const option = choiceOptions(b, 2, at2).find((o) => o.id === 'agonizing-blast')!;
    expect(option.repeatable).toBe(true);
    b = setPicks(b, at2.key, ['agonizing-blast', 'agonizing-blast']);
    const blasts = levelPlan(b, 2).choices.filter((c) => c.key.endsWith(':agonizing-blast/cantrip'));
    expect(blasts.map((c) => c.key)).toEqual([`${at2.key}:agonizing-blast/cantrip`, `${at2.key}#2:agonizing-blast/cantrip`]);
    b = setPicks(setPicks(b, blasts[0]!.key, ['eldritch-blast']), blasts[1]!.key, ['chill-touch']);
    // The second copy cannot pick the cantrip the first one took.
    expect(choiceOptions(b, 2, levelPlan(b, 2).choices.find((c) => c.key === blasts[1]!.key)!).find((o) => o.id === 'eldritch-blast')?.disabled).toBeTruthy();
    const hero = apply(b);
    expect(hero.abilities.filter((a) => a.name === 'Мучительный взрыв')).toHaveLength(2);
  });
});
