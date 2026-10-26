import React, { useMemo, useState } from 'react';
import {
  ARCHETYPES,
  CHARACTERISTICS,
  OCCUPATIONS,
  POINT_BUY_TOTAL,
  TALENTS,
  WEAPONS,
  ageRules,
  fifth,
  half,
  sheetSkills,
  skillDef,
  skillName,
  wealthOf,
  type CharacteristicId,
  type CocEra,
  type PointsFormula,
  type TalentCategory,
  type WeaponDef,
} from '@itd/game-logic/coc';
import type { CocSheet } from '@itd/schema';
import { GameIcon } from '../../../ui/GameIcon';
import { NumberField, Segmented } from '../../../ui/forms';
import { Facts, Section } from '../../../ui/Section';
import { Button, Input, Panel, TextArea, cx } from '../../../ui/primitives';
import { IconHealth, IconSanity, IconSparkle, IconSpells } from '../../../ui/icons';
import { SettingEmblem } from '../../../ui/ornaments';
import { WireDie } from '../../../ui/WireDie';
import { LandedValue, RollingDice, useLanded, type ThrownDie } from '../../../ui/RollingDie';
import { EditionCarousel } from '../../../ui/RulesetCards';
import type { OptionView } from '@itd/game-logic/dnd';
import { PickList } from '../../progression/ChoiceField';
import { EmblemGrid, IdentityStep as SharedIdentityStep, Picked, ScoreCard } from '../kit';
import { choiceList, manualOutOfRange } from './creationRules';
import { choiceOptions, type CocCreation } from './useCocCreation';
import { compareText, locale, t, tIn } from '../../../i18n';

const CHAR_SHORT = Object.fromEntries(CHARACTERISTICS.map((c) => [c.id, tIn('coc', c.short)])) as Record<
  CharacteristicId,
  string
>;

const formulaText = (formula: PointsFormula) =>
  formula
    .map(
      (t) =>
        `${(Array.isArray(t.characteristic) ? t.characteristic : [t.characteristic]).map((id) => CHAR_SHORT[id]).join(' или ')}×${t.times}`,
    )
    .join(' + ');

/** Each archetype and occupation has an emblem of its own: a grid of repeated pictures reads as noise. */
const ICONS: Record<string, string> = {
  // Pulp archetypes
  adventurer: 'compass',
  beefcake: 'muscle-up',
  'bon-vivant': 'beer-stein',
  'cold-blooded': 'cold-heart',
  dreamer: 'night-sky',
  egghead: 'brain',
  explorer: 'mountains',
  'femme-fatale': 'rose',
  'grease-monkey': 'gear-hammer',
  'hard-boiled': 'punch',
  harlequin: 'jester-hat',
  hunter: 'wolf-head',
  mystic: 'crystal-ball',
  outsider: 'hood',
  reckless: 'dice-fire',
  sidekick: 'rally-the-troops',
  steadfast: 'checked-shield',
  swashbuckler: 'sparkling-sabre',
  'thrill-seeker': 'falling',
  'two-fisted': 'fist',
  scholar: 'book-pile',
  // Occupations
  accountant: 'coins',
  antiquarian: 'stone-bust',
  archaeologist: 'mountain-cave',
  artist: 'prism',
  athlete: 'run',
  author: 'quill-ink',
  'big-game-hunter': 'lion',
  bootlegger: 'beer-stein',
  clergy: 'church',
  'computer-programmer': 'microchip',
  criminal: 'robber-mask',
  dilettante: 'crown',
  'doctor-of-medicine': 'medical-pack',
  drifter: 'walking-boot',
  driver: 'key',
  engineer: 'gears',
  entertainer: 'drama-masks',
  farmer: 'wheat',
  'federal-agent': 'eye-shield',
  firefighter: 'fire',
  journalist: 'scroll-quill',
  laborer: 'anvil',
  lawyer: 'scales',
  librarian: 'book-cover',
  mechanic: 'gear-hammer',
  'military-officer': 'crested-helmet',
  missionary: 'holy-symbol',
  musician: 'musical-notes',
  nurse: 'bandage-roll',
  occultist: 'pentagram-rose',
  parapsychologist: 'third-eye',
  photographer: 'eye-target',
  pilot: 'feathered-wing',
  'police-detective': 'hunter-eyes',
  'police-officer': 'manacles',
  'private-investigator': 'hooded-figure',
  professor: 'spell-book',
  alienist: 'brain-tentacle',
  psychiatrist: 'psychic-waves',
  sailor: 'anchor',
  scientist: 'bubbling-flask',
  secretary: 'contract',
  soldier: 'rifle',
  spy: 'cloak-dagger',
  student: 'scroll-unfurled',
  'tribe-member': 'tribal-mask',
  zealot: 'burning-book',
  'gangster-boss': 'crowned-skull',
  'gangster-underling': 'pistol-gun',
  'gentleman-lady': 'laurel-crown',
};

/** A weapon's picture: by what it is, then by the skill it is used with. */
function weaponIcon(weapon: WeaponDef): string {
  if (/нож|кинжал|мачете/i.test(weapon.name)) return 'plain-dagger';
  if (/динамит|граната/i.test(weapon.name)) return 'grenade';
  if (/молотов/i.test(weapon.name)) return 'fire';
  const [base, speciality] = weapon.skill.split(':');
  if (base === 'throw') return 'thrown-knife';
  return (
    {
      brawl: 'fist',
      sword: 'broadsword',
      axe: 'battle-axe',
      spear: 'barbed-spear',
      whip: 'whip',
      garrote: 'rope-coil',
      chainsaw: 'chainsaw',
      bow: 'bow-arrow',
      handgun: 'revolver',
      'rifle-shotgun': 'rifle',
      'submachine-gun': 'pistol-gun',
      'machine-gun': 'bolter-gun',
      flamethrower: 'flamethrower',
    }[speciality ?? ''] ?? 'crossed-swords'
  );
}

