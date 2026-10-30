import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { ATTRIBUTES_LIST, SKILLS_LIST } from '@itd/game-logic';
import type { PartyDto, RollCallKind } from '@itd/schema';
import { api } from '../../data/api/client';
import { Dialog } from '../../ui/Dialog';
import { Segmented } from '../../ui/forms';
import { Button, Input, cx } from '../../ui/primitives';

/** A toggle among the dialog's choices: a hero, a skill, an ability. */
const Chip: React.FC<{ on: boolean; onClick: () => void; children: React.ReactNode }> = ({ on, onClick, children }) => (
  <button
    type="button"
    aria-pressed={on}
    onClick={onClick}
    className={cx(
      'border px-3 py-1.5 text-sm transition-colors',
      on ? 'border-frame-bright bg-frame/15 text-ink' : 'border-line text-ink-muted hover:text-ink',
    )}
  >
    {children}
  </button>
);

/**
 * The master calls on players for a d20: a saving throw, an ability check or a skill, against a
 * difficulty if the master tells it. Each chosen hero's player gets a plate with their own bonuses
 * and throws it with a click; the throws come back to the table.
 */
export const RollCallDialog: React.FC<{ open: boolean; party: PartyDto; onClose: () => void }> = ({ open, party, onClose }) => {
  const heroes = party.heroes.filter((h) => h.ownerId !== party.masterId);
  const [chosen, setChosen] = useState<string[]>([]);
  const [kind, setKind] = useState<RollCallKind>('save');
  const [ability, setAbility] = useState<string>('constitution');
  const [skill, setSkill] = useState<string>('perception');
  const [target, setTarget] = useState('');
  const [mode, setMode] = useState<'normal' | 'advantage' | 'disadvantage'>('normal');
  const [title, setTitle] = useState('');
  const [sending, setSending] = useState(false);
  const picked = chosen.filter((id) => heroes.some((h) => h.id === id));

  const send = async () => {
    if (picked.length === 0) return;
    setSending(true);
    try {
      await api.rolls.call(party.id, {
        heroIds: picked,
        kind,
        ...(kind === 'skill' ? { key: skill } : kind === 'plain' ? {} : { key: ability }),
        title: title.trim(),
        ...(/^\d+$/.test(target) ? { target: Math.min(40, Math.max(1, Number(target))) } : {}),
        mode,
      });
      toast.success(picked.length > 1 ? 'Игроки получили просьбу о броске' : 'Игрок получил просьбу о броске');
      onClose();
    } catch {
      toast.error('Просьба не дошла до стола');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Попросить бросок"
      width="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="primary" disabled={picked.length === 0 || sending} onClick={() => void send()}>
            Попросить
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <div className="ui-label mb-2">Кто бросает</div>
          {heroes.length === 0 ? (
            <p className="text-sm text-ink-muted">За столом пока нет героев игроков.</p>
          ) : (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Герои">
              {heroes.map((h) => {
                const on = picked.includes(h.id);
                return (
                  <Chip key={h.id} on={on} onClick={() => setChosen(on ? picked.filter((id) => id !== h.id) : [...picked, h.id])}>
                    {h.name}
                  </Chip>
                );
              })}
            </div>
          )}
        </div>

        <Segmented
          label="Что бросают"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'save', label: 'спасбросок' },
            { value: 'ability', label: 'проверка характеристики' },
            { value: 'skill', label: 'навык' },
            { value: 'plain', label: 'просто к20' },
          ]}
        />

        {(kind === 'save' || kind === 'ability') && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Характеристика">
            {ATTRIBUTES_LIST.map((a) => (
              <Chip key={a.id} on={ability === a.id} onClick={() => setAbility(a.id)}>
                {a.name}
              </Chip>
            ))}
          </div>
        )}
        {kind === 'skill' && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Навык">
            {SKILLS_LIST.map((s) => (
              <Chip key={s.id} on={skill === s.id} onClick={() => setSkill(s.id)}>
                {s.name}
              </Chip>
            ))}
          </div>
        )}

        <Segmented
          label="Режим броска"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'normal', label: 'обычный' },
            { value: 'advantage', label: 'преимущество', tone: 'success' },
            { value: 'disadvantage', label: 'помеха', tone: 'danger' },
          ]}
        />

        <div className="flex gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Как назвать бросок"
            placeholder={kind === 'plain' ? 'Как назвать бросок' : 'Своё название — необязательно'}
            maxLength={60}
          />
          <Input
            value={target}
            onChange={(e) => setTarget(e.target.value.replace(/\D/g, '').slice(0, 2))}
            aria-label="Сложность"
            placeholder="Сложность"
            inputMode="numeric"
            className="w-32 shrink-0 text-center"
          />
        </div>
      </div>
    </Dialog>
  );
};
