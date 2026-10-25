import React, { useMemo, useState } from 'react';
import {
  CHARACTERISTICS,
  SKILLS,
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
  type Difficulty,
} from '@itd/game-logic/coc';
import { IconCheck, IconMinus, IconPlus } from '../../ui/icons';
import { Button, cx } from '../../ui/primitives';
import { Segmented } from '../../ui/forms';
import { canBuyWithLuck, canPush, target, useCoc, type RollRecord } from './context';

// ------------------------------------------------------------------------------------------------
// Roll modifiers
// ------------------------------------------------------------------------------------------------

export interface RollMods {
  difficulty: Difficulty;
  /** Positive: bonus dice; negative: penalty dice. */
  dice: number;
}

const DICE_LABEL: Record<string, string> = {
  '-2': '2 штрафные',
  '-1': '1 штрафная',
  '0': 'Без костей',
  '1': '1 бонусная',
  '2': '2 бонусные',
};

/** How hard the next roll is and what dice it gets: the Keeper says, the player sets it here. */
export const RollModsBar: React.FC<{ value: RollMods; onChange: (mods: RollMods) => void }> = ({ value, onChange }) => (
  <div className="coc-mods">
    <Segmented
      label="Сложность"
      value={value.difficulty}
      onChange={(difficulty) => onChange({ ...value, difficulty })}
      options={[
        { value: 'regular', label: 'Обычная' },
        { value: 'hard', label: 'Трудная' },
        { value: 'extreme', label: 'Экстремальная' },
      ]}
    />
    <div className="coc-dice-step" role="group" aria-label="Бонусные и штрафные кости">
      <button type="button" onClick={() => onChange({ ...value, dice: Math.max(-2, value.dice - 1) })} aria-label="Штрафная кость">
        <IconMinus width={14} height={14} className="mx-auto" />
      </button>
      <span>{DICE_LABEL[String(value.dice)]}</span>
      <button type="button" onClick={() => onChange({ ...value, dice: Math.min(2, value.dice + 1) })} aria-label="Бонусная кость">
        <IconPlus width={14} height={14} className="mx-auto" />
      </button>
    </div>
  </div>
);

export const modsToRoll = (mods: RollMods) => ({
  difficulty: mods.difficulty,
  bonus: Math.max(0, mods.dice),
  penalty: Math.max(0, -mods.dice),
});

// ------------------------------------------------------------------------------------------------
// Characteristics
// ------------------------------------------------------------------------------------------------

/** The eight characteristics, each with its half and fifth; a click rolls it. */
export const CharacteristicsGrid: React.FC<{ mods: RollMods }> = ({ mods }) => {
  const { character, roll } = useCoc();
  const c = cocCharacteristics(character);
  return (
    <div className="coc-chars">
      {CHARACTERISTICS.map((ch) => {
        const value = c[ch.id];
        return (
          <button
            key={ch.id}
            type="button"
            className="coc-char"
            title={`${ch.description} Нажмите, чтобы бросить.`}
            onClick={() => roll({ label: ch.name, value, kind: 'characteristic', ...modsToRoll(mods) })}
          >
            <span className="coc-char__label">
              {ch.short} · {ch.name}
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
          </button>
        );
      })}
    </div>
  );
};

