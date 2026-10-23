import type { Ability, Attack, Spell } from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';
import { damageParts } from './parts/damage';
import { useRolls } from './useRolls';

/**
 * What the hero does with an entry of the sheet: attack, use an ability, cast a spell. The same
 * from a list row, an entry's dialog and the combat bar. Costs (ammunition, resources and, in
 * combat, the action itself) are paid by the store, which refuses with a message when they cannot be.
 */
export function useActs({ inCombat = false }: { inCombat?: boolean } = {}) {
  const performAction = useCharacterStore((s) => s.performAction);
  const logHistory = useCharacterStore((s) => s.logHistory);
  const roll = useRolls();

  const attack = (entry: Attack) => {
    if ((entry.usesAmmunition || inCombat) && !performAction({ kind: 'attack', id: entry.id, trackActionEconomy: inCombat })?.ok) return;
    roll.check(`${entry.name}: попадание`, entry.hitBonus);
    roll.damage(`${entry.name}: урон`, damageParts(entry));
  };

  const activate = (entry: Ability) => {
    if (entry.resourceId || inCombat) {
      if (!performAction({ kind: 'ability', id: entry.id, trackActionEconomy: inCombat })?.ok) return;
    } else {
      logHistory(`Способность: ${entry.name}`);
    }
    roll.damage(entry.name, damageParts(entry));
  };

  const cast = (spell: Spell) => {
    if (!performAction({ kind: 'spell', id: spell.id, trackActionEconomy: inCombat })?.ok) return;
    roll.damage(spell.name, damageParts(spell));
  };

  return { attack, activate, cast };
}
