import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import type { CombatantDto, PartyDto } from '@itd/schema';
import { useSessionStore } from '../../store/useSessionStore';
import { seatOf, type Seat } from './partyView';

const readBegun = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const writeBegun = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Not remembered: a reload in the middle of the turn gives the actions back once more.
  }
};

const BEGUN = 'itd.turn-begun.';
const begunKey = (partyId: string, combatantId: string) => `${BEGUN}${partyId}.${combatantId}`;

/**
 * Forgets the turns of fights that are over: a party's marks stay only for combatants of its current
 * fight (none once it ends). Marks of the old shape (`itd.turn-begun.<combatant>`, before they named
 * their party) go too.
 */
const pruneBegun = (partyId: string, keep: ReadonlySet<string>) => {
  try {
    const own = `${BEGUN}${partyId}.`;
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith(BEGUN)) continue;
      const legacy = !key.slice(BEGUN.length).includes('.');
      if (legacy || (key.startsWith(own) && !keep.has(key.slice(own.length)))) localStorage.removeItem(key);
    }
  } catch {
    // Storage unavailable: nothing was kept either.
  }
};

/**
 * The fight as the signed-in user lives it: the initiative roll asked of them as soon as the master
 * starts a fight, and a word when their turn comes. `onMyTurn` runs once each time a turn of one of
 * their heroes begins.
 */
export function useTableCombat(
  party: PartyDto | undefined,
  options: {
    /** Runs when a turn of this party hero begins (its screen gives the actions back). */
    onMyTurn?: (combatant: CombatantDto) => void;
    forHero?: string;
    announce?: boolean;
  } = {},
): Seat & {
  /** The combatant whose initiative window is open. */
  rolling: CombatantDto | null;
  roll: (combatant: CombatantDto | null) => void;
} {
  const userId = useSessionStore((s) => s.user?.id);
  const seat = party
    ? seatOf(party, userId)
    : { isMaster: false, current: null, toRoll: [], canPassTurn: false, myTurn: false };
  const [rolling, setRolling] = useState<CombatantDto | null>(null);

  // Ask once per combatant per fight: closing the window means "later", not "ask again".
  const asked = useRef(new Set<string>());
  const firstToRoll = seat.toRoll[0];
  useEffect(() => {
    if (!firstToRoll || rolling || asked.current.has(firstToRoll.id)) return;
    asked.current.add(firstToRoll.id);
    setRolling(firstToRoll);
  }, [firstToRoll, rolling]);

  const fight = party?.combat;
  const turnId = fight?.phase === 'active' ? fight.currentCombatantId : null;
  const myCurrent = seat.myTurn ? seat.current : null;
  const announce = options.announce !== false;

  // A word when a turn of the user's hero comes (not for the turn already under way on opening).
  const seenTurn = useRef<string | null>(turnId);
  useEffect(() => {
    if (turnId === seenTurn.current) return;
    seenTurn.current = turnId;
    if (myCurrent && announce) toast.success(`Ваш ход: ${myCurrent.name}`, { id: 'my-turn' });
  }, [turnId, myCurrent, announce]);

  // The start of a turn (actions back) happens once per turn, also when the screen was reloaded or
  // opened mid-turn: the turn is identified by the fight, the round and the combatant, and remembered.
  const onMyTurn = useRef(options.onMyTurn);
  onMyTurn.current = options.onMyTurn;
  const ours = myCurrent && myCurrent.refId === options.forHero ? myCurrent : null;
  const turnKey = ours && fight ? `${fight.startedAt}:${fight.round}` : null;
  const partyId = party?.id;

  // On opening and whenever who fights changes (a fight ends, someone leaves it), old marks go.
  const fighting = fight ? fight.combatants.map((c) => c.id).join(',') : '';
  useEffect(() => {
    if (partyId) pruneBegun(partyId, new Set(fighting ? fighting.split(',') : []));
  }, [partyId, fighting]);

  useEffect(() => {
    if (!turnKey || !ours || !onMyTurn.current || !partyId) return;
    const storageKey = begunKey(partyId, ours.id);
    if (readBegun(storageKey) === turnKey) return;
    writeBegun(storageKey, turnKey);
    onMyTurn.current(ours);
  }, [turnKey, ours, partyId]);

  return { ...seat, rolling, roll: setRolling };
}
