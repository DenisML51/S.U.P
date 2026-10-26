import type { Character } from '@itd/schema';
import { CONDITIONS } from '../content/combat';
import type { D20Mode } from './dice';

/** What a d20 is thrown for: the rules on advantage and disadvantage look at it. */
export interface D20Test {
  kind: 'attack' | 'check' | 'save' | 'initiative' | 'deathSave';
  /** The ability of a check or save (`dexterity`). */
  attribute?: string;
  /** The skill of a check (`athletics`). */
  skill?: string;
}

export interface D20Plan {
  mode: D20Mode;
  /** Why it has advantage and why disadvantage, said for the player ("отравлен", "Выдающийся атлет"). */
  advantage: string[];
  disadvantage: string[];
  /** Taken off the total: exhaustion's −2 per level. */
  penalty: number;
  /** The condition that fails a Strength or Dexterity save outright (paralysed, stunned…). */
  autoFail?: string;
}

/** What a condition does to d20 tests (D&D 2024); only what holds without a judgement of the table. */
const CONDITION_EFFECTS: Record<string, { advantage?: D20Test['kind'][]; disadvantage?: D20Test['kind'][]; dexSaves?: boolean }> = {
  blinded: { disadvantage: ['attack'] },
  frightened: { disadvantage: ['attack', 'check', 'initiative'] },
  incapacitated: { disadvantage: ['initiative'] },
  invisible: { advantage: ['attack', 'initiative'] },
  poisoned: { disadvantage: ['attack', 'check', 'initiative'] },
  prone: { disadvantage: ['attack'] },
  restrained: { disadvantage: ['attack'], dexSaves: true },
};

/** Conditions under which Strength and Dexterity saves fail without a roll. */
const FAILS_STR_DEX_SAVES = ['paralyzed', 'petrified', 'stunned', 'unconscious'];

const conditionName = (id: string) => (CONDITIONS.find((c) => c.id === id)?.name ?? id).toLowerCase();

/** Exhaustion level; a sheet that only marks the condition counts as level 1. */
export const exhaustionLevel = (character: Pick<Character, 'exhaustion' | 'conditions'>): number =>
  character.exhaustion ?? (character.conditions.includes('exhaustion') ? 1 : 0);

/** Sets exhaustion; the condition mark follows it, so lists of conditions show it too. */
export function setExhaustion(character: Character, level: number): Character {
  const exhaustion = Math.max(0, Math.min(6, Math.trunc(level)));
  const conditions = character.conditions.filter((id) => id !== 'exhaustion');
  return { ...character, exhaustion, conditions: exhaustion > 0 ? [...conditions, 'exhaustion'] : conditions };
}

/** Walking speed after exhaustion (−5 feet a level), never below 0. */
export const speedOf = (character: Pick<Character, 'speed' | 'exhaustion' | 'conditions'>): number =>
  Math.max(0, character.speed - 5 * exhaustionLevel(character));

/** Keys of `advantageOn` that fit a test. */
const featureKeys = (test: D20Test): string[] => {
  switch (test.kind) {
    case 'initiative':
      return ['initiative', 'check:dexterity'];
    case 'deathSave':
      return ['deathSave'];
    case 'save':
      return test.attribute ? [`save:${test.attribute}`] : [];
    case 'check':
      return [...(test.skill ? [`skill:${test.skill}`] : []), ...(test.attribute ? [`check:${test.attribute}`] : [])];
    default:
      return [];
  }
};

/**
 * How a d20 test is rolled for the hero: advantage and disadvantage from conditions, features and
 * the player's own say (`chosen`), cancelling each other when both are there, as the rules have it;
 * exhaustion's penalty to every d20 test.
 */
export function planD20(
  character: Pick<Character, 'conditions' | 'advantageOn' | 'exhaustion'>,
  test: D20Test,
  chosen?: Exclude<D20Mode, 'normal'>,
): D20Plan {
  const advantage: string[] = [];
  const disadvantage: string[] = [];
  for (const id of character.conditions) {
    const effect = CONDITION_EFFECTS[id];
    if (!effect) continue;
    if (effect.advantage?.includes(test.kind)) advantage.push(conditionName(id));
    if (effect.disadvantage?.includes(test.kind)) disadvantage.push(conditionName(id));
    if (effect.dexSaves && test.kind === 'save' && test.attribute === 'dexterity') disadvantage.push(conditionName(id));
  }
  const keys = featureKeys(test);
  if (character.advantageOn?.some((key) => keys.includes(key))) advantage.push('особенность');
  if (chosen === 'advantage') advantage.push('по выбору');
  if (chosen === 'disadvantage') disadvantage.push('по выбору');
  const mode: D20Mode =
    advantage.length > 0 && disadvantage.length === 0
      ? 'advantage'
      : disadvantage.length > 0 && advantage.length === 0
        ? 'disadvantage'
        : 'normal';
  const autoFail =
    test.kind === 'save' && (test.attribute === 'strength' || test.attribute === 'dexterity')
      ? character.conditions.find((id) => FAILS_STR_DEX_SAVES.includes(id))
      : undefined;
  return {
    mode,
    advantage,
    disadvantage,
    penalty: 2 * exhaustionLevel(character as Pick<Character, 'exhaustion' | 'conditions'>),
    ...(autoFail ? { autoFail: conditionName(autoFail) } : {}),
  };
}

/** Whether a natural roll of a weapon attack is a critical hit. */
export const isCriticalRoll = (character: Pick<Character, 'critRange'>, die: number): boolean =>
  die >= (character.critRange ?? 20);