const d6s = (dice: number[]): ThrownDie[] => dice.map((value) => ({ sides: 6, value }));

/**
 * A rolled number with the dice of the throw that made it: the dice tumble small beside it and the
 * number comes in once they are down. Without a throw on this visit the number simply stands.
 */
const ThrownNumber: React.FC<{
  value: React.ReactNode;
  throwKey: number | null;
  dice?: ThrownDie[];
  delay?: number;
  /** Between the dice and the number ("+13 ×5 ="). */
  note?: string;
  /** The dice under the number instead of beside it. */
  stacked?: boolean;
  className?: string;
}> = ({ value, throwKey, dice, delay, note, stacked, className }) => {
  const [landed, markLanded] = useLanded(dice ? throwKey : null);
  const thrown = dice && throwKey !== null && (
    <RollingDice key={throwKey} dice={dice} size="1.45rem" delay={delay} stagger={80} onLanded={markLanded} />
  );
  return (
    <span className={cx('flex items-center', stacked ? 'flex-col-reverse gap-2' : 'gap-3')}>
      {thrown}
      {note && dice && <span className="text-xs text-ink-faint">{note}</span>}
      <LandedValue landed={landed} className={className}>
        {value}
      </LandedValue>
    </span>
  );
};

/** One EDU improvement check as thrown: the d100 against EDU, the d10 it adds on a pass. */
const EduThrow: React.FC<{ check: { roll: number; die?: number; gain: number }; delay: number }> = ({
  check,
  delay,
}) => {
  const [landed, setLanded] = useState(false);
  return (
    <span className="flex items-center gap-1.5">
      <RollingDice
        dice={[
          { sides: 100, value: check.roll },
          ...(check.die !== undefined ? [{ sides: 10, value: check.die }] : []),
        ]}
        size="2.2rem"
        delay={delay}
        stagger={160}
        onLanded={() => setLanded(true)}
      />
      <LandedValue
        landed={landed}
        className={cx('ui-numeric text-sm', check.gain ? 'text-success' : 'text-ink-faint')}
      >
        +{check.gain}
      </LandedValue>
    </span>
  );
};

/** How many throws were made again: re-rolls are free, but the master sees how many. */
const Rerolls: React.FC<{ count: number; className?: string }> = ({ count, className }) =>
  count > 0 ? (
    <p className={cx('text-center text-xs text-ink-faint', className)}>Перебросов: {count}</p>
  ) : null;

/** Skills an entry gives, as quiet tags: read, not picked. */
const SkillTags: React.FC<{ ids: string[] }> = ({ ids }) => (
  <div className="flex flex-wrap gap-1.5">
    {ids.map((id) => (
      <span key={id} className="rounded-[var(--radius)] border border-line/70 px-2.5 py-1 text-[13px] text-ink-muted">
        {skillName(id)}
      </span>
    ))}
  </div>
);

// ------------------------------------------------------------------------------------------------
// Rules
// ------------------------------------------------------------------------------------------------

/** The era first (it holds for both editions), then the edition as a fan of cards; choosing one moves on. */
export const RulesStep: React.FC<{ creation: CocCreation; onChosen: () => void }> = ({
  creation,
  onChosen,
}) => (
  <div className="flex w-full flex-col items-center gap-6">
    <div className="flex items-center gap-3">
      <span className="ui-label !mb-0">Эпоха</span>
      <Segmented
        label="Эпоха"
        value={creation.era}
        onChange={creation.setEra}
        options={[
          { value: '1920s', label: '1920-е' },
          { value: 'modern', label: 'Наши дни' },
        ]}
      />
    </div>
    <EditionCarousel
      value={creation.editionChosen ? creation.variant : null}
      onChange={(variant) => {
        creation.setVariant(variant);
        onChosen();
      }}
    />
  </div>
);

// ------------------------------------------------------------------------------------------------
// Pulp archetype
// ------------------------------------------------------------------------------------------------

export const ArchetypeStep: React.FC<{ creation: CocCreation }> = ({ creation }) => {
  const info = creation.archetypeInfo;
  const core = creation.core;
  return (
    <>
      <EmblemGrid
        columns={7}
        items={ARCHETYPES.map((a) => ({ id: a.id, name: a.name, icon: ICONS[a.id] }))}
        selected={creation.archetype}
        onSelect={creation.setArchetype}
      />
      <Picked
        title={info?.name}
        text={info?.description}
        empty="Выберите архетип: кем ваш герой был бы на обложке бульварного романа."
        facts={
          info && (
            <Facts
              facts={[
                ['Основная характеристика', info.core.map((id) => CHAR_SHORT[id]).join(' или ')],
                ['Очки архетипа', '100'],
                ['Таланты', `${info.talents} на выбор`],
              ]}
            />
          )
        }
      >
        {info && (
          <>
            <Section
              title="Основная характеристика"
              count={{ picked: core ? 1 : 0, total: 1 }}
              hint="(1d6+13)×5 — заменяет обычный бросок этой характеристики. Перебросить можно сколько угодно, мастер увидит число перебросов."
            >
              <div className="flex flex-wrap items-center gap-3">
                {info.core.map((id) => {
                  const mine = core?.id === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      className="ui-option ui-option--chip"
                      aria-pressed={mine}
                      onClick={() => creation.rollCore(id)}
                    >
                      {mine ? `${tIn('coc', CHARACTERISTICS.find((c) => c.id === id)?.name ?? '')} · перебросить` : `Бросить ${tIn('coc', CHARACTERISTICS.find((c) => c.id === id)?.name ?? '')}`}
                    </button>
                  );
                })}
                {core && creation.throws.core && (
                  <ThrownNumber
                    throwKey={creation.throws.core.serial}
                    dice={d6s([creation.throws.core.dice])}
                    note="+13 ×5 ="
                    value={`${CHAR_SHORT[core.id]} ${core.value}`}
                    className="ui-display ui-numeric text-2xl text-frame-bright"
                  />
                )}
                {core && !creation.throws.core && (
                  <span className="ui-display ui-numeric text-2xl text-frame-bright">
                    {CHAR_SHORT[core.id]} {core.value}
                  </span>
                )}
              </div>
            </Section>
            <Section title="Навыки архетипа" hint="На них идут 100 очков архетипа.">
              <SkillTags ids={info.skills} />
            </Section>
            {info.occupations && info.occupations.length > 0 && (
              <Section title="Подходящие профессии">
                <p className="text-sm text-ink-muted">
                  {info.occupations.map((id) => OCCUPATIONS.find((o) => o.id === id)?.name ?? id).join(', ')}
                </p>
              </Section>
            )}
          </>
        )}
      </Picked>
    </>
  );
};

