import React, { useMemo, useRef, useState } from 'react';
import {
  CHARACTERISTICS,
  SUCCESS_LABELS,
  cocCharacteristics,
  derivedOf,
  displaySkillName,
  fifth,
  half,
  setSkill,
  skillDef,
  skillValue,
  toggleSkillCheck,
} from '@itd/game-logic/coc';
import { IconCheck, IconMinus, IconPlus } from '../../ui/icons';
import { cx } from '../../ui/primitives';
import { Segmented } from '../../ui/forms';
import { LandedValue, RollingDice, useLanded } from '../../ui/RollingDie';
import {
  canBuyWithLuck,
  canPush,
  canRollDamage,
  target,
  useCoc,
  useCocAnywhere,
  type RollRecord,
} from './context';
import { InfoButton } from './details';
import { useCountRollShown, useRollVerdict } from './verdict';
import { NO_MODS, describeMods, isPlainMods, parseNumberInput, type RollMods } from './sheetRules';
import { compareText, t, tIn } from '../../i18n';

export { modsToRoll, type RollMods } from './sheetRules';

// ------------------------------------------------------------------------------------------------
// Roll modifiers
// ------------------------------------------------------------------------------------------------

const DICE_LABEL: Record<string, string> = {
  '-2': '2 штрафные',
  '-1': '1 штрафная',
  '0': 'Без костей',
  '1': '1 бонусная',
  '2': '2 бонусные',
};

/**
 * How hard the next roll is and what dice it gets: the Keeper says, the player sets it here. Set
 * beyond plain, the bar lights up and the modifiers last one roll, unless pinned.
 */
export const RollModsBar: React.FC<{ value: RollMods; onChange: (mods: RollMods) => void }> = ({
  value,
  onChange,
}) => {
  const plain = isPlainMods(value);
  return (
    <div className="coc-mods" data-active={!plain || undefined}>
      <Segmented
        label="Сложность"
        className={value.difficulty !== 'regular' ? 'coc-mods__active' : undefined}
        value={value.difficulty}
        onChange={(difficulty) => onChange({ ...value, difficulty })}
        options={[
          { value: 'regular', label: 'Обычная' },
          { value: 'hard', label: 'Трудная' },
          { value: 'extreme', label: 'Экстремальная' },
        ]}
      />
      <div
        className="coc-dice-step"
        data-active={value.dice !== 0 || undefined}
        role="group"
        aria-label="Бонусные и штрафные кости"
      >
        <button
          type="button"
          onClick={() => onChange({ ...value, dice: Math.max(-2, value.dice - 1) })}
          aria-label="Штрафная кость"
        >
          <IconMinus width={14} height={14} className="mx-auto" />
        </button>
        <span aria-live="polite">{DICE_LABEL[String(value.dice)]}</span>
        <button
          type="button"
          onClick={() => onChange({ ...value, dice: Math.min(2, value.dice + 1) })}
          aria-label="Бонусная кость"
        >
          <IconPlus width={14} height={14} className="mx-auto" />
        </button>
      </div>
      {!plain && (
        <span className="coc-mods__state">
          <button
            type="button"
            className="coc-mods__pin"
            aria-pressed={!!value.pinned}
            onClick={() => onChange({ ...value, pinned: !value.pinned })}
            title="Закреплённые модификаторы остаются на следующие броски"
          >
            {value.pinned ? 'Закреплено' : 'На один бросок'}
          </button>
          <button type="button" className="coc-mods__reset" onClick={() => onChange(NO_MODS)}>
            Сбросить
          </button>
        </span>
      )}
    </div>
  );
};

/** The modifiers set for the next roll, told where the bar itself is not in view. */
export const ModsNote: React.FC = () => {
  const { mods, setMods } = useCoc();
  if (isPlainMods(mods)) return null;
  return (
    <span className="coc-mods__note">
      Следующий бросок: <b>{describeMods(mods)}</b>
      {mods.pinned && ' (закреплено)'}
      <button type="button" className="coc-mods__reset" onClick={() => setMods(NO_MODS)}>
        Сбросить
      </button>
    </span>
  );
};

