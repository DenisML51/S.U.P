import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import type { PartyListItemDto } from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';
import { usePartyStore } from '../../store/usePartyStore';
import { CharacterArt } from '../../ui/CharacterArt';
import { Dialog } from '../../ui/Dialog';
import { Button } from '../../ui/primitives';

/**
 * The player's heroes seated at a table, to take back while no session runs (the table itself is
 * closed then). A hero taken away leaves the party; it can be brought again at the next session.
 */
export const TakeHeroDialog: React.FC<{ party: PartyListItemDto | null; onClose: () => void }> = ({ party, onClose }) => {
  const charactersList = useCharacterStore((s) => s.charactersList);
  const removeHero = usePartyStore((s) => s.removeHero);
  const [busy, setBusy] = useState<string | null>(null);
  const seats = party?.myHeroes ?? [];

  const take = async (heroId: string, name: string) => {
    if (!party) return;
    setBusy(heroId);
    const done = await removeHero(party.id, heroId);
    setBusy(null);
    if (!done) return;
    toast.success(`${name} покидает «${party.name}»`);
    if (seats.length <= 1) onClose();
  };

  return (
    <Dialog
      open={party !== null}
      onClose={onClose}
      title="Забрать героя"
      subtitle={party ? `Партия «${party.name}»` : undefined}
      width="md"
      setting={party?.setting}
      footer={
        <Button variant="ghost" onClick={onClose}>
          Закрыть
        </Button>
      }
    >
      <p className="mb-4 text-sm text-ink-muted">
        Герой покинет партию. Вернуть его можно на следующей сессии, снова приведя к столу.
      </p>
      <ul className="flex flex-col gap-2">
        {seats.map((seat) => {
          const hero = charactersList.find((c) => c.id === seat.characterId);
          const name = hero?.name ?? 'Герой';
          return (
            <li key={seat.id} className="flex items-center gap-3 border border-line/60 p-2" style={{ borderRadius: 'var(--radius)' }}>
              {hero ? (
                <CharacterArt source={hero} kind="portrait" className="h-12 w-12 shrink-0 overflow-hidden" />
              ) : (
                <span className="h-12 w-12 shrink-0 bg-inset" />
              )}
              <span className="min-w-0 flex-1">
                <span className="ui-display block truncate text-lg leading-tight text-ink">{name}</span>
                {hero && <span className="block truncate text-xs text-ink-muted">Уровень {hero.level}</span>}
              </span>
              <Button size="sm" disabled={busy !== null} onClick={() => void take(seat.id, name)}>
                Забрать
              </Button>
            </li>
          );
        })}
      </ul>
    </Dialog>
  );
};
