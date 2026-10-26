import React, { useState } from 'react';
import {
  attributeModifier,
  averageHitPoints,
  formatModifier,
  hitDiceOf,
  longRest,
  shortRest,
  type HitDieMethod,
  type RestChange,
  type RestKind,
} from '@itd/game-logic';
import type { Character } from '@itd/schema';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { Dialog } from '../../../ui/Dialog';
import { NumberField, Segmented } from '../../../ui/forms';
import { Button, Field } from '../../../ui/primitives';
import { FormSection } from './parts';

const ABOUT: Record<RestKind, string> = {
  short:
    'Час передышки. Можно потратить кости хитов на лечение; возвращаются ресурсы с восстановлением «короткий отдых».',
  long: 'Ночь сна. Хиты в максимум, временные хиты пропадают, возвращаются ресурсы короткого и долгого отдыха и половина костей хитов, концентрация прекращается. Рассудок сном не лечится.',
};

/** "Хиты 12 → 30 / 44": one line of the preview. */
const ChangeRow: React.FC<{ change: RestChange; approximate?: boolean }> = ({ change, approximate }) => (
  <li className="flex items-baseline justify-between gap-4 border-b border-line/40 py-1.5 text-sm">
    <span className="min-w-0 truncate text-ink-muted">{change.label}</span>
    <span className="shrink-0 tabular-nums">
      <span className="text-ink-faint">{change.before}</span>
      <span className="text-ink-faint"> → </span>
      <span className="text-ink">
        {approximate && '≈ '}
        {change.after}
      </span>
      {change.max !== undefined && <span className="text-ink-faint"> / {change.max}</span>}
    </span>
  </li>
);

/** A short or a long rest: what it will give back, then the rest itself. */
export const RestDialog: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const character = useCharacterStore((s) => s.character) as Character;
  const rest = useCharacterStore((s) => s.rest);
  const [kind, setKind] = useState<RestKind>('short');
  const [hitDice, setHitDice] = useState(0);
  const [method, setMethod] = useState<HitDieMethod>('roll');

  const pool = hitDiceOf(character);
  const spend = Math.min(hitDice, pool?.current ?? 0);
  // A roll is not known yet: the preview counts the average and marks the hit points as approximate.
  const preview =
    kind === 'short' ? shortRest(character, { hitDice: spend, method: 'average' }) : longRest(character);
  const rolling = kind === 'short' && method === 'roll' && spend > 0;
  const constitution = formatModifier(attributeModifier(character, 'constitution'));

  // A long rest needs at least 1 hit point to begin.
  const cannotSleep = kind === 'long' && character.currentHP <= 0;

  const finish = () => {
    rest(kind, kind === 'short' ? { hitDice: spend, method } : undefined);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Отдых"
      width="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="primary" onClick={finish} disabled={cannotSleep}>
            {kind === 'short' ? 'Отдохнуть час' : 'Лечь спать'}
          </Button>
        </>
      }
    >
      <Segmented
        label="Вид отдыха"
        value={kind}
        onChange={setKind}
        options={[
          { value: 'short', label: 'Короткий' },
          { value: 'long', label: 'Долгий' },
        ]}
        className="w-full"
      />
      <p className="mt-3 text-sm text-ink-muted">{ABOUT[kind]}</p>
      {cannotSleep && (
        <p className="mt-2 text-sm text-danger">Долгий отдых начинают хотя бы с 1 хитом: сначала лечение или короткий отдых.</p>
      )}

      {kind === 'short' && pool?.hitDie !== undefined && (
        <div className="mt-5 flex flex-wrap items-end gap-4">
          <Field label="Потратить кости хитов" hint={`Осталось ${pool.current} из ${pool.max}`}>
            {({ id }) => (
              <NumberField
                id={id}
                min={0}
                max={pool.current}
                value={spend}
                onChange={setHitDice}
                className="w-36"
              />
            )}
          </Field>
          <FormSection label="Лечение за кость">
            <Segmented
              label="Лечение за кость"
              value={method}
              onChange={setMethod}
              options={[
                { value: 'roll', label: `бросок к${pool.hitDie}` },
                { value: 'average', label: `среднее ${averageHitPoints(pool.hitDie!)}` },
              ]}
            />
          </FormSection>
          <span className="pb-2 text-sm text-ink-faint">{constitution} ТЕЛ за кость</span>
        </div>
      )}

      <FormSection label="Что изменится" className="mt-5">
        {preview.changes.length > 0 ? (
          <ul>
            {preview.changes.map((change) => (
              <ChangeRow key={change.id} change={change} approximate={rolling && change.id === 'hp'} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-faint">Ничего: всё и так восстановлено.</p>
        )}
        {kind === 'long' && character.concentratingOn && (
          <p className="text-sm text-ink-muted">Концентрация на «{character.concentratingOn.name}» прекратится.</p>
        )}
      </FormSection>
    </Dialog>
  );
};
