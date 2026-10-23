import type { DamageComponent } from '@itd/schema';

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