// ------------------------------------------------------------------------------------------------
// Characteristics
// ------------------------------------------------------------------------------------------------

export const CharacteristicsStep: React.FC<{ creation: CocCreation }> = ({ creation }) => {
  const total = CHARACTERISTICS.reduce((sum, c) => sum + creation.base[c.id], 0);
  const wrong = new Set(creation.method === 'manual' ? manualOutOfRange(creation.base) : []);
  return (
    <div className="mx-auto flex max-w-5xl flex-col items-center gap-5">
      <Segmented
        label="Способ"
        value={creation.method}
        onChange={creation.setMethod}
        options={[
          { value: 'roll', label: 'Бросок' },
          { value: 'pointBuy', label: `Распределение ${POINT_BUY_TOTAL}` },
          { value: 'manual', label: 'Вручную' },
        ]}
      />
      {/* On a phone the hint goes over its button, centred, rather than squeezed beside it. */}
      <div className="flex min-h-10 items-center gap-4 text-sm text-ink-muted max-sm:flex-col max-sm:gap-2 max-sm:text-center">
        {creation.method === 'roll' && (
          <>
            <span>3d6×5 или (2d6+6)×5 для каждой характеристики.</span>
            <Button variant={creation.rolled ? 'secondary' : 'primary'} onClick={creation.rollAll}>
              {creation.rolled ? 'Перебросить всё' : 'Бросить характеристики'}
            </Button>
          </>
        )}
        {creation.method === 'pointBuy' && (
          <span className={total === POINT_BUY_TOTAL ? 'text-success' : undefined}>
            Распределено <span className="ui-numeric text-ink">{total}</span> из {POINT_BUY_TOTAL}
          </span>
        )}
        {creation.method === 'manual' && (
          <span className={wrong.size ? 'text-warning' : undefined}>
            Выброшенное на своих кубах: кратно 5, 3d6×5 — от 15 до 90, (2d6+6)×5 — от 40 до 90.
          </span>
        )}
      </div>
      <div className="grid w-full grid-cols-4 gap-3 max-lg:grid-cols-[repeat(auto-fill,minmax(min(9rem,100%),1fr))]">
        {CHARACTERISTICS.map((c, index) => {
          const value = creation.base[c.id];
          const final = creation.characteristics[c.id];
          const thrown = creation.throws.characteristics;
          const isCore = creation.pulp && creation.core?.id === c.id;
          return (
            <ScoreCard
              key={c.id}
              label={c.name}
              primary={isCore ? 'основная · архетип' : undefined}
              controls={
                creation.method !== 'roll' && (
                  <NumberField
                    label={c.name}
                    value={value}
                    min={creation.method === 'manual' && c.roll !== '3d6' ? 40 : 15}
                    max={90}
                    step={5}
                    onChange={(v) => creation.setBase({ ...creation.base, [c.id]: v })}
                    className={cx('w-28', wrong.has(c.id) && 'text-warning')}
                  />
                )
              }
              description={[c.roll === '3d6' ? '3d6×5' : '(2d6+6)×5', final !== value && value > 0 && `бросок ${value}`, final > 0 && `½ ${half(final)} · ⅕ ${fifth(final)}`].filter(Boolean).join(' · ')}
            >
              <ThrownNumber
                stacked
                throwKey={creation.method === 'roll' ? (thrown?.serial ?? null) : null}
                dice={creation.method === 'roll' && thrown && value ? d6s(thrown.dice[c.id]) : undefined}
                delay={index * 90}
                value={final || '—'}
                className="ui-display ui-numeric text-4xl leading-none text-ink"
              />
            </ScoreCard>
          );
        })}
      </div>
      <Panel ornate={false} className="flex items-center gap-5 px-6 py-4 max-sm:w-full max-sm:flex-wrap max-sm:justify-center max-sm:gap-x-4 max-sm:gap-y-3 max-sm:px-4">
        <WireDie shape="d10" spin={creation.luck ? 0.6 : 2} className="h-11 w-11 text-frame-bright" />
        <div className="min-w-[8rem]">
          <div className="ui-stat__label">Удача · {creation.pulp ? '(2d6+6)×5' : '3d6×5'}</div>
          <ThrownNumber
            throwKey={creation.throws.luck?.serial ?? null}
            dice={creation.throws.luck && creation.luck ? d6s(creation.throws.luck.dice) : undefined}
            value={creation.luck || '—'}
            className="ui-display ui-numeric text-3xl leading-tight"
          />
        </div>
        <Button variant={creation.luckRolls.length ? 'secondary' : 'primary'} onClick={creation.rollLuck}>
          {creation.luckRolls.length ? 'Перебросить' : 'Бросить удачу'}
        </Button>
      </Panel>
      <Rerolls count={creation.rerolls} />
    </div>
  );
};

