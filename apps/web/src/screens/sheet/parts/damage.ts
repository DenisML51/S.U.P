import type { DamageComponent } from '@itd/schema';

/** Damage of an attack, ability or spell as components, whichever way the sheet stores it. */
export const damageParts = (entry: { damage?: string; damageType?: string; damageComponents?: DamageComponent[] }) =>
  entry.damageComponents && entry.damageComponents.length > 0
    ? entry.damageComponents
    : entry.damage
      ? [{ damage: entry.damage, type: entry.damageType ?? '' }]
      : [];

export const describeDamage = (parts: DamageComponent[]) =>
  parts.map((p) => `${p.damage}${p.type ? ` ${p.type.toLowerCase()}` : ''}`).join(' + ');
