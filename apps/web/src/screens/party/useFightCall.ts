import { useEffect } from 'react';
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
 * When the master starts a fight, every player at the table is taken to their hero's combat screen,
 * wherever they are in the app — once per fight; afterwards they move freely. Leaving combat goes
 * back to the party's table.
 */
export function useFightCall(): void {
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
