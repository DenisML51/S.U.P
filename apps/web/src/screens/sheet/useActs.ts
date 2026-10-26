import type { Ability, Attack, Spell } from '@itd/schema';
import {
  ammunitionChoices,
  castableSlots,
  isActiveFeature,
  resolveAmmunition,
  slotConversions,
  spellAttackBonusFor,
  type DamageSource,
} from '@itd/game-logic';
import { toast } from 'react-hot-toast';
import { useCharacterStore } from '../../store/useCharacterStore';
import { damageParts, describeDamage, spellDamageParts } from './parts/damage';
import { useConcentrationPrompt, useEndFeature } from './Concentration';
import { useSlotPrompt } from './SlotPrompt';
import { useAmmoPrompt } from './AmmoPrompt';
import { useAmountPrompt } from './AmountPrompt';
import { useRolls, type DamageComponents } from './useRolls';

/** What `amount` units of an ability of a chosen cost give: "1" a unit is the amount, "1d8" so many dice. */
function perPoint(entry: Ability, amount: number): { damage: string; type: string }[] {
  const each = entry.damagePerPoint ?? '';
  const dice = /^(\d*)d(\d+)$/.exec(each);
  const damage = dice ? `${amount * Number(dice[1] || 1)}d${dice[2]}` : /^\d+$/.test(each) ? String(amount * Number(each)) : '';
  return damage ? [{ damage, type: entry.damageType ?? '' }] : [];
}

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
  const askAmmo = useAmmoPrompt((s) => s.ask);
  const askAmount = useAmountPrompt((s) => s.ask);
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  const askReplace = useConcentrationPrompt((s) => s.askReplace);
  const endFeature = useEndFeature();
  const roll = useRolls();
  const turnLock = useCharacterStore((s) => s.turnLock);
  /** Out of the hero's turn in a party's fight only reactions are taken, wherever they are asked from. */
  const onTurn = (entry: Attack | Ability | Spell, run: () => void) => {
    if (turnLock && entry.actionType !== 'reaction') toast.error(turnLock, { id: 'turn-lock' });
    else run();
  };

  /**
   * What an entry rolls once it is used. With an attack roll the hit comes first and its damage is
   * rolled from the hit's toast; a saving throw or an effect that always lands rolls straight away.
   */
  const strike = (
    label: string,
    hitBonus: number | undefined,
    parts: DamageComponents,
    weapon: { minDie?: number; twoHanded?: DamageComponents; spell?: boolean; source?: DamageSource } = {},
  ) => {
    // In a fight a once-a-turn feature (Savage Attacker) is spent with the roll it changes.
    if (hitBonus !== undefined) roll.attack(label, hitBonus, parts, { ...weapon, tracked: inCombat });
    else roll.damage(label, parts, { minDie: weapon.minDie, source: weapon.source, tracked: inCombat });
  };

  const attack = (entry: Attack, ammunitionItemId?: string) => {
    // Different stacks would do (arrows and +1 arrows): the player says which, once for this attack.
    if (entry.usesAmmunition && !ammunitionItemId && character && !resolveAmmunition(character, entry) && ammunitionChoices(character).length > 1) {
      askAmmo(entry, (itemId) => {
        updateCharacter((doc) => ({
          ...doc,
          attacks: doc.attacks.map((a) => (a.id === entry.id ? { ...a, ammunitionItemId: itemId } : a)),
        }));
        attack(entry, itemId);
      });
      return;
    }
    // The roll tells what happened; spending the action or the arrow shows no message of its own.
    const pays = entry.usesAmmunition || entry.thrown || inCombat;
    if (pays && !performAction({ kind: 'attack', id: entry.id, trackActionEconomy: inCombat, ammunitionItemId }, { quiet: true })?.ok) return;
    // A versatile weapon offers its two-handed damage beside the one-handed.
    const twoHanded = entry.damageTwoHanded
      ? [{ damage: entry.damageTwoHanded, type: damageParts(entry)[0]?.type }]
      : undefined;
    const source: DamageSource = {
      kind: entry.weaponId ? 'weapon' : entry.id.includes('unarmed-strike') ? 'unarmed' : 'other',
      attack: true,
    };
    strike(entry.name, entry.hitBonus, damageParts(entry), { minDie: entry.minDie, twoHanded, source });
  };

  /** An entry that needs concentration asks first when it would end another one. */
  const concentrating = (entry: Ability | Spell, run: () => void) => {
    const current = character?.concentratingOn;
    if (entry.concentration && current && current.id !== entry.id) askReplace(current.name, entry.name, run);
    else run();
  };

  /**
   * An ability: one of a chosen cost (Lay on Hands) asks how much first, a conversion (Font of
   * Magic) which slot; what it deals follows the amount.
   */
  const apply = (entry: Ability, choice: { amount?: number; level?: number } = {}) => {
    const pool = character?.resources.find((r) => r.id === entry.resourceId);
    if (entry.convert && choice.level === undefined && character && entry.resourceId) {
      const toPoints = entry.convert === 'slotToPoints';
      askAmount({
        kind: 'options',
        title: entry.name,
        options: slotConversions(character, entry.resourceId, entry.convert).map((o) => ({
          key: String(o.level),
          label: `Ячейка ${o.level} круга`,
          detail: toPoints ? `+${o.amount} очк.` : `−${o.amount} очк.`,
          blocked: o.blocked,
          onPick: () => apply(entry, { level: o.level }),
        })),
      });
      return;
    }
    const least = entry.resourceCost ?? 1;
    if (entry.resourceCostMax && entry.resourceCostMax > least && choice.amount === undefined && pool) {
      const most = Math.min(entry.resourceCostMax, pool.current);
      if (most < least) {
        toast.error(`Недостаточно ресурса «${pool.name}»: нужно ${least}, есть ${pool.current}`);
        return;
      }
      askAmount({
        kind: 'amount',
        title: entry.name,
        unit: pool.name,
        min: least,
        max: most,
        preview: entry.damagePerPoint ? (n) => describeDamage(perPoint(entry, n)) : undefined,
        onPick: (amount) => apply(entry, { amount }),
      });
      return;
    }
    const parts = choice.amount !== undefined && entry.damagePerPoint ? perPoint(entry, choice.amount) : damageParts(entry);
    const hitBonus = entry.saveAttribute ? undefined : entry.hitBonus;
    const rolls = hitBonus !== undefined || parts.length > 0;
    if (entry.resourceId || entry.concentration || inCombat) {
      const request = { kind: 'ability' as const, id: entry.id, trackActionEconomy: inCombat, resourceAmount: choice.amount, conversionLevel: choice.level };
      if (!performAction(request, { quiet: rolls })?.ok) return;
    } else {
      logHistory(`Способность: ${entry.name}`);
    }
    if (rolls) strike(entry.name, hitBonus, parts);
  };

  const castWith = (spell: Spell, slotLevel?: number) => {
    if (!character) return;
    const parts = spellDamageParts(character, spell, slotLevel ?? spell.level);
    const hitBonus = spell.attackRoll ? spellAttackBonusFor(character, spell) : undefined;
    const rolls = hitBonus !== undefined || parts.length > 0;
    if (!performAction({ kind: 'spell', id: spell.id, trackActionEconomy: inCombat, slotLevel }, { quiet: rolls })?.ok) return;
    const upcast = slotLevel !== undefined && slotLevel > spell.level ? ` (${slotLevel} круг)` : '';
    if (rolls) strike(`${spell.name}${upcast}`, hitBonus, parts, { spell: true, source: { kind: 'spell', attack: hitBonus !== undefined } });
  };

  const castFrom = (spell: Spell) => {
    if (!character) return;
    // Only spells paid with spell slots choose one.
    const usesSlot = spell.level > 0 && character.resources.some((r) => r.id === spell.resourceId && r.spellSlotLevel !== undefined);
    const slots = usesSlot ? castableSlots(character, spell) : [];
    // Several slot levels to choose from make it a real choice; a warlock's single pact level does not.
    if (new Set(slots).size > 1 && slots.some((level) => level > spell.level)) askSlot(spell, slots, (level) => castWith(spell, level));
    else castWith(spell, slots[0]);
  };

  /** A ritual: no slot, ten minutes longer, so out of a fight's turn; what it deals still rolls. */
  const ritual = (spell: Spell) => {
    if (!character) return;
    const parts = spellDamageParts(character, spell, spell.level);
    const hitBonus = spell.attackRoll ? spellAttackBonusFor(character, spell) : undefined;
    const rolls = hitBonus !== undefined || parts.length > 0;
    if (!performAction({ kind: 'spell', id: spell.id, asRitual: true }, { quiet: rolls })?.ok) return;
    if (rolls) strike(`${spell.name} (ритуал)`, hitBonus, parts, { spell: true, source: { kind: 'spell', attack: hitBonus !== undefined } });
  };

  // An ability that is on (Rage) is ended by the same button, without an action.
  const activate = (entry: Ability) =>
    entry.stance && character && isActiveFeature(character, entry.id)
      ? endFeature(entry.id, entry.name)
      : onTurn(entry, () => concentrating(entry, () => apply(entry)));
  const cast = (spell: Spell) => onTurn(spell, () => concentrating(spell, () => castFrom(spell)));

  return {
    attack: (entry: Attack) => onTurn(entry, () => attack(entry)),
    activate,
    cast,
    ritual: (spell: Spell) => concentrating(spell, () => ritual(spell)),
  };
}
