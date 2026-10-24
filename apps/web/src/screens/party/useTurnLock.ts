import { useEffect } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { useParty, usePartyOfCharacter } from '../../store/usePartyStore';

/**
 * While the party of this hero fights, the hero acts only on its own turn: the lock is set in the
 * character store (which refuses actions and edits) for as long as the screen calling this is shown.
 */
export function useTurnLock(characterId: string | undefined): void {
  const party = useParty(usePartyOfCharacter(characterId)?.id);
  const setTurnLock = useCharacterStore((s) => s.setTurnLock);
  const fight = party?.combat;
  const heroId = party?.heroes.find((hero) => hero.characterId === characterId)?.id;
  const current = fight?.combatants.find((c) => c.id === fight.currentCombatantId);

  let lock: string | null = null;
  if (fight && heroId) {
    if (fight.phase === 'initiative') lock = 'Идёт бросок инициативы — действовать можно в свой ход';
    else if (current?.refId !== heroId) lock = current ? `Сейчас ходит ${current.name} — действовать можно в свой ход` : 'Сейчас не ваш ход';
  }

  useEffect(() => {
    setTurnLock(lock);
  }, [lock, setTurnLock]);
  useEffect(() => () => setTurnLock(null), [setTurnLock]);
}
