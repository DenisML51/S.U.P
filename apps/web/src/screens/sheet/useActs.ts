import type { Ability, Attack, Spell } from '@itd/schema';
import { castableSlots, spellAttackBonus } from '@itd/game-logic';
import { useCharacterStore } from '../../store/useCharacterStore';
import { damageParts, spellDamageParts } from './parts/damage';
import { useConcentrationPrompt } from './Concentration';
import { useSlotPrompt } from './SlotPrompt';
import { useRolls } from './useRolls';

/**
 * What the hero does with an entry of the sheet: attack, use an ability, cast a spell. The same
 * from a list row, an entry's dialog and the combat bar. Costs (ammunition, resources and, in
 * combat, the action itself) are paid by the store, which refuses with a message when they cannot be.
 * A spell that could be cast with a higher slot asks which one first; what it deals follows the slot.
 * Starting a concentration that would end another asks before anything is spent.
 */
export function useActs({ inCombat = false }: { inCombat?: boolean } = {}) {
  const performAction = useCharacterStore((s) => s.performAction);
  const logHistory = useCharacterStore((s) => s.logHistory);
  const character = useCharacterStore((s) => s.character);
  const askSlot = useSlotPrompt((s) => s.ask);
  const askReplace = useConcentrationPrompt((s) => s.askReplace);
  const roll = useRolls();

  const attack = (entry: Attack) => {
    if ((entry.usesAmmunition || inCombat) && !performAction({ kind: 'attack', id: entry.id, trackActionEconomy: inCombat })?.ok) return;
    roll.check(`${entry.name}: попадание`, entry.hitBonus);
    roll.damage(`${entry.name}: урон`, damageParts(entry));
  };

  /** An entry that needs concentration asks first when it would end another one. */
  const concentrating = (entry: Ability | Spell, run: () => void) => {
    const current = character?.concentratingOn;
    if (entry.concentration && current && current.id !== entry.id) askReplace(current.name, entry.name, run);
    else run();
  };

  const use = (entry: Ability) => {
    if (entry.resourceId || entry.concentration || inCombat) {
      if (!performAction({ kind: 'ability', id: entry.id, trackActionEconomy: inCombat })?.ok) return;
    } else {
      logHistory(`Способность: ${entry.name}`);
    }
    if (entry.hitBonus !== undefined) roll.check(`${entry.name}: попадание`, entry.hitBonus);
    roll.damage(entry.name, damageParts(entry));
  };

  const castWith = (spell: Spell, slotLevel?: number) => {
    if (!character) return;
    if (!performAction({ kind: 'spell', id: spell.id, trackActionEconomy: inCombat, slotLevel })?.ok) return;
    const upcast = slotLevel !== undefined && slotLevel > spell.level ? ` (${slotLevel} круг)` : '';
    if (spell.attackRoll) roll.check(`${spell.name}: попадание`, spellAttackBonus(character));
    roll.damage(`${spell.name}${upcast}`, spellDamageParts(character, spell, slotLevel ?? spell.level));
  };

  const castFrom = (spell: Spell) => {
    if (!character) return;
    // Only spells paid with spell slots choose one; a higher free slot makes it a real choice.
    const usesSlot = spell.level > 0 && character.resources.some((r) => r.id === spell.resourceId && r.spellSlotLevel !== undefined);
    const slots = usesSlot ? castableSlots(character, spell) : [];
    if (slots.some((level) => level > spell.level)) askSlot(spell, slots, (level) => castWith(spell, level));
    else castWith(spell, slots[0]);
  };

  const activate = (entry: Ability) => concentrating(entry, () => use(entry));
  const cast = (spell: Spell) => concentrating(spell, () => castFrom(spell));

  return { attack, activate, cast };
}
