import React, { useState } from 'react';
import { COC_CONDITIONS, recoverFrom } from '@itd/game-logic/coc';
import { ConfirmDialog, Dialog } from '../../ui/Dialog';
import { Button, Tag } from '../../ui/primitives';
import { useCoc } from './context';
import { MANUAL_CONDITIONS, addCondition } from './sheetRules';

/** A button that asks before it does something that cannot be taken back from the sheet. */
export const ConfirmButton: React.FC<{
  /** The question ("Забыть заклинание?"). */
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  danger?: boolean;
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
  disabled?: boolean;
  children: React.ReactNode;
}> = ({ title, message, confirmLabel, onConfirm, danger = true, variant = 'ghost', size, disabled, children }) => {
  const [asking, setAsking] = useState(false);
  return (
    <>
      <Button variant={variant} size={size} disabled={disabled} onClick={() => setAsking(true)}>
        {children}
      </Button>
      <ConfirmDialog
        open={asking}
        title={title}
        message={message}
        confirmLabel={confirmLabel}
        danger={danger}
        onCancel={() => setAsking(false)}
        onConfirm={() => {
          setAsking(false);
          onConfirm();
        }}
      />
    </>
  );
};

/**
 * What a shock left to do, kept in view until done: the INT roll after a loss of five or more, the
 * bout of madness a loss brings to someone already insane. A toast would be gone before the table
 * gets to it.
 */
export const FollowUpBanners: React.FC = () => {
  const { followUps, rollInt, dismissInt, rollBout, dismissBout } = useCoc();
  if (!followUps.int && !followUps.bout) return null;
  return (
    <div className="flex flex-col gap-2" role="status">
      {followUps.int && (
        <div className="coc-followup">
          <div className="text-sm">
            <b>Бросок ИНТ</b> — {followUps.int.source}: потеряно 5 и больше рассудка. Успех — сыщик
            осознаёт увиденное и сходит с ума временно.
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="primary" onClick={rollInt}>
              Бросить ИНТ
            </Button>
            <Button size="sm" variant="ghost" onClick={dismissInt}>
              Не нужно
            </Button>
          </div>
        </div>
      )}
      {followUps.bout && (
        <div className="coc-followup coc-followup--danger">
          <div className="text-sm">
            <b>Приступ безумия</b> — {followUps.bout.reason}.
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="danger" onClick={() => rollBout(false)} title="Таблица приступов в моменте">
              В моменте
            </Button>
            <Button
              size="sm"
              onClick={() => rollBout(true)}
              title="Таблица приступов вкратце: сыщик один, приходит в себя позже"
            >
              Вкратце
            </Button>
            <Button size="sm" variant="ghost" onClick={dismissBout}>
              Скрыть
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * The conditions the Keeper declares, marked or cleared by hand: insanity, a major wound, being
 * unconscious or dying. Clearing one asks first.
 */
export const ConditionsDialog: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { character, update } = useCoc();
  const [clearing, setClearing] = useState<string | null>(null);
  const conditions = COC_CONDITIONS.filter((c) => (MANUAL_CONDITIONS as readonly string[]).includes(c.id));
  const clearingName = COC_CONDITIONS.find((c) => c.id === clearing)?.name;
  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title="Состояния"
        subtitle="Что объявил Хранитель: отметьте или снимите"
        width="md"
        footer={
          <Button variant="primary" onClick={onClose}>
            Готово
          </Button>
        }
      >
        <div className="flex flex-col gap-1">
          {conditions.map((c) => {
            const on = character.conditions.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  on
                    ? setClearing(c.id)
                    : update(addCondition(c.id), { message: `Состояние: ${c.name}`, type: 'health' })
                }
                className="flex items-start gap-3 border-b border-line/50 px-1 py-2 text-left hover:bg-surface-2/60"
              >
                <Tag tone={on ? 'danger' : 'line'}>{on ? 'есть' : 'нет'}</Tag>
                <span className="min-w-0 flex-1">
                  <span className={on ? 'block text-ink' : 'block text-ink-muted'}>{c.name}</span>
                  <span className="block text-xs text-ink-faint">{c.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Dialog>
      <ConfirmDialog
        open={clearing !== null}
        title="Снять состояние?"
        message={
          <>
            <span className="text-ink">{clearingName}</span> больше не будет отмечено в листе.
          </>
        }
        confirmLabel="Снять"
        onCancel={() => setClearing(null)}
        onConfirm={() => {
          if (clearing)
            update(recoverFrom(clearing), { message: `Прошло: ${clearingName}`, type: 'health' });
          setClearing(null);
        }}
      />
    </>
  );
};
