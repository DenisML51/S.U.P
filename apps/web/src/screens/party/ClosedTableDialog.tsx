import React, { useState } from 'react';
import type { PartyListItemDto } from '@itd/schema';
import { toast } from 'react-hot-toast';
import { useCharacterStore } from '../../store/useCharacterStore';
import { usePartyStore } from '../../store/usePartyStore';
import { useSessionStore } from '../../store/useSessionStore';
import { CharacterArt } from '../../ui/CharacterArt';
import { ConfirmDialog, Dialog } from '../../ui/Dialog';
import { Button } from '../../ui/primitives';
import { SETTING_INFO } from '../../ui/theme/settings';

/**
 * A player's table between sessions. The table itself stays closed until the master starts the next
 * session, but the player's own things are theirs: they can take their hero back, or leave the party.
 */
export const ClosedTableDialog: React.FC<{ party: PartyListItemDto | null; onClose: () => void }> = ({
  party,
  onClose,
}) => {
  const userId = useSessionStore((s) => s.user?.id);
  const characters = useCharacterStore((s) => s.charactersList);
  const { removeHero, removeMember } = usePartyStore.getState();
  const [busy, setBusy] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  // The list refreshes after a change: show the party the dialog was opened for until it closes.
  const live = usePartyStore((s) => s.list?.find((entry) => entry.id === party?.id)) ?? party;

  const takeBack = async (heroId: string, name: string) => {
    if (!live || busy) return;
    setBusy(heroId);
    const taken = await removeHero(live.id, heroId);
    setBusy(null);
    if (taken) toast.success(`${name} больше не сидит за этим столом`);
  };

  const leave = async () => {
    setLeaving(false);
    if (!live || !userId) return;
    if (await removeMember(live.id, userId)) {
      toast.success(`Вы покинули «${live.name}»`);
      onClose();
    }
  };

  return (
    <>
      <Dialog
        open={!!party && !leaving}
        onClose={onClose}
        setting={live?.setting}
        width="md"
        eyebrow={live ? `Между сессиями · ${SETTING_INFO[live.setting].label}` : 'Между сессиями'}
        title={live?.name ?? ''}
        subtitle={live && `Мастер ${live.masterName}`}
        footerStart={
          <Button variant="ghost" onClick={() => setLeaving(true)}>
            Покинуть партию
          </Button>
        }
        footer={
          <Button variant="primary" onClick={onClose} data-autofocus>
            Понятно
          </Button>
        }
      >
        {live && (
          <div className="space-y-4 pt-1">
            <p className="text-[15px] leading-relaxed text-ink-muted">
              Сессия не идёт — стол откроется, когда мастер её начнёт. Пока можно забрать героя: он
              вернётся к вам со всем, что с ним случилось за столом.
            </p>
            {live.myHeroes.length === 0 ? (
              <p className="text-sm text-ink-faint">Вашего героя за этим столом нет.</p>
            ) : (
              <ul className="space-y-2">
                {live.myHeroes.map((hero) => {
                  const character = characters.find((entry) => entry.id === hero.characterId);
                  const name = character?.name ?? 'Герой';
                  return (
                    <li key={hero.id} className="ui-party-row flex items-center gap-3 px-2 py-2">
                      {character ? (
                        <CharacterArt
                          source={character}
                          kind="portrait"
                          className="h-12 w-12 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <span className="h-12 w-12 shrink-0 rounded-full bg-inset" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="ui-display block truncate text-lg leading-tight text-ink">{name}</span>
                        {character && <span className="block text-xs text-ink-faint">{character.level} ур.</span>}
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={busy !== null}
                        onClick={() => void takeBack(hero.id, name)}
                      >
                        Забрать героя
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </Dialog>
      <ConfirmDialog
        open={leaving}
        setting={live?.setting}
        title="Покинуть партию?"
        message="Ваш герой уйдёт из-за стола вместе с вами. Вернуться можно по коду приглашения, когда мастер начнёт сессию."
        confirmLabel="Покинуть"
        danger
        onCancel={() => setLeaving(false)}
        onConfirm={() => void leave()}
      />
    </>
  );
};
