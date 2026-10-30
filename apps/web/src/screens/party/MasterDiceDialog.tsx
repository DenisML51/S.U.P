import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import type { PartyDto, TableCheck, TableDie } from '@itd/schema';
import { announceMasterRoll, announceRoll } from '../../store/useTableRollStore';
import { DiceDialog, type DiceTarget } from '../sheet/dialogs/DiceDialog';
import { Segmented } from '../../ui/forms';
import { cx } from '../../ui/primitives';

/**
 * The master's dice tray at the table: the throw lands over the screens of the whole table, or
 * only of the players whose heroes are chosen; for several chosen heroes, one shared throw or a
 * throw of each one's own. Opened from a fight for one of the master's own heroes (`hero`), a throw
 * for everyone is that hero's, shown on its portrait as a player's would be.
 */
export const MasterDiceDialog: React.FC<{
  open: boolean;
  party: PartyDto;
  onClose: () => void;
  hero?: { characterId: string; name: string };
}> = ({ open, party, onClose, hero }) => {
  const [audience, setAudience] = useState<'all' | 'some' | 'me'>('all');
  const [spread, setSpread] = useState<'shared' | 'each'>('shared');
  const [chosen, setChosen] = useState<string[]>([]);
  const heroes = party.heroes.filter((h) => h.ownerId !== party.masterId);
  const picked = chosen.filter((id) => heroes.some((h) => h.id === id));
  const separate = audience === 'some' && spread === 'each' && picked.length > 1;
  const targets: DiceTarget[] | undefined = separate
    ? heroes.filter((h) => picked.includes(h.id)).map((h) => ({ id: h.id, name: h.name }))
    : undefined;

  const thrown = (dice: TableDie[], label: string, target: DiceTarget | undefined, check: TableCheck) => {
    // A secret throw: the master sees it in the tray, the table never does.
    if (audience === 'me') return;
    if (audience === 'all' && hero) {
      announceRoll(hero.characterId, dice, label, check);
      return;
    }
    if (audience === 'some' && picked.length === 0) {
      toast.error('Бросок никому не показан: выберите героев');
      return;
    }
    const heroIds = target ? [target.id] : audience === 'some' ? picked : undefined;
    announceMasterRoll(party.id, dice, hero ? `${hero.name}: ${label}` : label, heroIds, check).catch(() =>
      toast.error('Бросок не дошёл до стола'),
    );
  };

  return (
    <DiceDialog
      open={open}
      onClose={onClose}
      title={hero ? `Кубики · ${hero.name}` : 'Кубики мастера'}
      percentile={party.rules === 'coc7'}
      onThrown={thrown}
      targets={targets}
    >
      <div className="mb-4 flex flex-col gap-3">
        <Segmented
          label="Кому показать бросок"
          value={audience}
          onChange={setAudience}
          options={[
            { value: 'all', label: 'всем' },
            { value: 'some', label: 'выбранным героям' },
            { value: 'me', label: 'только мне' },
          ]}
        />
        {audience === 'some' &&
          (heroes.length === 0 ? (
            <p className="text-sm text-ink-muted">За столом пока нет героев игроков.</p>
          ) : (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Герои">
              {heroes.map((h) => {
                const on = picked.includes(h.id);
                return (
                  <button
                    key={h.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setChosen(on ? picked.filter((id) => id !== h.id) : [...picked, h.id])}
                    className={cx(
                      'border px-3 py-1.5 text-sm transition-colors',
                      on
                        ? 'border-frame-bright bg-frame/15 text-ink'
                        : 'border-line text-ink-muted hover:text-ink',
                    )}
                  >
                    {h.name}
                  </button>
                );
              })}
            </div>
          ))}
        {audience === 'some' && picked.length > 1 && (
          <Segmented
            label="Кубы"
            value={spread}
            onChange={setSpread}
            options={[
              { value: 'shared', label: 'один бросок на всех' },
              { value: 'each', label: 'разные — каждому свой' },
            ]}
          />
        )}
      </div>
    </DiceDialog>
  );
};
