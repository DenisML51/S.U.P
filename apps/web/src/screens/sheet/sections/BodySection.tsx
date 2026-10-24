import React from 'react';
import {
  CONDITIONS,
  INJURY_DESCRIPTIONS,
  LIMB_IDS,
  LIMB_LOST_HP,
  changeLimbHP,
  getLimbInjuryLevel,
  getLimbType,
  setCondition,
} from '@itd/game-logic';
import type { Character, Limb, ResistanceLevel } from '@itd/schema';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { Ledger, LedgerRow } from '../../../ui/Ledger';
import { IconButton, Meter, Panel, SectionTitle, cx } from '../../../ui/primitives';
import { IconMinus, IconPlus } from '../../../ui/icons';
import { useSheetDialogs } from '../dialogs/context';

const INJURY = {
  none: { label: 'цела', tone: 'text-success' },
  light: { label: 'ранение', tone: 'text-warning' },
  severe: { label: 'тяжёлое ранение', tone: 'text-danger' },
  destroyed: { label: 'потеряна', tone: 'text-danger' },
} as const;

const RESISTANCE_WORD: Record<ResistanceLevel, string> = {
  resistance: 'сопротивление',
  vulnerability: 'уязвимость',
  immunity: 'иммунитет',
  none: '',
};

/** Limbs in body order (head and torso, arms, legs) rather than as a silhouette. */
const ordered = (limbs: Limb[]) =>
  [...limbs].sort((a, b) => LIMB_IDS.indexOf(a.id as (typeof LIMB_IDS)[number]) - LIMB_IDS.indexOf(b.id as (typeof LIMB_IDS)[number]));

const LimbPlate: React.FC<{ limb: Limb; onChange: (delta: number) => void; onOpen: () => void }> = ({ limb, onChange, onOpen }) => {
  const level = getLimbInjuryLevel(limb.currentHP);
  const injury = INJURY[level];
  return (
    <Panel
      as="article"
      interactive
      ornate={false}
      className="flex flex-col gap-2 px-4 py-3"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      title="Подробнее"
    >
      <div className="relative flex items-baseline justify-between gap-3">
        <h3 className="ui-display truncate text-[1.1rem] leading-none text-ink">{limb.name}</h3>
        {level !== 'destroyed' && <span className={cx('shrink-0 text-xs', injury.tone)}>{injury.label}</span>}
      </div>
      <div className="relative flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <IconButton label={`Урон: ${limb.name}`} size={28} onClick={() => onChange(-1)} disabled={limb.currentHP <= LIMB_LOST_HP}>
          <IconMinus width={14} height={14} />
        </IconButton>
        {level === 'destroyed' ? (
          <span className="ui-display flex-1 text-center text-xl leading-none text-danger">{injury.label}</span>
        ) : (
          <span className="ui-display ui-numeric flex-1 text-center text-2xl leading-none">
            <span className={cx(limb.currentHP <= 0 && 'text-danger')}>{limb.currentHP}</span>
            <span className="text-base text-ink-faint"> / {limb.maxHP}</span>
          </span>
        )}
        <IconButton label={`Лечение: ${limb.name}`} size={28} onClick={() => onChange(1)} disabled={limb.currentHP >= limb.maxHP}>
          <IconPlus width={14} height={14} />
        </IconButton>
      </div>
      <Meter value={Math.max(0, limb.currentHP)} max={limb.maxHP} tone={level === 'none' ? 'hp' : 'danger'} height={4} className="relative" />
      <div className="relative flex items-baseline justify-between gap-3 text-xs">
        <span className="shrink-0 whitespace-nowrap text-ink-faint">
          ЗК <span className="tabular-nums text-ink-muted">{limb.ac}</span>
        </span>
        {level !== 'none' && (
          <span className="truncate text-right text-ink-muted" title={INJURY_DESCRIPTIONS[getLimbType(limb.id)][level]}>
            {INJURY_DESCRIPTIONS[getLimbType(limb.id)][level]}
          </span>
        )}
      </div>
    </Panel>
  );
};

/**
 * The body: wounds by limb, conditions, and what the hero is protected against. Everything that
 * answers "what is wrong with me right now" in one place.
 */
export const BodySection: React.FC<{ character: Character }> = ({ character }) => {
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  const dialogs = useSheetDialogs();
  const active = new Set(character.conditions);
  const conditions = [...CONDITIONS].sort((a, b) => Number(active.has(b.id)) - Number(active.has(a.id)));

  const changeLimb = (limb: Limb, delta: number) => updateCharacter((doc) => changeLimbHP(doc, limb.id, delta));

  const toggleCondition = (id: string, name: string) => {
    const on = !active.has(id);
    updateCharacter((doc) => setCondition(doc, id, on), { log: { message: on ? `Состояние: ${name}` : `Состояние снято: ${name}`, type: 'other' } });
  };

  return (
    <div className="grid h-full grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-8">
      <div className="flex min-h-0 min-w-0 flex-col gap-6">
        <section>
          <SectionTitle className="mb-4">Раны</SectionTitle>
          {character.limbs.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {ordered(character.limbs).map((limb) => (
                <LimbPlate key={limb.id} limb={limb} onChange={(delta) => changeLimb(limb, delta)} onOpen={() => dialogs.open({ kind: 'limb', id: limb.id })} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-faint">Части тела не отслеживаются.</p>
          )}
        </section>

        <section>
          <SectionTitle
            className="mb-3"
            action={
              <button type="button" className="text-xs text-ink-faint hover:text-ink-muted" onClick={() => dialogs.open({ kind: 'armor' })}>
                изменить
              </button>
            }
          >
            Защита
          </SectionTitle>
          <div className="mb-3 flex items-baseline gap-3">
            <span className="text-sm text-ink-faint">Класс брони</span>
            <span className="ui-display ui-numeric text-2xl leading-none text-ink">{character.armorClass}</span>
          </div>
          {character.resistances.length === 0 ? (
            <p className="text-sm text-ink-faint">Сопротивлений и уязвимостей нет: урон проходит полностью.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-x-8 text-sm">
              {character.resistances.map((r) => (
                <li key={r.id} className="flex justify-between gap-3 border-b border-line/50 py-1.5">
                  <span className="truncate text-ink">{r.type}</span>
                  <span className={r.level === 'vulnerability' ? 'text-danger' : r.level === 'immunity' ? 'text-armor' : 'text-success'}>
                    {RESISTANCE_WORD[r.level]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Ledger className="max-h-full self-start" title="Состояния" aside={<span>{active.size > 0 ? `действует: ${active.size}` : 'нет'}</span>}>
        {conditions.map((condition) => {
          const on = active.has(condition.id);
          return (
            <LedgerRow
              key={condition.id}
              title={condition.name}
              meta={on ? condition.description : undefined}
              wrapMeta
              dim={!on}
              active={on}
              onOpen={() => toggleCondition(condition.id, condition.name)}
            />
          );
        })}
      </Ledger>
    </div>
  );
};
