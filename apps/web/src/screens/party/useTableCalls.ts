import { useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useCharacterStore } from '../../store/useCharacterStore';
import { useNavStore } from '../../store/useNavStore';
import { useParty, usePartyStore } from '../../store/usePartyStore';

const SUMMONED_KEY = 'itd.party.summoned';

/** Fights this tab has already pulled the player into, so leaving the combat screen is respected. */
const summoned = (): string[] => {
  try {
    return JSON.parse(sessionStorage.getItem(SUMMONED_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
};
const remember = (key: string) => {
  try {
    sessionStorage.setItem(SUMMONED_KEY, JSON.stringify([...summoned().slice(-20), key]));
  } catch {
    // Not remembered: a reload may summon once more.
  }
};

/**
 * What the master's table asks of a player wherever they are in the app:
 * - a fight starts → they are taken to their hero's combat screen (once per fight, then they move freely);
 * - the session ends → they leave the world: the table and their party hero's screens close.
 */
export function useTableCalls(): void {
  useFightCall();
  useSessionEnd();
}

function useFightCall(): void {
  const target = usePartyStore((s) =>
    s.list?.find((party) => party.role === 'player' && party.inCombat && party.myCharacterIds.length > 0),
  );
  const party = useParty(target?.id);
  const startedAt = party?.combat?.startedAt;
  const characterId = target?.myCharacterIds[0];

  useEffect(() => {
    if (!party || !startedAt || !characterId) return;
    const key = `${party.id}:${startedAt}`;
    if (summoned().includes(key)) return;
    remember(key);

    const { character, loadCharacter, setViewMode } = useCharacterStore.getState();
    const nav = useNavStore.getState();
    if (nav.creation) nav.endCreation();
    nav.go({ screen: 'party', partyId: party.id });
    if (character?.id === characterId) setViewMode('hotbar');
    else void loadCharacter(characterId, 'hotbar');
    toast(`Бой! Мастер «${party.name}» зовёт к оружию`, { icon: '⚔️', id: key });
  }, [party, startedAt, characterId]);
}

function useSessionEnd(): void {
  const list = usePartyStore((s) => s.list);
  /** Sessions seen running in this tab, so only an actual end (not a closed table at load) sends anyone away. */
  const running = useRef(new Set<string>());

  useEffect(() => {
    for (const party of list ?? []) {
      if (party.role !== 'player') continue;
      if (party.inSession) {
        running.current.add(party.id);
        continue;
      }
      if (!running.current.delete(party.id)) continue;

      const { character, goToCharacterList } = useCharacterStore.getState();
      const nav = useNavStore.getState();
      const inWorld =
        (nav.place.screen === 'party' && nav.place.partyId === party.id) ||
        (character !== null && party.myCharacterIds.includes(character.id));
      if (!inWorld) continue;
      if (character && party.myCharacterIds.includes(character.id)) goToCharacterList();
      nav.go({ screen: 'home' });
      toast(`Мастер завершил сессию «${party.name}». До встречи за столом!`, { icon: '🌙', id: `ended-${party.id}` });
    }
  }, [list]);
}