// ------------------------------------------------------------------------------------------------
// Characteristics
// ------------------------------------------------------------------------------------------------

/** The eight characteristics, each with its half and fifth; a click rolls it. */
export const CharacteristicsGrid: React.FC = () => {
  const { character, rollModded } = useCoc();
  const c = cocCharacteristics(character);
  return (
    <div className="coc-chars">
      {CHARACTERISTICS.map((ch) => {
        const value = c[ch.id];
        return (
          <div key={ch.id} className="coc-char">
            {/* The whole card rolls; the corner "i" opens its description. */}
            <button
              type="button"
              className="coc-char__roll"
              aria-label={`Бросить: ${ch.name}`}
              title={`${ch.description} Нажмите, чтобы бросить.`}
              onClick={() => rollModded({ label: ch.name, value, kind: 'characteristic' })}
            />
            <span className="coc-char__info">
              <InfoButton kind="characteristic" id={ch.id} label={ch.name} />
            </span>
            <span className="coc-char__label">
              {tIn('coc', ch.short)} · {tIn('coc', ch.name)}
            </span>
            <span className="coc-char__value">{value}</span>
            <span className="coc-char__parts">
              <span className="coc-char__part">
                {half(value)} <small>½</small>
              </span>
              <span className="coc-char__part">
                {fifth(value)} <small>⅕</small>
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
};

/** Damage bonus, build, move and dodge: what the body adds up to. */
export const DerivedStrip: React.FC = () => {
  const { character, rollModded } = useCoc();
  const build = character.build?.ruleset === 'coc7' ? character.build : undefined;
  const d = derivedOf(cocCharacteristics(character), build?.variant, build?.age);
  const dodge = skillValue(character, 'dodge');
  return (
    <div className="coc-derived">
      <div className="coc-derived__cell">
        <span className="coc-derived__value">{d.damageBonus}</span>
        <span className="coc-derived__label">Бонус урона</span>
      </div>
      <div className="coc-derived__cell">
        <span className="coc-derived__value">{d.build}</span>
        <span className="coc-derived__label">Комплекция</span>
      </div>
      <div className="coc-derived__cell">
        <span className="coc-derived__value">{character.speed}</span>
        <span className="coc-derived__label">Движение</span>
      </div>
      <button
        type="button"
        className="coc-derived__cell hover:bg-surface-2/60"
        onClick={() =>
          rollModded({ label: 'Уклонение', value: dodge, kind: 'skill', id: 'dodge' }, { diceOnly: true })
        }
        title="Бросить уклонение: бонусные и штрафные кости учитываются, сложность — нет (бросок встречный)"
      >
        <span className="coc-derived__value">{dodge}</span>
        <span className="coc-derived__label">Уклонение</span>
      </button>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------
// Skills
// ------------------------------------------------------------------------------------------------

/**
 * Every skill of the sheet as on the paper one: tick box, name, value with its half and fifth.
 * The name rolls it; the value is edited in place; the box is the development tick.
 */
export const SkillList: React.FC<{ filter?: string; wide?: boolean }> = ({ filter = '', wide }) => {
  const { character, rollModded, update } = useCoc();
  const [editing, setEditing] = useState<string | null>(null);
  // Escape drops the edit: the blur that follows must not save it.
  const cancelled = useRef(false);
  const skills = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return [...(character.coc?.skills ?? [])]
      .map((s) => ({ ...s, label: displaySkillName(s) }))
      .filter((s) => !needle || t(s.label).toLowerCase().includes(needle))
      .sort((a, b) => compareText(a.label, b.label));
  }, [character.coc?.skills, filter]);

  return (
    <div className={cx('coc-skills', wide && 'coc-skills--wide')}>
      {skills.map((s) => {
        const def = skillDef(s.id)?.skill;
        const base = s.value <= (def && typeof def.base === 'number' ? def.base : 0);
        return (
          <div
            key={s.id}
            className="coc-skill"
            data-occupation={s.occupation || undefined}
            data-dim={base || undefined}
          >
            <button
              type="button"
              className="coc-skill__tick"
              data-on={s.check || undefined}
              disabled={def?.noImprovement}
              onClick={() => update(toggleSkillCheck(s.id))}
              aria-label={s.check ? 'Снять отметку развития' : 'Отметить для развития'}
              title={def?.noImprovement ? 'Этот навык не развивается отметками' : 'Отметка для фазы развития'}
            >
              {s.check && <IconCheck width={11} height={11} />}
            </button>
            <button
              type="button"
              className="coc-skill__name"
              title={def?.description}
              onClick={() =>
                rollModded({ label: s.label, value: s.value, kind: 'skill', id: s.id })
              }
            >
              {s.label}
            </button>
            <InfoButton kind="skill" id={s.id} label={s.label} />
            <span className="coc-skill__value">
              {editing === s.id ? (
                <input
                  autoFocus
                  defaultValue={s.value}
                  inputMode="numeric"
                  aria-label={`${s.label}: значение`}
                  onFocus={(event) => {
                    cancelled.current = false;
                    event.currentTarget.select();
                  }}
                  onBlur={(event) => {
                    // Empty or unreadable means no change; the value stays within 0–99.
                    const value = cancelled.current ? null : parseNumberInput(event.currentTarget.value, 0, 99);
                    if (value !== null && value !== s.value)
                      update(setSkill(s.id, value), {
                        message: `${s.label}: ${s.value} → ${value}`,
                        type: 'other',
                      });
                    setEditing(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') event.currentTarget.blur();
                    if (event.key === 'Escape') {
                      event.stopPropagation();
                      cancelled.current = true;
                      event.currentTarget.blur();
                    }
                  }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setEditing(s.id)}
                  title="Изменить значение"
                  aria-label={`${s.label}: ${s.value}, изменить`}
                >
                  {s.value}
                </button>
              )}
            </span>
            <span className="coc-skill__parts" aria-hidden>
              <span>{half(s.value)}</span>
              <span>{fifth(s.value)}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
};

// ------------------------------------------------------------------------------------------------
// Tracks
// ------------------------------------------------------------------------------------------------

/** A numbered track like the paper sheet's: one box per point, the current ones filled. */
export const Track: React.FC<{
  label: string;
  value: number;
  max: number;
  tone: string;
  onChange?: (delta: number) => void;
  children?: React.ReactNode;
}> = ({ label, value, max, tone, onChange, children }) => (
  <div className="coc-vital" style={{ '--coc-pip-tone': `var(--c-${tone})` } as React.CSSProperties}>
    <div className="coc-vital__head">
      <span className="coc-vital__label">{label}</span>
      <span className="coc-vital__value">
        {value}
        <span className="coc-vital__max"> / {max}</span>
      </span>
      {onChange && (
        <span className="coc-vital__actions">
          <button
            type="button"
            className="ui-icon-button h-7 w-7"
            onClick={() => onChange(-1)}
            aria-label={`${label}: −1`}
          >
            <IconMinus width={13} height={13} />
          </button>
          <button
            type="button"
            className="ui-icon-button h-7 w-7"
            onClick={() => onChange(1)}
            aria-label={`${label}: +1`}
          >
            <IconPlus width={13} height={13} />
          </button>
        </span>
      )}
    </div>
    {max <= 40 && (
      <div className="coc-pips" aria-hidden>
        {Array.from({ length: max }, (_, i) => (
          <span key={i} className="coc-pip" data-on={i < value || undefined} />
        ))}
      </div>
    )}
    {children}
  </div>
);

// ------------------------------------------------------------------------------------------------
// The d100 result
// ------------------------------------------------------------------------------------------------

const LADDER: { level: RollRecord['check']['level']; label: string; of: (v: number) => number }[] = [
  { level: 'regular', label: 'Обычный', of: (v) => v },
  { level: 'hard', label: 'Трудный', of: half },
  // Shortened to fit a quarter of the plate; the step's title has the full name.
  { level: 'extreme', label: 'Экстрем.', of: fifth },
  { level: 'critical', label: 'Критич.', of: () => 1 },
];
const RANK = { fumble: 0, failure: 1, regular: 2, hard: 3, extreme: 4, critical: 5 } as const;

/** An action inside the toast: a link in the plate's own ink; the toast dismisses on a click, it must not. */
const ToastButton: React.FC<{
  onClick: () => void;
  title?: string;
  strong?: boolean;
  children: React.ReactNode;
}> = ({ onClick, title, strong, children }) => (
  <button
    type="button"
    title={title}
    className={cx('coc-roll__action', strong && 'coc-roll__action--strong')}
    onClick={(event) => {
      event.stopPropagation();
      onClick();
    }}
  >
    {children}
  </button>
);

/**
 * A roll that follows the check (the damage of a hit, the loss of a sanity roll): its dice tumble in
 * the plate's ink, the bonus dice of damage a shade lighter, then the sum comes in large, and the
 * note under it small. A flat amount without dice shows at once.
 */
const FollowUpThrow: React.FC<{
  dice?: { sides: number; value: number; source?: string }[];
  total: number;
  note?: string;
}> = ({ dice = [], total, note }) => {
  const [landed, setLanded] = useState(dice.length === 0);
  return (
    <div className="mt-2">
      <div className="flex items-center gap-3">
        {dice.length > 0 && (
          <RollingDice
            size={dice.length > 4 ? '2rem' : '2.6rem'}
            stagger={120}
            onLanded={() => setLanded(true)}
            dice={dice.map((die) => ({
              sides: die.sides,
              value: die.value,
              className: cx('ui-rolling-die--ink', die.source === 'bonus' && 'opacity-70'),
            }))}
          />
        )}
        <LandedValue landed={landed} className="ui-display ui-numeric text-3xl leading-none">
          {total}
        </LandedValue>
      </div>
      {note && (
        <LandedValue landed={landed} className="mt-1 text-sm opacity-80">
          {note}
        </LandedValue>
      )}
    </div>
  );
};

/**
 * The latest roll, drawn inside the app's toast in the setting's plate: the dice (the kept tens die
 * marked), how far it reached on the ladder of success, a jam, and what may follow by the rules — a
 * push, Luck, the damage of a hit, the INT roll after a shock.
 */
export const RollResult: React.FC<{ record: RollRecord }> = ({ record }) => {
  const { push, buyWithLuck, rollDamage, character, rollInt, followUps } = useCocAnywhere();
  useCountRollShown();
  const { check } = record;
  const kept = check.total === 100 ? 0 : check.total - check.units;
  const luck = character.coc?.luck ?? 0;
  // The d10s tumble first; the total, the level and the ladder come once the last one is down.
  const [landed, markLanded] = useLanded(record.serial);
  const verdict = useRollVerdict(record.serial);
  return (
    <div
      className="coc-roll"
      // How the roll went (the colour of the total, the stamp) is told once the dice are down.
      data-level={landed ? check.level : undefined}
      data-landed={landed || undefined}
      // A setting may stamp the level across the plate (the Lovecraft telegram does).
      data-stamp={record.luckSpent ? SUCCESS_LABELS.regular : SUCCESS_LABELS[check.level]}
    >
      {/* By importance: the dice and the total first and large; the roll's name, level and the rest below. */}
      <div className="coc-roll__head !items-center">
        <div className="coc-roll__dice !mt-0 flex-wrap items-center">
          <RollingDice
            key={record.serial}
            size={check.tens.length > 2 ? '3.1rem' : '3.6rem'}
            onLanded={markLanded}
            dice={[
              // Every tens die, the kept one plain and the others greyed; then the units die.
              ...check.tens.map((t) => ({
                sides: 10,
                value: t === 0 ? '00' : t,
                className: cx('ui-rolling-die--ink', t !== kept && 'opacity-50'),
              })),
              { sides: 10, value: check.units, className: 'ui-rolling-die--ink' },
            ]}
          />
          {(record.bonus ?? 0) > 0 && <span className="self-center text-[11px] opacity-60">бонусная</span>}
          {(record.penalty ?? 0) > 0 && <span className="self-center text-[11px] opacity-60">штрафная</span>}
        </div>
        <span className="coc-roll__total !text-[3.6rem]">
          <LandedValue landed={landed}>{check.total}</LandedValue>
        </span>
      </div>
      <div className="mt-2 min-w-0">
        <div className="truncate text-sm">
          {record.label}
          {record.pushed && <span className="opacity-60"> · повтор</span>}
        </div>
        <div
          className="coc-roll__level text-[13px]"
          style={{ color: `rgb(var(--c-${check.success ? 'success' : 'danger'}))` }}
        >
          <LandedValue landed={landed}>
            {record.luckSpent ? `Успех за ${record.luckSpent} удачи` : SUCCESS_LABELS[check.level]}
            <span className="coc-roll__stop opacity-60"> · </span>
            <span className="opacity-60">нужно ≤ {target(record)}</span>
          </LandedValue>
        </div>
        {verdict && landed && (
          <div
            className="coc-roll__verdict mt-1 text-[13px] font-semibold"
            style={{
              color: verdict.tone === 'neutral' ? undefined : `rgb(var(--c-${verdict.tone}))`,
            }}
          >
            {verdict.parts.map((part, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="coc-roll__stop"> · </span>}
                {part}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
      {record.kind !== 'sanity' && (
        <div className="coc-ladder">
          {LADDER.map((step) => (
            <span
              key={step.level}
              className="coc-ladder__step"
              title={SUCCESS_LABELS[step.level]}
              data-reached={(landed && RANK[check.level] >= RANK[step.level]) || undefined}
            >
              <b>{step.of(record.value)}</b>
              {step.label}
            </span>
          ))}
        </div>
      )}
      {landed && record.jammed && (
        <div className="mt-2 text-sm text-danger">Осечка: оружие заклинило, нужен раунд на починку.</div>
      )}
      {landed && check.level === 'fumble' && record.kind !== 'sanity' && (
        <div className="mt-2 text-sm text-danger">
          Провал: худший исход, Хранитель решает, чем он обернётся.
        </div>
      )}
      {record.sanity && landed && (
        <FollowUpThrow key={`san-${record.serial}`} dice={record.sanity.dice} total={record.sanity.loss} />
      )}
      {landed && record.sanity && (
        <div className="mt-2 text-sm opacity-80">
          Потеряно <b>{record.sanity.loss}</b> рассудка.
          {record.sanity.needsIntRoll && <span> Потеря 5 и больше — бросок ИНТ.</span>}
          {record.sanity.indefinite && <span className="text-danger"> Бессрочное безумие.</span>}
          {record.sanity.permanent && <span className="text-danger"> Рассудок исчерпан.</span>}
          {record.sanity.boutTriggered && (
            <span className="text-danger"> Сыщик уже безумен — начинается приступ.</span>
          )}
        </div>
      )}
      {landed && record.note && <div className="mt-2 text-sm opacity-80">{record.note}</div>}
      {landed && record.kind === 'int' && (
        <div className="mt-2 text-sm opacity-80">
          {check.success
            ? 'Сыщик осознал увиденное — временное безумие.'
            : 'Разум отказался понимать — безумие обошло стороной.'}
        </div>
      )}
      {record.damage && (
        <FollowUpThrow
          key={`dmg-${record.serial}`}
          dice={record.damage.dice}
          total={record.damage.total}
          note={`Урон (${record.damage.formula})`}
        />
      )}
      {/* What may follow (a push, Luck, damage) says how the roll went: it waits for the dice too. */}
      <div className="coc-roll__actions">
        {landed && canPush(record) && (
          <ToastButton onClick={push} title="Повторить бросок; провал повтора обернётся бедой">
            Повторить с риском
          </ToastButton>
        )}
        {landed && canBuyWithLuck(record, luck) && (
          <ToastButton onClick={buyWithLuck}>Удача: −{check.total - target(record)}</ToastButton>
        )}
        {landed && canRollDamage(record, verdict) && (
          <ToastButton strong onClick={rollDamage}>
            Урон
          </ToastButton>
        )}
        {landed && record.sanity?.needsIntRoll && followUps.int && (
          <ToastButton
            strong
            onClick={rollInt}
            title="Успех ИНТ — сыщик осознаёт увиденное и сходит с ума временно"
          >
            Бросок ИНТ
          </ToastButton>
        )}
      </div>
    </div>
  );
};
