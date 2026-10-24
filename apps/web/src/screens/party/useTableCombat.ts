import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import type { CombatantDto, PartyDto } from '@itd/schema';
import { useSessionStore } from '../../store/useSessionStore';
import { seatOf, type Seat } from './partyView';

/**
 * The fight as the signed-in user lives it: the initiative roll asked of them as soon as the master
 * starts a fight, and a word when their turn comes. `onMyTurn` runs once each time a turn of one of
 * their heroes begins.
 */
export function useTableCombat(
  party: PartyDto | undefined,
  options: { onMyTurn?: (combatant: CombatantDto) => void; announce?: boolean } = {},
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

  const turnId = party?.combat?.phase === 'active' ? party.combat.currentCombatantId : null;
  const onMyTurn = useRef(options.onMyTurn);
  onMyTurn.current = options.onMyTurn;
  const seenTurn = useRef<string | null>(turnId);
  const myCurrent = seat.myTurn ? seat.current : null;
  const announce = options.announce !== false;
  useEffect(() => {
    if (turnId === seenTurn.current) return;
    seenTurn.current = turnId;
    if (!myCurrent) return;
    onMyTurn.current?.(myCurrent);
    if (announce) toast.success(`Ваш ход: ${myCurrent.name}`, { id: 'my-turn' });
  }, [turnId, myCurrent, announce]);

  return { ...seat, rolling, roll: setRolling };
}
