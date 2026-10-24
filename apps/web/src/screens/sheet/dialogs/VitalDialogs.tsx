import React, { useState } from 'react';
import { experienceProgress, maxSanityOf, totalMaxHP, type Coin } from '@itd/game-logic';
import type { Character } from '@itd/schema';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { Dialog } from '../../../ui/Dialog';
import { NumberField, Segmented } from '../../../ui/forms';
import { Button, Field, Meter, cx, type MeterTone } from '../../../ui/primitives';
import { useVitals } from '../useVitals';
import { useSheetDialogs } from './context';

interface VitalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * An amount and what to do with it: "8 → Урон". Enter applies the first action, so the most
 * common one is a number and a key away.
 */
const AmountBar: React.FC<{
  actions: {
    label: string;
    variant?: 'primary' | 'secondary' | 'danger';
    onApply: (amount: number) => void;
  }[];
  children?: React.ReactNode;
}> = ({ actions, children }) => {
  const [text, setText] = useState('');
  const amount = Number(text);
  const valid = text.trim() !== '' && Number.isFinite(amount) && amount > 0;
  const apply = (index: number) => {
    if (!valid) return;
    actions[index]!.onApply(amount);
    setText('');
  };
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        apply(0);
      }}
    >
      <input
        className="ui-input w-24 text-center text-lg tabular-nums"
        inputMode="numeric"
        placeholder="0"
        aria-label="Сколько"
        value={text}
        onChange={(e) => setText(e.target.value.replace(/[^\d]/g, ''))}
        data-autofocus
      />
      {children}
      {actions.map((action, index) => (
        <Button
          key={action.label}
          type={index === 0 ? 'submit' : 'button'}
          variant={action.variant ?? 'secondary'}
          disabled={!valid}
          onClick={index === 0 ? undefined : () => apply(index)}
          className="flex-1"
        >
          {action.label}
        </Button>
      ))}
    </form>
  );
};

/** The figure a vital dialog is about: "214 / 240", with its gauge. */
const BigFigure: React.FC<{
  value: number;
  max: number;
  extra?: number;
  tone: MeterTone;
  note?: React.ReactNode;
}> = ({ value, max, extra = 0, tone, note }) => (
  <div className="text-center">
    <div className="ui-display ui-numeric text-[3.2rem] leading-none">
      {value}
      <span className="text-[0.55em] opacity-40"> / {max}</span>
      {extra > 0 && <span className="ml-2 text-[0.5em] text-temp-hp">+{extra}</span>}
    </div>
    <Meter
      value={value}
      max={max}
      extra={extra}
      tone={tone}
      height={6}
      ticks
      className="mx-auto mt-3 max-w-sm"
    />
    {note && <p className="mt-2 text-sm text-ink-muted">{note}</p>}
  </div>
);

const Done: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <Button variant="primary" onClick={onClose}>
    Готово
  </Button>
);

export const HealthDialog: React.FC<VitalProps> = ({ open, onClose }) => {
  const character = useCharacterStore((s) => s.character) as Character;
  const vitals = useVitals();
  const max = totalMaxHP(character);
  const down = character.currentHP <= 0;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Здоровье"
      width="md"
      footerStart={
        <Button variant="ghost" size="sm" disabled={character.currentHP >= max} onClick={vitals.healFully}>
          Полное лечение
        </Button>
      }
      footer={<Done onClose={onClose} />}
    >
      <BigFigure
        value={character.currentHP}
        max={max}
        extra={character.tempHP}
        tone="hp"
        note={
          down ? (
            <span className="text-danger">Без сознания</span>
          ) : character.tempHP > 0 ? (
            'Временные хиты принимают урон первыми'
          ) : null
        }
      />
      <div className="mt-6">
        <AmountBar
          actions={[
            { label: 'Урон', variant: 'danger', onApply: vitals.damage },
            { label: 'Лечение', onApply: vitals.heal },
            { label: 'Временные', onApply: vitals.addTemp },
          ]}
        />
      </div>
      <div className="mt-6 grid grid-cols-3 gap-4">
        <Field label="Максимум">
          {({ id }) => (
            <NumberField
              id={id}
              min={1}
              value={character.maxHP}
              onChange={(v) => vitals.setHealthField('maxHP', v)}
              className="w-full"
            />
          )}
        </Field>
        <Field label="Бонус к максимуму">
          {({ id }) => (
            <NumberField
              id={id}
              signed
              value={character.maxHPBonus}
              onChange={(v) => vitals.setHealthField('maxHPBonus', v)}
              className="w-full"
            />
          )}
        </Field>
        <Field label="Временные">
          {({ id }) => (
            <NumberField
              id={id}
              min={0}
              value={character.tempHP}
              onChange={(v) => vitals.setHealthField('tempHP', v)}
              className="w-full"
            />
          )}
        </Field>
      </div>
    </Dialog>
  );
};

