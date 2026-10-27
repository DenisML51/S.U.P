import { formatModifier, spellAttackBonusFor, spellDamageAt, spellSaveDCFor } from '@itd/game-logic';
import type { Ability, Character, DamageComponent, HitPointCost, Resource, Spell } from '@itd/schema';
import { DIE } from '../../../i18n';

/** A formula that deals something: not empty and not a bare zero. */
const deals = (part: DamageComponent) => part.damage.trim() !== '' && part.damage.trim() !== '0';

/** Damage of an attack, ability or spell as components, whichever way the sheet stores it. */
export const damageParts = (entry: { damage?: string; damageType?: string; damageComponents?: DamageComponent[] }) =>
  (entry.damageComponents && entry.damageComponents.length > 0
    ? entry.damageComponents
    : entry.damage
      ? [{ damage: entry.damage, type: entry.damageType ?? '' }]
      : []
  ).filter(deals);

export const describeDamage = (parts: { damage: string; type?: string }[]) =>
  parts.map((p) => `${p.damage}${p.type ? ` ${p.type.toLowerCase()}` : ''}`).join(' + ');

/**
 * A spell's damage as it stands for this hero now: a cantrip at their level's tier, a spell with
 * the slot it is cast with (its own level unless given), plus the modifier when the spell adds it.
 */
export const spellDamageParts = (character: Character, spell: Spell, slotLevel = spell.level) => {
  const parts = damageParts(spell);
  if (parts.length === 0) return parts;
  const first = spellDamageAt(character, { ...spell, damage: parts[0]!.damage }, slotLevel) ?? parts[0]!.damage;
  return [{ ...parts[0]!, damage: first }, ...parts.slice(1)];
};

const SAVE_OF: Record<string, string> = {
  strength: 'Силы',
  dexterity: 'Ловкости',
  constitution: 'Телосложения',
  intelligence: 'Интеллекта',
  wisdom: 'Мудрости',
  charisma: 'Харизмы',
};

/** How an entry reaches its target: "+5 к попаданию" or "СЛ 13, спасбросок Ловкости". */
export function hitLabel(
  character: Character,
  entry: { attackRoll?: string; saveAttribute?: string; saveDC?: number; hitBonus?: number },
  spell = false,
): string | null {
  if (entry.saveAttribute) {
    const dc = spell ? spellSaveDCFor(character, entry as Spell) : entry.saveDC;
    return `${dc !== undefined ? `СЛ ${dc}, ` : ''}спасбросок ${SAVE_OF[entry.saveAttribute] ?? entry.saveAttribute}`;
  }
  if (spell && entry.attackRoll) return `${formatModifier(spellAttackBonusFor(character, entry as Spell))} к попаданию`;
  if (!spell && entry.hitBonus !== undefined) return `${formatModifier(entry.hitBonus)} к попаданию`;
  return null;
}

/** What a higher slot or level adds to a spell, for its card. */
export const upcastLabel = (spell: Pick<Spell, 'level' | 'upcastDamage' | 'slotDamage' | 'cantripScaling'>): string | null =>
  spell.level > 0 && spell.slotDamage && Object.keys(spell.slotDamage).length > 0
    ? Object.entries(spell.slotDamage)
        .map(([level, dice]) => `${dice.replace(/d/gi, DIE)} с ${level}-го круга`)
        .join(', ')
    : spell.level > 0 && spell.upcastDamage
    ? `+${spell.upcastDamage.replace(/d/gi, DIE)} за каждый круг ячейки выше ${spell.level}-го`
    : spell.level === 0 && spell.cantripScaling
      ? 'Кости урона удваиваются, утраиваются и учетверяются на 5, 11 и 17 уровнях'
      : null;

/** Hit points a feature costs, for people: "1к4 хитов", "1к6 хитов и максимума (меньшее из двух, −2)". */
export const hitPointCostLabel = (cost: HitPointCost): string => {
  const rules = [cost.rollTwice && 'меньшее из двух', cost.minus && `−${cost.minus}`, cost.min && `не меньше ${cost.min}`].filter(Boolean);
  return `${cost.dice.replace(/d/gi, DIE)} хитов${cost.lowersMax ? ' и максимума' : ''}${rules.length > 0 ? ` (${rules.join(', ')})` : ''}`;
};

/** What a use of an ability costs in hit points now: its own price, and a use bought with them once its pool is empty. */
export const hitPointCostsOf = (
  entry: Pick<Ability, 'hpCost' | 'hpCostWhenSpent' | 'resourceCost'>,
  pool: Resource | undefined,
): (HitPointCost | undefined)[] => [entry.hpCost, pool && pool.current < (entry.resourceCost ?? 1) ? entry.hpCostWhenSpent : undefined];

/** Hit point costs in one line: "−1к4 хитов + −1к6 хитов и максимума", the same twice as "×2"; or that it takes no blood. */
export const priceLabel = (costs: (HitPointCost | undefined)[]): string => {
  const counts = new Map<string, number>();
  for (const cost of costs) if (cost) counts.set(hitPointCostLabel(cost), (counts.get(hitPointCostLabel(cost)) ?? 0) + 1);
  if (counts.size === 0) return 'без платы хитами';
  return [...counts].map(([label, count]) => `−${label}${count > 1 ? ` ×${count}` : ''}`).join(' + ');
};

/**
 * A hit point cost as a fact of a card: what it is in the label ("Без запаса · жертва" off the maximum
 * too, "· хиты" otherwise), the dice in the value ("−1к6", "−1к10, меньшее из двух").
 */
export const costFact = (label: string, cost: HitPointCost): { label: string; value: string } => {
  const rules = [cost.rollTwice && 'меньшее из двух', cost.minus && `−${cost.minus}`, cost.min && `не меньше ${cost.min}`].filter(Boolean);
  return {
    label: `${label} · ${cost.lowersMax ? 'жертва' : 'хиты'}`,
    value: `−${cost.dice.replace(/d/gi, DIE)}${rules.length > 0 ? `, ${rules.join(', ')}` : ''}`,
  };
};

/** A hint's damage line: "Урон 2к6 огонь", or "Лечение 2к8+2" when all it does is heal. */
export const damageFact = (parts: DamageComponent[]): [string, string] | null => {
  if (parts.length === 0) return null;
  const healing = parts.every((p) => p.type === 'Лечение');
  const text = healing ? parts.map((p) => p.damage).join(' + ') : describeDamage(parts);
  return [healing ? 'Лечение' : 'Урон', text.replace(/(\d*)d(\d+)/gi, `$1${DIE}$2`)];
};
