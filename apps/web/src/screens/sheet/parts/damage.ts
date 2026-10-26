import { formatModifier, spellAttackBonusFor, spellDamageAt, spellSaveDCFor } from '@itd/game-logic';
import type { Character, DamageComponent, Spell } from '@itd/schema';
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

export const describeDamage = (parts: DamageComponent[]) =>
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
export const upcastLabel = (spell: Pick<Spell, 'level' | 'upcastDamage' | 'cantripScaling'>): string | null =>
  spell.level > 0 && spell.upcastDamage
    ? `+${spell.upcastDamage.replace(/d/gi, DIE)} за каждый круг ячейки выше ${spell.level}-го`
    : spell.level === 0 && spell.cantripScaling
      ? 'Кости урона удваиваются, утраиваются и учетверяются на 5, 11 и 17 уровнях'
      : null;

/** A hint's damage line: "Урон 2к6 огонь", or "Лечение 2к8+2" when all it does is heal. */
export const damageFact = (parts: DamageComponent[]): [string, string] | null => {
  if (parts.length === 0) return null;
  const healing = parts.every((p) => p.type === 'Лечение');
  const text = healing ? parts.map((p) => p.damage).join(' + ') : describeDamage(parts);
  return [healing ? 'Лечение' : 'Урон', text.replace(/(\d*)d(\d+)/gi, `$1${DIE}$2`)];
};