export const SanityDialog: React.FC<VitalProps> = ({ open, onClose }) => {
  const character = useCharacterStore((s) => s.character) as Character;
  const vitals = useVitals();
  const max = maxSanityOf(character);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Рассудок"
      width="md"
      footerStart={
        <Button
          variant="ghost"
          size="sm"
          disabled={character.sanity >= max}
          onClick={() => vitals.changeSanity(max)}
        >
          Полное восстановление
        </Button>
      }
      footer={<Done onClose={onClose} />}
    >
      <BigFigure
        value={character.sanity}
        max={max}
        tone="sanity"
        note={
          character.sanity <= 0 ? (
            <span className="text-danger">Безумие</span>
          ) : (
            'Максимум: ментальная сила, мудрость и уровень'
          )
        }
      />
      <div className="mt-6">
        <AmountBar
          actions={[
            { label: 'Потеря', variant: 'danger', onApply: (n) => vitals.changeSanity(-n) },
            { label: 'Восстановить', onApply: (n) => vitals.changeSanity(n) },
          ]}
        />
      </div>
    </Dialog>
  );
};

export const ExperienceDialog: React.FC<VitalProps> = ({ open, onClose }) => {
  const character = useCharacterStore((s) => s.character) as Character;
  const vitals = useVitals();
  const dialogs = useSheetDialogs();
  const progress = experienceProgress(character.level, character.experience);
  const format = (n: number) => n.toLocaleString('ru-RU');
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Опыт"
      width="md"
      footer={
        vitals.canLevelUp ? (
          <Button
            variant="primary"
            onClick={() => (character.build ? dialogs.open({ kind: 'levelUp' }) : vitals.setLevel(character.level + 1))}
          >
            Повысить до {character.level + 1} уровня
          </Button>
        ) : (
          <Done onClose={onClose} />
        )
      }
    >
      <div className="text-center">
        <div className="text-[11px] uppercase tracking-[0.2em] opacity-60">Уровень</div>
        <div className="ui-display ui-numeric text-[3.6rem] leading-none">{character.level}</div>
        <Meter
          value={progress.progress}
          max={100}
          tone="xp"
          height={6}
          className="mx-auto mt-3 max-w-sm"
          label="Опыт"
        />
        <p className={cx('mt-2 text-sm tabular-nums', progress.canLevelUp ? 'text-xp' : 'text-ink-muted')}>
          {progress.isMaxLevel
            ? `${format(character.experience)} — наивысший уровень`
            : progress.canLevelUp
              ? `${format(character.experience)} — хватает на новый уровень`
              : `${format(character.experience)} из ${format(progress.nextLevelXP)} · ещё ${format(progress.nextLevelXP - character.experience)}`}
        </p>
      </div>
      <div className="mt-6">
        <AmountBar
          actions={[
            { label: 'Добавить опыт', variant: 'primary', onApply: vitals.addExperience },
            { label: 'Убрать', onApply: (n) => vitals.addExperience(-n) },
          ]}
        />
      </div>
      {/* A preset hero's level follows its build: it only grows through the level-up window. */}
      {!character.build && (
        <div className="mt-6 flex items-center justify-between gap-4 text-sm text-ink-muted">
          <span>Уровень вручную</span>
          <NumberField
            label="Уровень"
            min={1}
            max={100}
            value={character.level}
            onChange={vitals.setLevel}
            className="w-32"
          />
        </div>
      )}
    </Dialog>
  );
};

const COINS: { coin: Coin; label: string; tone: string }[] = [
  { coin: 'gold', label: 'золото', tone: 'xp' },
  { coin: 'silver', label: 'серебро', tone: 'armor' },
  { coin: 'copper', label: 'медь', tone: 'warning' },
];

export const CurrencyDialog: React.FC<VitalProps> = ({ open, onClose }) => {
  const character = useCharacterStore((s) => s.character) as Character;
  const vitals = useVitals();
  const [coin, setCoin] = useState<Coin>('gold');
  return (
    <Dialog open={open} onClose={onClose} title="Кошелёк" width="md" footer={<Done onClose={onClose} />}>
      <div className="grid grid-cols-3 gap-4">
        {COINS.map(({ coin: kind, label, tone }) => (
          <div key={kind} className="flex flex-col items-center gap-2">
            <span
              className="text-[11px] uppercase tracking-[0.18em]"
              style={{ color: `rgb(var(--c-${tone}))` }}
            >
              {label}
            </span>
            <NumberField
              label={label}
              min={0}
              value={character.currency[kind]}
              onChange={(v) => vitals.setCoins(kind, v)}
              className="w-full"
            />
          </div>
        ))}
      </div>
      <p className="mt-6 mb-2 text-sm text-ink-muted">
        Сдача считается сама: 1 золото = 10 серебра = 100 меди.
      </p>
      <AmountBar
        actions={[
          { label: 'Потратить', onApply: (n) => vitals.spend(n, coin) },
          { label: 'Получить', onApply: (n) => vitals.receive(n, coin) },
        ]}
      >
        <Segmented
          label="Монета"
          value={coin}
          onChange={setCoin}
          options={[
            { value: 'gold', label: 'зм' },
            { value: 'silver', label: 'см' },
            { value: 'copper', label: 'мм' },
          ]}
        />
      </AmountBar>
    </Dialog>
  );
};
