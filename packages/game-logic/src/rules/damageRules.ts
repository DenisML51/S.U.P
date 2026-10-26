import type { Character, DamageRule } from '@itd/schema';
import type { RollOptions } from './dice';

/** What a damage roll comes from, as the rules of features see it. */
export interface DamageSource {
  /** A weapon attack, an unarmed strike, a spell, or anything else (an ability, an item). */
  kind: 'weapon' | 'unarmed' | 'spell' | 'other';
  /** Made with an attack roll (a weapon, a spell attack): Piercer counts any attack. */
  attack?: boolean;
}

const fits = (rule: DamageRule, source: DamageSource, damageType: string | undefined): boolean => {
  if (rule.damageType && rule.damageType !== damageType) return false;
  switch (rule.on) {
    case 'weapon':
      return source.kind === 'weapon';
    case 'unarmed':
      return source.kind === 'unarmed';
    case 'attack':
      return !!source.attack;
    case 'spell':
      return source.kind === 'spell';
    case 'healing':
      return damageType === 'Лечение';
  }
};

/**
 * The rules of the hero's features that change a roll of this damage (Savage Attacker on a weapon,
 * Piercer on piercing damage). A once-a-turn rule already used this turn is left out.
 */
export const damageRulesFor = (
  character: Pick<Character, 'damageRules' | 'turnUses'>,
  source: DamageSource,
  damageType?: string,
): DamageRule[] =>
  (character.damageRules ?? []).filter(
    (rule) => fits(rule, source, damageType) && !(rule.oncePerTurn && character.turnUses?.includes(rule.id)),
  );

/** The dice options the rules give, on top of the roll's own (a critical hit, Great Weapon Fighting). */
export const rollOptionsOf = (rules: DamageRule[], base: RollOptions = {}): RollOptions => ({
  ...base,
  twice: base.twice || rules.some((r) => r.twice),
  rerollOnes: base.rerollOnes || rules.some((r) => r.rerollOnes),
  rerollLowest: base.rerollLowest || rules.some((r) => r.rerollLowest),
  onesAsTwos: base.onesAsTwos || rules.some((r) => r.onesAsTwos),
  extraCritDice: (base.extraCritDice ?? 0) + rules.reduce((sum, r) => sum + (r.extraCritDice ?? 0), 0) || undefined,
});

/** Marks once-a-turn rules as used until the turn ends. */
export function spendTurnRules(character: Character, rules: DamageRule[]): Character {
  const used = rules.filter((r) => r.oncePerTurn).map((r) => r.id);
  if (used.length === 0) return character;
  return { ...character, turnUses: [...new Set([...(character.turnUses ?? []), ...used])] };
}
