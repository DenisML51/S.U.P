import type { CombatantDto, PartyDto } from '@itd/schema';

/**
 * What the signed-in user can do and must do at a table, derived from the party view. Shared by the
 * party screen and the combat screen.
 */
export interface Seat {
  isMaster: boolean;
  /** The combatant whose turn it is. */
  current: CombatantDto | null;
  /** The user's own heroes in the fight still to roll initiative (the master's own heroes included). */
  toRoll: CombatantDto[];
  /** The turn is the user's to pass: their hero's, or anyone's for the master. */
  canPassTurn: boolean;
  /** The turn belongs to one of the user's own heroes. */
  myTurn: boolean;
}

export function seatOf(party: PartyDto, userId: string | undefined): Seat {
  const isMaster = party.role === 'master';
  const owners = new Map(party.heroes.map((hero) => [hero.id, hero.ownerId]));
  const ownsCombatant = (combatant: CombatantDto) => combatant.kind === 'hero' && owners.get(combatant.refId) === userId;

  const combat = party.combat;
  const current = combat?.combatants.find((c) => c.id === combat.currentCombatantId) ?? null;
  const toRoll =
    combat?.phase === 'initiative' ? combat.combatants.filter((c) => c.initiative === null && ownsCombatant(c)) : [];
  const myTurn = !!current && ownsCombatant(current);
  return {
    isMaster,
    current,
    toRoll,
    myTurn,
    canPassTurn: combat?.phase === 'active' && !!current && (isMaster || myTurn),
  };
}

/** Initiative modifier of a combatant, when the viewer knows it. */
export function initiativeBonusOf(party: PartyDto, combatant: CombatantDto): number | null {
  if (combatant.kind === 'hero') return party.heroes.find((hero) => hero.id === combatant.refId)?.vitals?.initiative ?? null;
  return party.npcs?.find((npc) => npc.id === combatant.refId)?.initiativeBonus ?? null;
}

export const formatBonus = (value: number) => (value >= 0 ? `+${value}` : `−${Math.abs(value)}`);
