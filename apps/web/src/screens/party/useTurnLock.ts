import { useEffect } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { useParty, usePartyOfCharacter } from '../../store/usePartyStore';

/**
 * While the party of this hero fights and the hero is in the fight, the hero acts only on its own turn: the lock is set in the
 * character store (which refuses actions and edits) for as long as the screen calling this is shown.
 */
export function useTurnLock(characterId: string | undefined): void {
  const party = useParty(usePartyOfCharacter(characterId)?.id);
  const setTurnLock = useCharacterStore((s) => s.setTurnLock);
  const fight = party?.combat;
  const heroId = party?.heroes.find((hero) => hero.characterId === characterId)?.id;
  const current = fight?.combatants.find((c) => c.id === fight.currentCombatantId);
  // A hero the master left out of the fight (a scout away, a guard at the door) is not held by it.
  const fighting = !!heroId && !!fight?.combatants.some((c) => c.kind === 'hero' && c.refId === heroId);

  let lock: string | null = null;
  if (fight && fighting) {
    if (fight.phase === 'initiative') lock = 'Идёт бросок инициативы — действовать можно в свой ход';
    else if (current?.refId !== heroId) lock = current ? `Сейчас ходит ${current.name} — действовать можно в свой ход` : 'Сейчас не ваш ход';
  }

  useEffect(() => {
    setTurnLock(lock);
  }, [lock, setTurnLock]);
  useEffect(() => () => setTurnLock(null), [setTurnLock]);
}
