import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import type { PartyDto, TableDie } from '@itd/schema';
import { announceMasterRoll } from '../../store/useTableRollStore';
import { DiceDialog } from '../sheet/dialogs/DiceDialog';
import { Segmented } from '../../ui/forms';
import { cx } from '../../ui/primitives';

/**
 * The master's dice tray at the table: the throw lands over the screens of the whole table, or
 * only of the players whose heroes are chosen.
 */
export const MasterDiceDialog: React.FC<{ open: boolean; party: PartyDto; onClose: () => void }> = ({
  open,
  party,
  onClose,
}) => {
  const [audience, setAudience] = useState<'all' | 'some'>('all');
  const [chosen, setChosen] = useState<string[]>([]);
  const heroes = party.heroes.filter((hero) => hero.ownerId !== party.masterId);
  const picked = chosen.filter((id) => heroes.some((hero) => hero.id === id));

  const thrown = (dice: TableDie[], label: string) => {
    if (audience === 'some' && picked.length === 0) {
      toast.error('Бросок никому не показан: выберите героев');
      return;
    }
    announceMasterRoll(party.id, dice, label, audience === 'some' ? picked : undefined).catch(() =>
      toast.error('Бросок не дошёл до стола'),
    );
  };

  return (
    <DiceDialog
      open={open}
      onClose={onClose}
      title="Кубики мастера"
      percentile={party.rules === 'coc7'}
      onThrown={thrown}
    >
      <div className="mb-4 flex flex-col gap-3">
        <Segmented
          label="Кому показать бросок"
          value={audience}
          onChange={setAudience}
          options={[
            { value: 'all', label: 'всем' },
            { value: 'some', label: 'выбранным героям' },
          ]}
        />
        {audience === 'some' &&
          (heroes.length === 0 ? (
            <p className="text-sm text-ink-muted">За столом пока нет героев игроков.</p>
          ) : (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Герои">
              {heroes.map((hero) => {
                const on = picked.includes(hero.id);
                return (
                  <button
                    key={hero.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setChosen(on ? picked.filter((id) => id !== hero.id) : [...picked, hero.id])
                    }
                    className={cx(
                      'border px-3 py-1.5 text-sm transition-colors',
                      on
                        ? 'border-frame-bright bg-frame/15 text-ink'
                        : 'border-line text-ink-muted hover:text-ink',
                    )}
                  >
                    {hero.name}
                  </button>
                );
              })}
            </div>
          ))}
      </div>
    </DiceDialog>
  );
};
