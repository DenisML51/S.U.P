import React, { useState } from 'react';
import { DAMAGE_TYPES, baseMaxSanityOf, experienceProgress, maxSanityOf, rulesOf, totalMaxHP, type Coin } from '@itd/game-logic';
import type { Build, Character } from '@itd/schema';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { useMomentStore } from '../../../store/useMomentStore';
import { Dialog } from '../../../ui/Dialog';
import { settingOf } from '../../../ui/theme/settings';
import { NumberField, Segmented, Select } from '../../../ui/forms';
import { Button, Field, Meter, cx, type MeterTone } from '../../../ui/primitives';
import { useVitals } from '../useVitals';
import { useSheetDialogs } from './context';
import { DeathSaves } from '../parts/DeathSaves';
import { SIGN_HINT, cleanAmount, signedAmount } from '../parts/amount';
import { toast } from 'react-hot-toast';
import { locale } from '../../../i18n';

interface VitalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * An amount and what to do with it: "8 → Урон". Enter applies the first action, so the most
 * common one is a number and a key away — unless `signed` names the actions of a minus and a plus
 * (health, sanity): there a bare number could mean either, so Enter wants "−8" or "+8".
 */
const AmountBar: React.FC<{
  actions: {
    label: string;
    variant?: 'primary' | 'secondary' | 'danger';
    onApply: (amount: number) => void;
  }[];
  signed?: { minus: number; plus: number };
  children?: React.ReactNode;
}> = ({ actions, signed, children }) => {
  const [text, setText] = useState('');
  const { sign, value: amount } = signedAmount(text);
  const valid = amount > 0;
  const apply = (index: number) => {
    if (!valid) return;
    actions[index]!.onApply(amount);
    setText('');
  };
  const enter = () => {
    if (!signed) return apply(0);
    if (sign) apply(sign === '-' ? signed.minus : signed.plus);
    else if (valid) toast(SIGN_HINT, { id: 'amount-sign' });
  };
  return (
    <form
      className="flex gap-2 max-sm:flex-wrap"
      onSubmit={(e) => {
        e.preventDefault();
        enter();
      }}
      title={signed ? SIGN_HINT : undefined}
    >
      <input
        className="ui-input w-24 text-center text-lg tabular-nums max-sm:w-full"
        inputMode="numeric"
        placeholder="0"
        aria-label="Сколько"
        value={text}
        onChange={(e) => setText(signed ? cleanAmount(e.target.value) : e.target.value.replace(/[^\d]/g, ''))}
        data-autofocus
      />
      {children}
      {actions.map((action, index) => (
        <Button
          key={action.label}
          type="button"
          variant={action.variant ?? 'secondary'}
          disabled={!valid}
          onClick={() => apply(index)}
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

/** Damage types a hit may carry; healing is not one of them. */
const HIT_TYPES = DAMAGE_TYPES.filter((type) => type !== 'Лечение');

const DEFENCE_LABEL = { resistance: 'Сопротивление', vulnerability: 'Уязвимость', immunity: 'Иммунитет' } as const;

export const HealthDialog: React.FC<VitalProps> = ({ open, onClose }) => {
  const character = useCharacterStore((s) => s.character) as Character;
  const vitals = useVitals();
  const [type, setType] = useState<string>('');
  // The hero's defences by kind, so the player sees why a type matters.
  const defences = (['immunity', 'resistance', 'vulnerability'] as const)
    .map((level) => [level, character.resistances.filter((r) => r.level === level).map((r) => r.type)] as const)
    .filter(([, types]) => types.length > 0);
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
        note={character.tempHP > 0 ? 'Временные хиты принимают урон первыми' : null}
      />
      <DeathSaves character={character} className="mx-auto mt-4 max-w-sm" />
      <div className="mt-6">
        <AmountBar
          signed={{ minus: 0, plus: 1 }}
          actions={[
            { label: 'Урон', variant: 'danger', onApply: (n) => vitals.damage(n, { type: type || undefined }) },
            { label: 'Лечение', onApply: vitals.heal },
            ...(down
              ? [{ label: 'Крит. урон', variant: 'danger' as const, onApply: (n: number) => vitals.damage(n, { critical: true, type: type || undefined }) }]
              : [{ label: 'Временные', onApply: vitals.addTemp }]),
          ]}
        />
        <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2">
          <Field label="Тип урона" className="w-56">
            {({ id }) => (
              <Select
                id={id}
                value={type}
                onChange={setType}
                options={[{ value: '', label: 'Без типа' }, ...HIT_TYPES.map((t) => ({ value: t, label: t }))]}
              />
            )}
          </Field>
          {defences.length > 0 && (
            <p className="pb-2.5 text-xs text-ink-muted">
              {defences.map(([level, types]) => `${DEFENCE_LABEL[level]}: ${types.join(', ')}`).join(' · ')}
            </p>
          )}
        </div>
        {down && (
          <p className="mt-2 text-xs text-ink-faint">
            Урон при 0 хитов — провал спасброска, критический — два; урон не меньше максимума хитов убивает.
          </p>
        )}
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
      {!!character.maxHPReduction && (
        // A Vital Sacrifice took it off until a long rest; a feature may win it back sooner (Essence Drain).
        <div className="mt-4 flex items-end gap-4">
          <Field label="Максимум снижен до отдыха" className="w-56">
            {({ id }) => (
              <NumberField
                id={id}
                min={0}
                value={character.maxHPReduction ?? 0}
                onChange={(v) => vitals.setHealthField('maxHPReduction', v)}
                className="w-full"
              />
            )}
          </Field>
          <p className="pb-2.5 text-xs text-ink-muted">Жизненные жертвы; продолжительный отдых вернёт максимум.</p>
        </div>
      )}
    </Dialog>
  );
};

export const SanityDialog: React.FC<VitalProps> = ({ open, onClose }) => {
  const character = useCharacterStore((s) => s.character) as Character;
  const vitals = useVitals();
  const max = maxSanityOf(character);
  const bonus = character.maxSanityBonus ?? 0;
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
          ) : bonus !== 0 ? (
            `Максимум: ${baseMaxSanityOf(character)} по правилам ${bonus > 0 ? '+' : '−'} ${Math.abs(bonus)} бонус`
          ) : (
            'Максимум: ментальная сила, мудрость и уровень'
          )
        }
      />
      <div className="mt-6">
        <AmountBar
          signed={{ minus: 0, plus: 1 }}
          actions={[
            { label: 'Потеря', variant: 'danger', onApply: (n) => vitals.changeSanity(-n) },
            { label: 'Восстановить', onApply: (n) => vitals.changeSanity(n) },
          ]}
        />
      </div>
      <div className="mt-6 grid grid-cols-3 gap-4">
        <Field label="Бонус к максимуму" hint="Дары, реликвии">
          {({ id }) => (
            <NumberField id={id} signed value={bonus} onChange={vitals.setSanityBonus} className="w-full" />
          )}
        </Field>
      </div>
    </Dialog>
  );
};

/**
 * Giving back a preset hero's last level (taken by mistake, or a level drained): the level, its picks
 * and its hit points go, asked once more before. Experience stays as it is.
 */
const GiveBackLevel: React.FC<{ character: Character; build: Build }> = ({ character, build }) => {
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  const [asking, setAsking] = useState(false);
  const lastLevel = rulesOf(build).lastLevel;
  const last = lastLevel?.describe(build);
  if (!lastLevel || !last) return null;
  const giveBack = () => {
    updateCharacter((doc) => (doc.build ? lastLevel.giveBack(doc, doc.build) : doc), {
      log: { message: `Уровень понижен до ${character.level - 1}: ${last}`, type: 'exp' },
    });
    setAsking(false);
  };
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line/40 pt-4 text-sm text-ink-muted">
      {asking ? (
        <>
          <span className="min-w-0">{`Вернуть уровень «${last}»? Его выборы и хиты забудутся.`}</span>
          <span className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setAsking(false)}>
              Отмена
            </Button>
            <Button variant="danger" size="sm" onClick={giveBack}>
              Понизить
            </Button>
          </span>
        </>
      ) : (
        <>
          <span className="min-w-0">{`Последний уровень: ${last}`}</span>
          <Button variant="ghost" size="sm" onClick={() => setAsking(true)}>
            Понизить уровень
          </Button>
        </>
      )}
    </div>
  );
};

export const ExperienceDialog: React.FC<VitalProps> = ({ open, onClose }) => {
  const character = useCharacterStore((s) => s.character) as Character;
  const vitals = useVitals();
  const dialogs = useSheetDialogs();
  const progress = experienceProgress(character.level, character.experience);
  const format = (n: number) => n.toLocaleString(locale);
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
            onClick={() => {
              // The window goes first, so the new level plays over the sheet and not under it.
              onClose();
              if (!character.build) return vitals.setLevel(character.level + 1);
              useMomentStore.getState().celebrate({
                from: character.level,
                to: character.level + 1,
                setting: settingOf(character),
                gains: [],
                onDock: () => dialogs.open({ kind: 'levelUp' }),
              });
            }}
          >
            {`Повысить до ${character.level + 1} уровня`}
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
      {character.build && <GiveBackLevel character={character} build={character.build} />}
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
