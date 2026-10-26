import { useEffect } from 'react';
import { useCharacterStore } from '../store/useCharacterStore';
import { usePartyStore } from '../store/usePartyStore';
import { useSessionStore } from '../store/useSessionStore';
import { keepAsWritten, translating } from './index';

/**
 * Hands the translator every name the stores hold — heroes, NPCs, tables, players — as they arrive,
 * so a hero called "Тень" stays "Тень" in English too. Nothing to do in Russian.
 */
export function useNamesAsWritten(): void {
  useEffect(() => {
    if (!translating) return;
    const fromCharacters = () => {
      const { charactersList, character } = useCharacterStore.getState();
      keepAsWritten([...charactersList.map((c) => c.name), character?.name]);
    };
    const fromParties = () => {
      const { list, parties } = usePartyStore.getState();
      keepAsWritten((list ?? []).map((p) => p.name));
      for (const party of Object.values(parties)) {
        keepAsWritten([
          party.name,
          ...party.heroes.map((h) => h.name),
          ...(party.npcs ?? []).map((n) => n.name),
          ...party.members.map((m) => m.displayName),
          ...(party.combat?.combatants.map((c) => c.name) ?? []),
        ]);
      }
    };
    const fromSession = () => keepAsWritten([useSessionStore.getState().user?.displayName]);
    fromCharacters();
    fromParties();
    fromSession();
    const stops = [
      useCharacterStore.subscribe(fromCharacters),
      usePartyStore.subscribe(fromParties),
      useSessionStore.subscribe(fromSession),
    ];
    return () => stops.forEach((stop) => stop());
  }, []);
}
