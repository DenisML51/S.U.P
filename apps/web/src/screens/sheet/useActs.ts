import type { Ability, Attack, Spell } from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';
import { damageParts } from './parts/damage';
import { useRolls } from './useRolls';

/**
 * What the hero does with an entry of the sheet: attack, use an ability, cast a spell. The same
 * from a list row and from the entry's dialog. Costs (ammunition, resources) are paid by the store,
 * which refuses with a message when they cannot be.
 */
export function useActs() {
  const performAction = useCharacterStore((s) => s.performAction);
  const logHistory = useCharacterStore((s) => s.logHistory);
  const roll = useRolls();

  const attack = (entry: Attack) => {
    if (entry.usesAmmunition && !performAction({ kind: 'attack', id: entry.id })?.ok) return;
    roll.check(`${entry.name}: попадание`, entry.hitBonus);
    roll.damage(`${entry.name}: урон`, damageParts(entry));
  };

  const activate = (entry: Ability) => {
    if (entry.resourceId) {
      if (!performAction({ kind: 'ability', id: entry.id })?.ok) return;
    } else {
      logHistory(`Способность: ${entry.name}`);
    }
    roll.damage(entry.name, damageParts(entry));
  };

  const cast = (spell: Spell) => {
    if (!performAction({ kind: 'spell', id: spell.id })?.ok) return;
    roll.damage(spell.name, damageParts(spell));
  };

  return { attack, activate, cast };
}
