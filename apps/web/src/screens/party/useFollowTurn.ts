import { useEffect, useRef } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { useTableOfCharacter } from '../../store/usePartyStore';
import { useSessionStore } from '../../store/useSessionStore';

/**
 * The master plays several heroes: when the turn passes to another of the user's own heroes, the
 * combat screen follows it. The turn already under way when the screen opens stays with the hero
 * picked. Every system's combat screen calls this, so the table works the same whatever the rules.
 */
export function useFollowTurn(characterId: string): void {
  const { party } = useTableOfCharacter(characterId);
  const userId = useSessionStore((s) => s.user?.id);
  const loadCharacter = useCharacterStore((s) => s.loadCharacter);
  const fight = party?.combat ?? null;
  const turnId = fight?.phase === 'active' ? fight.currentCombatantId : null;
  const followedTurn = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!party) return;
    if (followedTurn.current === undefined || turnId === followedTurn.current) {
      followedTurn.current = turnId;
      return;
    }
    followedTurn.current = turnId;
    const current = fight?.combatants.find((c) => c.id === turnId);
    if (current?.kind !== 'hero') return;
    const hero = party.heroes.find((h) => h.id === current.refId && h.ownerId === userId);
    if (hero && hero.characterId !== characterId) void loadCharacter(hero.characterId, 'hotbar');
  }, [party, fight, turnId, userId, characterId, loadCharacter]);
}