// ------------------------------------------------------------------------------------------------
// Age
// ------------------------------------------------------------------------------------------------

/** The rows of the age table, each a card to jump to: what that time of life costs and gives. */
const AGE_BRACKETS: { from: number; to: number; label: string }[] = [
  { from: 15, to: 19, label: '15–19' },
  { from: 20, to: 39, label: '20–39' },
  { from: 40, to: 49, label: '40–49' },
  { from: 50, to: 59, label: '50–59' },
  { from: 60, to: 69, label: '60–69' },
  { from: 70, to: 79, label: '70–79' },
  { from: 80, to: 89, label: '80–89' },
];

const bracketEffects = (age: number): string[] => {
  const r = ageRules(age);
  if (r.youth) return ['−5 СИЛ/ТЕЛ', '−5 ОБР', 'удача дважды'];
  return [
    `${r.eduChecks} ${r.eduChecks === 1 ? 'проверка' : 'проверки'} ОБР`,
    ...(r.physicalLoss ? [`−${r.physicalLoss} СИЛ/ВЫН/ЛВК`] : []),
    ...(r.appLoss ? [`−${r.appLoss} НАР`] : []),
    ...(r.moveLoss ? [`−${r.moveLoss} движения`] : []),
  ];
};

export const AgeStep: React.FC<{ creation: CocCreation }> = ({ creation }) => {
  const { rules } = creation;
  const lossIds: CharacteristicId[] = rules.youth ? ['str', 'siz'] : ['str', 'con', 'dex'];
  const budget = rules.youth ? 5 : rules.physicalLoss;
  const spent = rules.youth ? creation.youthSpent : creation.ageSpent;
  return (
    <div className="mx-auto flex max-w-5xl flex-col">
      <div className="flex items-end justify-center gap-4">
        <div className="flex flex-col items-center gap-1">
          <span className="ui-label">Возраст</span>
          <NumberField label="Возраст" value={creation.age} min={15} max={89} onChange={creation.setAge} className="w-32" />
        </div>
      </div>
      <div className="mt-6 grid grid-cols-7 gap-1.5 max-lg:grid-cols-4 max-sm:grid-cols-2">
        {AGE_BRACKETS.map((b) => {
          const current = creation.age >= b.from && creation.age <= b.to;
          return (
            <button
              key={b.label}
              type="button"
              className="ui-option items-center gap-1.5 px-2 py-3 text-center"
              aria-pressed={current}
              onClick={() => !current && creation.setAge(b.from === 15 ? 17 : b.from === 20 ? 25 : b.from + 5)}
            >
              <span className="ui-display ui-numeric text-lg leading-none">{b.label}</span>
              <span className="flex flex-col text-[11px] leading-snug text-ink-faint">
                {bracketEffects(b.from).map((e) => (
                  <span key={e}>{e}</span>
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-8">
        {budget > 0 && (
          <Section
            title={rules.youth ? 'Потеря СИЛ/ТЕЛ' : 'Потеря СИЛ/ВЫН/ЛВК'}
            count={{ picked: spent, total: budget }}
            hint={rules.youth ? 'Юность: 5 очков из Силы и Телосложения, как вам угодно.' : 'Годы берут своё: распределите потерю между Силой, Выносливостью и Ловкостью.'}
          >
            <div className="grid grid-cols-3 gap-2">
              {lossIds.map((id) => (
                <div key={id} className="ui-option flex-row items-center justify-between px-4 py-2.5">
                  <span className="text-sm">{tIn('coc', CHARACTERISTICS.find((c) => c.id === id)?.name ?? '')}</span>
                  <NumberField
                    label={CHAR_SHORT[id]}
                    value={creation.ageLoss[id] ?? 0}
                    min={0}
                    max={budget}
                    onChange={(v) => creation.setAgeLoss({ ...creation.ageLoss, [id]: v })}
                    className="w-28"
                  />
                </div>
              ))}
            </div>
          </Section>
        )}
        {rules.eduChecks > 0 && (
          <Section
            title="Проверки ОБР"
            count={{ picked: creation.eduGains ? rules.eduChecks : 0, total: rules.eduChecks }}
            hint="d100 выше Образования — оно растёт на 1d10."
            aside={
              <Button size="sm" variant={creation.eduGains ? 'ghost' : 'primary'} onClick={creation.rollEdu}>
                {creation.eduGains ? 'Перебросить' : `Бросить (${rules.eduChecks})`}
              </Button>
            }
          >
            {creation.eduGains && creation.throws.edu ? (
              <div key={creation.throws.edu.serial} className="flex flex-wrap items-center gap-x-6 gap-y-2">
                {creation.throws.edu.dice.map((check, i) => (
                  <EduThrow key={i} check={check} delay={i * 300} />
                ))}
              </div>
            ) : creation.eduGains ? (
              <p className="text-sm text-ink-muted">
                Образование выросло на{' '}
                <span className="ui-numeric text-success">+{creation.eduGains.reduce((s, g) => s + g, 0)}</span>.
              </p>
            ) : (
              <p className="text-sm text-ink-faint">Ещё не брошено.</p>
            )}
          </Section>
        )}
        {rules.youth && (
          <Section
            title="Второй бросок удачи"
            count={{ picked: creation.luckRolls.length, total: 2 }}
            hint="В юности удача бросается дважды, берётся лучшая."
            aside={
              creation.luckRolls.length < 2 && (
                <Button size="sm" variant="primary" onClick={creation.rollLuck}>
                  Бросить
                </Button>
              )
            }
          >
            {creation.luckRolls.length === 2 && creation.throws.luck ? (
              <div className="flex items-center gap-3 text-sm text-ink-muted">
                Удача: {creation.luckRolls.join(' и ')}, берётся
                <ThrownNumber
                  throwKey={creation.throws.luck.serial}
                  dice={d6s(creation.throws.luck.dice)}
                  value={creation.luck}
                  className="ui-display ui-numeric text-2xl text-frame-bright"
                />
              </div>
            ) : (
              <p className="text-sm text-ink-faint">Первый бросок: {creation.luckRolls[0] ?? '—'}.</p>
            )}
          </Section>
        )}
        {!budget && !rules.eduChecks && !rules.youth && (
          <p className="text-center text-sm text-ink-faint">В этом возрасте годы ничего не меняют.</p>
        )}
      </div>
      <Rerolls count={creation.rerolls} className="mt-6" />
    </div>
  );
};

// ------------------------------------------------------------------------------------------------
// Occupation
// ------------------------------------------------------------------------------------------------

/**
 * Fifty occupations read better as a list than as a wall of emblems: the list with a search on the
 * left, what the picked one gives and asks on the right, both in view at once.
 */
export const OccupationStep: React.FC<{ creation: CocCreation }> = ({ creation }) => {
  const [query, setQuery] = useState('');
  const info = creation.occupationInfo;
  const shown = OCCUPATIONS.filter(
    (o) => (!o.era || o.era === creation.era) && t(o.name).toLowerCase().includes(query.trim().toLowerCase()),
  );
  const fixed = info?.skills.flatMap((choice) => ('skill' in choice ? [choice.skill] : [])) ?? [];
  // Coming back to the step, the picked occupation is in view, not somewhere below the fold.
  const pickedRef = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    pickedRef.current?.scrollIntoView({ block: 'center' });
  }, []);
  return (
    // Below the desktop the list stands over what the picked occupation gives, scrolling in its own room.
    <div className="grid h-full grid-cols-[17rem_minmax(0,1fr)] gap-6 max-lg:h-auto max-lg:grid-cols-1">
      <div className="flex min-h-0 flex-col max-lg:h-[40vh]">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Найти профессию" className="mb-2" />
        <div className="ui-scroll -mr-2 min-h-0 flex-1 space-y-1 overflow-y-auto pr-2">
          {shown.map((o) => (
            <button
              key={o.id}
              ref={creation.occupation === o.id ? pickedRef : undefined}
              type="button"
              className="ui-option w-full flex-row items-center gap-3 py-2"
              aria-pressed={creation.occupation === o.id}
              onClick={() => creation.setOccupation(o.id)}
            >
              <GameIcon name={ICONS[o.id]} kind="ability" size={26} className="ui-origin__icon shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{o.name}</span>
                <span className="ui-option__meta block">
                  Средства {o.creditRating[0]}–{o.creditRating[1]}
                </span>
              </span>
              {o.lovecraftian && (
                <span className="text-frame-bright" title="Типична для рассказов Лавкрафта">
                  ✦
                </span>
              )}
            </button>
          ))}
          {shown.length === 0 && <p className="py-6 text-center text-sm text-ink-faint">Ничего не найдено</p>}
        </div>
      </div>
      <div className="ui-scroll min-h-0 overflow-y-auto border-l border-line/60 pl-6 pr-1">
        {info ? (
          <>
            <div className="flex items-center gap-4">
              <GameIcon name={ICONS[info.id]} kind="ability" size={52} className="ui-origin__icon shrink-0" />
              <div>
                <h3 className="ui-display ui-title text-[1.6rem] leading-tight text-frame-bright">{info.name}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-muted">{info.description}</p>
              </div>
            </div>
            <Facts
              className="mt-5"
              facts={[
                ['Очки профессии', `${formulaText(info.points)} = ${creation.budgets.occupation}`],
                ['Средства', `${info.creditRating[0]}–${info.creditRating[1]}`],
              ]}
            />
            {info.contacts && (
              <p className="mt-3 text-sm text-ink-muted">
                <span className="text-ink-faint">Связи: </span>
                {info.contacts}
              </p>
            )}
            <div className="mt-7">
              <Section title="Навыки профессии">
                <SkillTags ids={[...fixed, 'credit-rating']} />
              </Section>
              {info.skills.map((choice, i) => {
                if ('skill' in choice) return null;
                const options = choiceOptions(choice);
                const picked = creation.picks[i] ?? [];
                const list = choiceList(info, i, creation.picks, creation.era);
                return (
                  <Section
                    key={i}
                    title={`Выбор навыков ${creation.choiceNumber[i]}`}
                    count={{ picked: picked.length, total: choice.pick }}
                    hint={options === 'any' ? 'Любые навыки' : 'social' in choice ? 'Межличностные навыки' : undefined}
                  >
                    <div className="flex flex-wrap gap-1.5">
                      {list.map((id) => {
                        const on = picked.includes(id);
                        return (
                          <button
                            key={id}
                            type="button"
                            aria-pressed={on}
                            className="ui-option ui-option--chip !h-8 !px-3 !text-[13px]"
                            onClick={() =>
                              creation.setPicks({
                                ...creation.picks,
                                [i]: on ? picked.filter((p) => p !== id) : [...picked, id].slice(-choice.pick),
                              })
                            }
                          >
                            {skillName(id)}
                          </button>
                        );
                      })}
                    </div>
                  </Section>
                );
              })}
            </div>
          </>
        ) : (
          <div className="grid h-full place-items-center text-center text-sm text-ink-faint">
            <p>
              Профессия даёт навыки и очки на них.
              <br />✦ — типичные для рассказов Лавкрафта.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------
// Skills
// ------------------------------------------------------------------------------------------------

const Budget: React.FC<{ label: string; left: number; total: number }> = ({ label, left, total }) => (
  <div className="flex flex-col items-center px-5">
    <span
      className={cx(
        'ui-display ui-numeric text-3xl leading-none',
        left === 0 ? 'text-success' : left < 0 ? 'text-danger' : 'text-frame-bright',
      )}
    >
      {left}
    </span>
    <span className="ui-label !mb-0 mt-1.5">{label}</span>
    <span className="text-[11px] text-ink-faint">осталось из {total}</span>
  </div>
);

/**
 * Skill points: occupation points on the occupation's skills (Credit Rating within its range),
 * personal interest on any skill, a Pulp archetype's 100 on its skills. A skill starts at most at 99.
 */
export const SkillsStep: React.FC<{ creation: CocCreation }> = ({ creation }) => {
  const [filter, setFilter] = useState('');
  const own = new Set(creation.ownSkills);
  const archetypeSkills = creation.archetypeInfo?.skills ?? [];
  const inArchetype = (id: string) => archetypeSkills.some((a) => a === id || id.startsWith(`${a}:`));
  const ids = useMemo(() => {
    const list = new Set<string>([
      ...creation.ownSkills,
      ...Object.keys(creation.points.personal),
      ...Object.keys(creation.points.archetype),
    ]);
    for (const s of sheetSkills(creation.era)) if (!s.specialities && !s.noPoints) list.add(s.id);
    ['fighting:brawl', 'firearms:handgun', 'firearms:rifle-shotgun'].forEach((id) => list.add(id));
    for (const a of archetypeSkills) if (a.includes(':') || !skillDef(a)?.skill.specialities) list.add(a);
    return [...list].filter((id) => !skillDef(id)?.skill.noPoints);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the lists above
  }, [creation.ownSkills, creation.era, creation.points, archetypeSkills.join()]);
  const needle = filter.trim().toLowerCase();
  const rows = ids
    .map((id) => ({ id, name: skillName(id), own: own.has(id), arch: inArchetype(id) }))
    .filter((r) => !needle || t(r.name).toLowerCase().includes(needle))
    .sort((a, b) => compareText(a.name, b.name));
  // The occupation's skills first, then the archetype's, then the rest: where each pool's points go.
  const groups = [
    { title: 'Навыки профессии', rows: rows.filter((r) => r.own) },
    ...(creation.pulp ? [{ title: 'Навыки архетипа', rows: rows.filter((r) => !r.own && r.arch) }] : []),
    { title: 'Другие навыки', rows: rows.filter((r) => !r.own && !(creation.pulp && r.arch)) },
  ].filter((g) => g.rows.length > 0);
  const range = creation.occupationInfo?.creditRating;
  const wealth = wealthOf(creation.creditRating, creation.era);
  const columns = creation.pulp ? 5 : 4;

  const field = (pool: 'occupation' | 'personal' | 'archetype', id: string, label: string) => (
    <NumberField
      label={`${label}: ${skillName(id)}`}
      value={creation.points[pool][id] ?? 0}
      min={0}
      step={5}
      onChange={(v) => creation.setPoint(pool, id, v)}
      className="w-24"
    />
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-center divide-x divide-line/60">
        <Budget label="Очки профессии" left={creation.remaining.occupation} total={creation.budgets.occupation} />
        <Budget label="Личные очки" left={creation.remaining.personal} total={creation.budgets.personal} />
        {creation.pulp && (
          <Budget label="Очки архетипа" left={creation.remaining.archetype} total={creation.budgets.archetype} />
        )}
      </div>
      <div className="flex items-center justify-between gap-4 max-sm:flex-col max-sm:items-stretch max-sm:gap-2">
        {range ? (
          <p className="text-sm text-ink-muted">
            Средства <span className="ui-numeric text-ink">{creation.creditRating}</span> из {range[0]}–{range[1]} ·{' '}
            {wealth.label}, наличные ${wealth.cash.toLocaleString(locale)}
          </p>
        ) : (
          <span />
        )}
        <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Найти навык" className="w-56 max-sm:w-full" />
      </div>
      {/* On a phone each row is a small card: the name and the total, the pools' fields under them. */}
      <table className="coc-points w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-[0.1em] text-ink-faint">
            <th className="py-1.5 font-normal">Навык</th>
            <th className="w-28 font-normal">Профессия</th>
            <th className="w-28 font-normal">Личные</th>
            {creation.pulp && <th className="w-28 font-normal">Архетип</th>}
            <th className="w-14 text-right font-normal">Итог</th>
          </tr>
        </thead>
        {groups.map((group) => (
          <tbody key={group.title}>
            <tr>
              <td colSpan={columns} className="pb-1.5 pt-4">
                <span className="ui-section__title">{group.title}</span>
              </td>
            </tr>
            {group.rows.map((row) => (
              <tr key={row.id} className="border-t border-line/40">
                <td className={cx('py-1', row.own || row.arch ? 'text-ink' : 'text-ink-muted')}>{row.name}</td>
                <td data-pool="Профессия">{row.own && field('occupation', row.id, 'Профессия')}</td>
                <td data-pool="Личные">{row.id !== 'credit-rating' && field('personal', row.id, 'Личные')}</td>
                {creation.pulp && <td data-pool="Архетип">{row.arch && field('archetype', row.id, 'Архетип')}</td>}
                <td className="ui-display ui-numeric text-right text-base">{creation.skillValue(row.id)}</td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------
// Talents (Pulp)
// ------------------------------------------------------------------------------------------------

const TALENT_GROUPS: { id: TalentCategory; title: string; icon: string }[] = [
  { id: 'physical', title: 'Физические', icon: 'muscle-up' },
  { id: 'mental', title: 'Ментальные', icon: 'brain' },
  { id: 'combat', title: 'Боевые', icon: 'crossed-swords' },
  { id: 'misc', title: 'Особые', icon: 'sparkles' },
];

/**
 * The talents as cards on the page, the full list in a picker: thirty descriptions at once are a
 * wall. Those that suit the archetype head the list.
 */
export const TalentsStep: React.FC<{ creation: CocCreation }> = ({ creation }) => {
  const need = creation.archetypeInfo?.talents ?? 2;
  const suggested = new Set(creation.archetypeInfo?.suggestedTalents ?? []);
  const options: OptionView[] = [...TALENTS]
    .sort((a, b) => Number(suggested.has(b.id)) - Number(suggested.has(a.id)))
    .map((t) => {
      const group = TALENT_GROUPS.find((g) => g.id === t.category);
      return {
        id: t.id,
        name: suggested.has(t.id) ? `${t.name} ✦` : t.name,
        description: t.description,
        group: group?.title,
        iconName: group?.icon,
        meta: suggested.has(t.id) ? `${group?.title} · подходит архетипу` : group?.title,
      };
    });
  const toggle = (id: string) =>
    creation.setTalents(
      creation.talents.includes(id)
        ? creation.talents.filter((t) => t !== id)
        : creation.talents.length < need
          ? [...creation.talents, id]
          : creation.talents,
    );
  return (
    <div className="mx-auto max-w-4xl">
      <Section
        title="Таланты"
        count={{ picked: creation.talents.length, total: need }}
        hint={
          creation.archetypeInfo
            ? `Особые умения героя Pulp. ✦ — подходят архетипу «${creation.archetypeInfo.name}».`
            : 'Особые умения героя Pulp.'
        }
      >
        <PickList title="Таланты" options={options} picks={creation.talents} count={need} kind="ability" onToggle={toggle} detailed />
      </Section>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------
// Backstory, gear, identity
// ------------------------------------------------------------------------------------------------

const STORY: { field: keyof CocSheet['backstory']; title: string; hint: string }[] = [
  { field: 'personalDescription', title: 'Внешность', hint: 'Как выглядит, во что одет' },
  { field: 'ideology', title: 'Убеждения', hint: 'Во что верит' },
  { field: 'significantPeople', title: 'Значимые люди', hint: 'Кто дорог и почему' },
  { field: 'meaningfulLocations', title: 'Важные места', hint: 'Где ему спокойно' },
  { field: 'treasuredPossessions', title: 'Ценные вещи', hint: 'Без чего не выходит из дома' },
  { field: 'traits', title: 'Черты', hint: 'Привычки и характер' },
];

export const StoryStep: React.FC<{ creation: CocCreation }> = ({ creation }) => (
  <div className="mx-auto grid max-w-4xl grid-cols-2 gap-x-5 gap-y-4 max-lg:grid-cols-1">
    <label className="flex flex-col">
      <span className="ui-label">Где живёт</span>
      <Input value={creation.residence} onChange={(e) => creation.setResidence(e.target.value)} placeholder="Аркхем, Массачусетс" />
    </label>
    <label className="flex flex-col">
      <span className="ui-label">Где родился</span>
      <Input value={creation.birthplace} onChange={(e) => creation.setBirthplace(e.target.value)} placeholder="Бостон" />
    </label>
    {STORY.map((s) => (
      <label key={s.field} className="flex flex-col">
        <span className="ui-label">{s.title}</span>
        <TextArea
          rows={3}
          value={creation.story[s.field] ?? ''}
          placeholder={s.hint}
          onChange={(e) => creation.setStory({ ...creation.story, [s.field]: e.target.value })}
        />
      </label>
    ))}
    <p className="col-span-full text-center text-xs text-ink-faint">Всё можно оставить пустым и дописать на листе.</p>
  </div>
);

const GEAR_GROUPS: Record<string, string> = { fighting: 'Ближний бой', throw: 'Метание', firearms: 'Стрельба' };

/** A weapon as an option of the picker: its figures first, then what it is. */
function weaponOption(weapon: WeaponDef, era: CocEra): OptionView {
  const speciality = skillName(weapon.skill).match(/\(([^)]+)\)/)?.[1];
  const price = weapon.price?.[era];
  const figures = [
    `**Урон:** ${weapon.damage}`,
    `**Дальность:** ${weapon.range}`,
    `**Атак за раунд:** ${weapon.uses}`,
    weapon.ammo !== undefined && `**Патроны:** ${weapon.ammo}`,
    weapon.malfunction !== undefined && `**Осечка:** ${weapon.malfunction}`,
    price !== undefined && `**Цена:** $${price}`,
  ].filter(Boolean);
  return {
    id: weapon.id,
    name: weapon.name,
    group: GEAR_GROUPS[weapon.skill.split(':')[0] ?? ''],
    meta: [speciality ?? GEAR_GROUPS[weapon.skill.split(':')[0] ?? ''], weapon.damage].join(' · '),
    iconName: weaponIcon(weapon),
    description: [figures.map((f) => `- ${f}`).join('\n'), weapon.description].filter(Boolean).join('\n\n'),
  };
}

export const GearStep: React.FC<{ creation: CocCreation }> = ({ creation }) => {
  const options = WEAPONS.filter((w) => (!w.era || w.era === creation.era) && w.id !== 'unarmed').map((w) =>
    weaponOption(w, creation.era),
  );
  const toggle = (id: string) =>
    creation.setWeapons(creation.weapons.includes(id) ? creation.weapons.filter((x) => x !== id) : [...creation.weapons, id]);
  return (
    <div className="mx-auto max-w-4xl">
      <Section
        title="Оружие"
        aside={creation.weapons.length > 0 && <span className="ui-count">{creation.weapons.length}</span>}
        hint="Удар рукой есть у всех. Остальное — по средствам и по закону; выбранное ляжет в инвентарь. Можно ничего не брать."
      >
        <PickList
          title="Оружие"
          options={options}
          picks={creation.weapons}
          count={Infinity}
          kind="attack"
          onToggle={toggle}
        />
      </Section>
    </div>
  );
};

export const IdentityStep: React.FC<{ creation: CocCreation }> = ({ creation }) => (
  <SharedIdentityStep creation={creation} placeholder="Имя сыщика" />
);

// ------------------------------------------------------------------------------------------------
// Summary
// ------------------------------------------------------------------------------------------------

/** A round figure of the investigator: hit points, magic, sanity, luck. */
const Badge: React.FC<{ icon: React.ReactNode; value: React.ReactNode; label: string }> = ({ icon, value, label }) => (
  <div className="flex flex-col items-center gap-1" title={label}>
    <span className="ui-summary__badge">
      {icon}
      <span className="ui-numeric">{value}</span>
    </span>
    <span className="text-[10px] text-ink-faint">{label}</span>
  </div>
);

/**
 * The investigator as it stands, beside every step, laid out like the D&D hero's summary: emblem,
 * name and calling, the eight characteristics, the round figures, the rest of the numbers, the best
 * skills and the talents.
 */
export const CocSummary: React.FC<{ creation: CocCreation }> = ({ creation }) => {
  const sheet = creation.preview;
  const top = [...(sheet.coc?.skills ?? [])]
    .filter((s) => s.occupation || s.value >= 40)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
  const d = creation.derived;
  // Before the characteristics are set, what they decide is not known yet (not the table's lowest row).
  const rolled = CHARACTERISTICS.some((c) => creation.characteristics[c.id] > 0);
  const emblem = creation.occupation || creation.archetype;
  return (
    <Panel className="flex min-h-0 flex-col">
      <div className="ui-quiet-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden px-5 py-5">
        <header className="flex flex-col items-center text-center">
          {emblem && ICONS[emblem] ? (
            <GameIcon name={ICONS[emblem]} kind="ability" size={56} className="ui-origin__icon" />
          ) : (
            <SettingEmblem size={56} className="text-frame-bright" />
          )}
          <div className="ui-display mt-3 w-full truncate text-xl leading-tight text-ink">
            {creation.name.trim() || 'Безымянный'}
          </div>
          <div className="text-sm text-ink-muted">
            {[creation.occupationInfo?.name, creation.archetypeInfo?.name].filter(Boolean).join(' · ') || 'Сыщик'}
          </div>
          <div className="text-xs text-ink-faint">
            {creation.age} лет · {creation.era === '1920s' ? '1920-е' : 'наши дни'}
          </div>
        </header>

        <div className="grid grid-cols-4 gap-y-2 text-center">
          {CHARACTERISTICS.map((c) => (
            <div key={c.id}>
              <div className="text-[10px] tracking-[0.08em] text-ink-faint">{tIn('coc', c.short)}</div>
              <div className="ui-display ui-numeric text-lg leading-tight text-ink">
                {creation.characteristics[c.id] || '—'}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-2.5">
          <Badge icon={<IconHealth width={13} height={13} />} value={d.maxHP || '—'} label="Хиты" />
          <Badge icon={<IconSpells width={13} height={13} />} value={d.maxMP || '—'} label={tIn('ui', 'Магия')} />
          <Badge icon={<IconSanity width={13} height={13} />} value={d.startingSanity || '—'} label="Рассудок" />
          <Badge icon={<IconSparkle width={13} height={13} />} value={creation.luck || '—'} label="Удача" />
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[13px]">
          {(
            [
              ['Бонус урона', rolled ? d.damageBonus : '—'],
              ['Комплекция', rolled ? d.build : '—'],
              ['Движение', rolled ? d.move : '—'],
              ['Средства', creation.creditRating],
            ] as [string, React.ReactNode][]
          ).map(([label, value]) => (
            <div key={label} className="flex justify-between gap-2">
              <dt className="text-ink-faint">{label}</dt>
              <dd className="ui-numeric text-ink">{value}</dd>
            </div>
          ))}
        </dl>

        {top.length > 0 && (
          <section>
            <h4 className="ui-summary__heading">Лучшие навыки</h4>
            <div className="flex flex-col gap-0.5 text-[13px]">
              {top.map((s) => (
                <div key={s.id} className="flex justify-between gap-2">
                  <span className="truncate text-ink-muted">{skillName(s.id)}</span>
                  <span className="ui-numeric text-ink">{s.value}</span>
                </div>
              ))}
            </div>
          </section>
        )}
        {creation.talents.length > 0 && (
          <section>
            <h4 className="ui-summary__heading">Таланты</h4>
            <p className="text-center text-[13px] text-ink-muted">
              {creation.talents.map((id) => TALENTS.find((t) => t.id === id)?.name ?? id).join(' · ')}
            </p>
          </section>
        )}
        <Rerolls count={creation.rerolls} />
      </div>
    </Panel>
  );
};