/** Damage bonus, build, move and dodge: what the body adds up to. */
export const DerivedStrip: React.FC = () => {
  const { character, roll } = useCoc();
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
        onClick={() => roll({ label: 'Уклонение', value: dodge, kind: 'skill', id: 'dodge' })}
        title="Бросить уклонение"
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
export const SkillList: React.FC<{ mods: RollMods; filter?: string; wide?: boolean }> = ({ mods, filter = '', wide }) => {
  const { character, roll, update } = useCoc();
  const [editing, setEditing] = useState<string | null>(null);
  const skills = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return [...(character.coc?.skills ?? [])]
      .map((s) => ({ ...s, label: displaySkillName(s) }))
      .filter((s) => !needle || s.label.toLowerCase().includes(needle))
      .sort((a, b) => a.label.localeCompare(b.label, 'ru'));
  }, [character.coc?.skills, filter]);

  return (
    <div className={cx('coc-skills', wide && 'coc-skills--wide')}>
      {skills.map((s) => {
        const def = skillDef(s.id)?.skill;
        const base = s.value <= (def && typeof def.base === 'number' ? def.base : 0);
        return (
          <div key={s.id} className="coc-skill" data-occupation={s.occupation || undefined} data-dim={base || undefined}>
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
              onClick={() => roll({ label: s.label, value: s.value, kind: 'skill', id: s.id, ...modsToRoll(mods) })}
            >
              {s.label}
            </button>
            <span className="coc-skill__value">
              {editing === s.id ? (
                <input
                  autoFocus
                  defaultValue={s.value}
                  inputMode="numeric"
                  onBlur={(event) => {
                    const value = Number(event.currentTarget.value);
                    if (Number.isFinite(value) && value !== s.value)
                      update(setSkill(s.id, value), { message: `${s.label}: ${s.value} → ${Math.round(value)}`, type: 'other' });
                    setEditing(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') event.currentTarget.blur();
                    if (event.key === 'Escape') setEditing(null);
                  }}
                />
              ) : (
                <button type="button" onClick={() => setEditing(s.id)} title="Изменить значение">
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

/** Skills not on the sheet yet, to add (an uncommon skill, a new speciality). */
export const missingSkills = (have: Set<string>) =>
  SKILLS.flatMap((skill) =>
    skill.specialities
      ? skill.specialities.map((s) => ({ id: `${skill.id}:${s.id}`, name: `${skill.name} (${s.name})` }))
      : [{ id: skill.id, name: skill.name }],
  ).filter((s) => !have.has(s.id));

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
          <button type="button" className="ui-icon-button h-7 w-7" onClick={() => onChange(-1)} aria-label={`${label}: −1`}>
            <IconMinus width={13} height={13} />
          </button>
          <button type="button" className="ui-icon-button h-7 w-7" onClick={() => onChange(1)} aria-label={`${label}: +1`}>
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
  { level: 'extreme', label: 'Экстрим', of: fifth },
  { level: 'critical', label: 'Крит', of: () => 1 },
];
const RANK = { fumble: 0, failure: 1, regular: 2, hard: 3, extreme: 4, critical: 5 } as const;

/**
 * The last roll: the dice (the tens die kept, the others greyed), how far it reached on the ladder of
 * success, and what may follow — a push, Luck, the damage of a hit, the INT roll after a shock.
 */
export const RollResult: React.FC<{
  record: RollRecord;
  /** Extra actions for this roll (damage of a hit). */
  actions?: React.ReactNode;
  floating?: boolean;
}> = ({ record, actions, floating = true }) => {
  const { push, buyWithLuck, dismiss, character, roll } = useCoc();
  const { check } = record;
  const kept = check.total === 100 ? 0 : check.total - check.units;
  const luck = character.coc?.luck ?? 0;
  return (
    <div className={cx('coc-roll', !floating && '!static !w-full')} data-level={check.level} role="status">
      <div className="coc-roll__head">
        <span className="coc-roll__total">{check.total}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm text-ink">
            {record.label}
            {record.pushed && <span className="text-ink-faint"> · повтор</span>}
          </div>
          <div className="text-[13px]" style={{ color: `rgb(var(--c-${check.success ? 'success' : 'danger'}))` }}>
            {record.luckSpent ? `Успех за ${record.luckSpent} удачи` : SUCCESS_LABELS[check.level]}
            <span className="text-ink-faint"> · нужно ≤ {target(record)}</span>
          </div>
          <div className="coc-roll__dice">
            {check.tens.map((t, i) => (
              <span key={i} className="coc-die" data-kept={t === kept || undefined}>
                {t === 0 ? '00' : t}
              </span>
            ))}
            <span className="coc-die" data-units data-kept>
              {check.units}
            </span>
          </div>
        </div>
        {floating && (
          <button type="button" onClick={dismiss} className="text-ink-faint hover:text-ink" aria-label="Закрыть">
            ×
          </button>
        )}
      </div>
      {record.kind !== 'sanity' && (
        <div className="coc-ladder">
          {LADDER.map((step) => (
            <span key={step.level} className="coc-ladder__step" data-reached={RANK[check.level] >= RANK[step.level] || undefined}>
              <b>{step.of(record.value)}</b>
              {step.label}
            </span>
          ))}
        </div>
      )}
      {record.sanity && (
        <div className="mt-3 text-sm text-ink-muted">
          Потеряно <b className="text-ink">{record.sanity.loss}</b> рассудка.
          {record.sanity.indefinite && <span className="text-danger"> Бессрочное безумие.</span>}
          {record.sanity.permanent && <span className="text-danger"> Рассудок исчерпан.</span>}
        </div>
      )}
      <div className="coc-roll__actions">
        {canPush(record) && (
          <Button size="sm" variant="secondary" onClick={push} title="Повторить бросок; провал повтора обернётся бедой">
            Повторить с риском
          </Button>
        )}
        {canBuyWithLuck(record, luck) && (
          <Button size="sm" variant="secondary" onClick={buyWithLuck}>
            Удача: −{check.total - target(record)}
          </Button>
        )}
        {record.sanity?.needsIntRoll && (
          <Button
            size="sm"
            variant="primary"
            onClick={() => roll({ label: 'Осознание ужаса (ИНТ)', value: cocCharacteristics(character).int, kind: 'int' })}
            title="Потеря 5 и больше: успех ИНТ — сыщик осознаёт увиденное и сходит с ума временно"
          >
            Бросок ИНТ
          </Button>
        )}
        {actions}
      </div>
    </div>
  );
};
