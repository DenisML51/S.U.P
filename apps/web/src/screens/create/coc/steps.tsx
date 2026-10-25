import React, { useMemo, useState } from 'react';
import {
  ARCHETYPES,
  CHARACTERISTICS,
  OCCUPATIONS,
  POINT_BUY_TOTAL,
  SKILLS,
  TALENTS,
  WEAPONS,
  fifth,
  half,
  sheetSkills,
  skillDef,
  skillName,
  wealthOf,
  type CharacteristicId,
  type PointsFormula,
  type TalentCategory,
} from '@itd/game-logic/coc';
import type { CocSheet } from '@itd/schema';
import { GameIcon } from '../../../ui/GameIcon';
import { NumberField, Segmented } from '../../../ui/forms';
import { Button, Input, Panel, TextArea, cx } from '../../../ui/primitives';
import { ImageSlot } from '../../../ui/ImageSlot';
import { WireDie } from '../../../ui/WireDie';
import { EditionCarousel } from '../../../ui/RulesetCards';
import { choiceOptions, type CocCreation } from './useCocCreation';

const CHAR_SHORT = Object.fromEntries(CHARACTERISTICS.map((c) => [c.id, c.short])) as Record<
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

/** A picture for an occupation or archetype, by what it is about. */
const ICONS: [RegExp, string][] = [
  [/professor|librarian|antiquarian|scholar|student|egghead|author|archaeolog/, 'spell-book'],
  [/journalist|photograph|secretary/, 'quill-ink'],
  [/detective|investigator|police|federal|spy/, 'eye-target'],
  [/doctor|nurse|psychiatr|alienist/, 'medical-pack'],
  [/soldier|military|two-fisted|beefcake|hunter|big-game/, 'crossed-swords'],
  [/occult|parapsych|mystic|dreamer|zealot|clergy|missionary/, 'pentagram-rose'],
  [/criminal|gangster|bootleg|femme|cold-blooded/, 'robber-mask'],
  [/engineer|mechanic|grease|scientist|programmer/, 'gears'],
  [/pilot|driver|sailor|explorer|adventurer|thrill|swashbuck|reckless/, 'compass'],
  [/artist|musician|entertainer|harlequin|bon-vivant/, 'drama-masks'],
  [/farmer|laborer|drifter|tribe|outsider|steadfast|sidekick/, 'campfire'],
  [/athlete|firefighter/, 'muscle-up'],
  [/lawyer|accountant|dilettante|gentleman/, 'scales'],
];
const iconFor = (id: string) => ICONS.find(([re]) => re.test(id))?.[1] ?? 'sparkles';

/** A grid of tiles to pick one from, in the creation screen's language. */
const TileGrid: React.FC<{
  items: { id: string; name: string; note?: string }[];
  selected?: string;
  onSelect: (id: string) => void;
  columns: number;
}> = ({ items, selected, onSelect, columns }) => (
  <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
    {items.map((item) => (
      <button
        key={item.id}
        type="button"
        className="ui-origin"
        aria-pressed={selected === item.id}
        onClick={() => onSelect(item.id)}
        title={item.note}
      >
        <GameIcon name={iconFor(item.id)} kind="ability" size={40} className="ui-origin__icon" />
        <span className="ui-origin__name">{item.name}</span>
      </button>
    ))}
  </div>
);

const Facts: React.FC<{ facts: [string, React.ReactNode][] }> = ({ facts }) => (
  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
    {facts.map(([label, value]) => (
      <React.Fragment key={label}>
        <dt className="text-ink-faint">{label}</dt>
        <dd className="text-ink">{value}</dd>
      </React.Fragment>
    ))}
  </dl>
);

// ------------------------------------------------------------------------------------------------
// Rules
// ------------------------------------------------------------------------------------------------

/** The edition, chosen as the rules were: a fan of cards; choosing one moves on. The era goes under it. */
export const RulesStep: React.FC<{ creation: CocCreation; onChosen: () => void }> = ({
  creation,
  onChosen,
}) => (
  <div className="flex w-full flex-col items-center gap-4">
    <EditionCarousel
      value={creation.editionChosen ? creation.variant : null}
      onChange={(variant) => {
        creation.setVariant(variant);
        onChosen();
      }}
    />
    <div className="flex flex-col items-center gap-2">
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
  </div>
);

// ------------------------------------------------------------------------------------------------
// Pulp archetype
// ------------------------------------------------------------------------------------------------

export const ArchetypeStep: React.FC<{ creation: CocCreation }> = ({ creation }) => {
  const info = creation.archetypeInfo;
  return (
    <div>
      <TileGrid
        items={ARCHETYPES}
        selected={creation.archetype}
        onSelect={creation.setArchetype}
        columns={7}
      />
      {info ? (
        <div className="mt-5 border-t border-line/60 pt-5">
          <h3 className="ui-display ui-title text-center text-[1.5rem] text-frame-bright">{info.name}</h3>
          <p className="mx-auto mt-1 max-w-2xl text-center text-sm text-ink-muted">{info.description}</p>
          <div className="mx-auto mt-5 grid max-w-3xl grid-cols-2 gap-6">
            <Facts
              facts={[
                ['Навыки архетипа', info.skills.map(skillName).join(', ')],
                ['Таланты', `${info.talents} на выбор`],
                [
                  'Профессии',
                  (info.occupations ?? [])
                    .map((id) => OCCUPATIONS.find((o) => o.id === id)?.name ?? id)
                    .join(', '),
                ],
              ]}
            />
            <div className="flex flex-col gap-2">
              <span className="ui-label">Основная характеристика — (1d6+13)×5</span>
              <div className="flex flex-wrap gap-2">
                {info.core.map((id) => (
                  <Button
                    key={id}
                    size="sm"
                    variant={creation.core?.id === id ? 'primary' : 'secondary'}
                    onClick={() => creation.rollCore(id)}
                  >
                    {creation.core?.id === id
                      ? `${CHAR_SHORT[id]} ${creation.core.value} · перебросить`
                      : `Бросить ${CHAR_SHORT[id]}`}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-ink-faint">
                Она заменит обычный бросок этой характеристики, если выйдет выше.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-8 text-center text-sm text-ink-faint">
          Выберите архетип: кем ваш герой был бы на обложке бульварного романа.
        </p>
      )}
    </div>
  );
};

// ------------------------------------------------------------------------------------------------
// Characteristics
// ------------------------------------------------------------------------------------------------

export const CharacteristicsStep: React.FC<{ creation: CocCreation }> = ({ creation }) => {
  const total = CHARACTERISTICS.reduce((sum, c) => sum + creation.base[c.id], 0);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-center gap-4">
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
        {creation.method === 'roll' && (
          <Button variant="primary" onClick={creation.rollAll}>
            {creation.rolled ? 'Перебросить всё' : 'Бросить характеристики'}
          </Button>
        )}
        {creation.method === 'pointBuy' && (
          <span className={cx('text-sm', total === POINT_BUY_TOTAL ? 'text-success' : 'text-warning')}>
            Распределено {total} из {POINT_BUY_TOTAL}
          </span>
        )}
      </div>
      <div className="grid grid-cols-4 gap-3">
        {CHARACTERISTICS.map((c) => {
          const value = creation.base[c.id];
          const final = creation.characteristics[c.id];
          return (
            <Panel key={c.id} ornate={false} className="flex flex-col gap-1 px-4 py-3">
              <span className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">
                {c.short} · {c.name}
              </span>
              {creation.method === 'roll' ? (
                <span className="ui-display ui-numeric text-3xl">{value || '—'}</span>
              ) : (
                <NumberField
                  label={c.name}
                  value={value}
                  min={15}
                  max={90}
                  step={5}
                  onChange={(v) => creation.setBase({ ...creation.base, [c.id]: v })}
                  className="w-24"
                />
              )}
              <span className="text-xs text-ink-faint">
                {c.roll === '3d6' ? '3d6×5' : '(2d6+6)×5'}
                {final !== value && value > 0 && <span className="text-ink-muted"> · итог {final}</span>}
                {value > 0 && ` · ½ ${half(final)} · ⅕ ${fifth(final)}`}
              </span>
            </Panel>
          );
        })}
      </div>
      <Panel ornate={false} className="mx-auto flex items-center gap-5 px-6 py-4">
        <WireDie shape="d10" spin={creation.luck ? 0.6 : 2} className="h-12 w-12 text-frame-bright" />
        <div>
          <div className="ui-label">Удача · {creation.pulp ? '(2d6+6)×5' : '3d6×5'}</div>
          <div className="ui-display ui-numeric text-3xl">{creation.luck || '—'}</div>
        </div>
        <Button onClick={creation.rollLuck}>
          {creation.luckRolls.length ? 'Перебросить' : 'Бросить удачу'}
        </Button>
      </Panel>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------
// Age
// ------------------------------------------------------------------------------------------------

export const AgeStep: React.FC<{ creation: CocCreation }> = ({ creation }) => {
  const { rules } = creation;
  const lossIds: CharacteristicId[] = rules.youth ? ['str', 'siz'] : ['str', 'con', 'dex'];
  const budget = rules.youth ? 5 : rules.physicalLoss;
  const spent = rules.youth ? creation.youthSpent : creation.ageSpent;
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-end justify-center gap-6">
        <NumberField
          label="Возраст"
          value={creation.age}
          min={15}
          max={89}
          onChange={creation.setAge}
          className="w-28"
        />
        <Facts
          facts={[
            ['Проверки ОБР', rules.eduChecks ? `${rules.eduChecks} (d100 выше ОБР — +1d10)` : 'нет'],
            [
              'Потеря',
              rules.youth
                ? '5 из СИЛ и ТЕЛ, 5 из ОБР'
                : rules.physicalLoss
                  ? `${rules.physicalLoss} из СИЛ, ВЫН и ЛВК`
                  : 'нет',
            ],
            ['Внешность', rules.appLoss ? `−${rules.appLoss}` : '—'],
            ['Движение', rules.moveLoss ? `−${rules.moveLoss}` : '—'],
            ...(rules.youth ? ([['Удача', 'бросается дважды, берётся лучшая']] as [string, string][]) : []),
          ]}
        />
      </div>
      {budget > 0 && (
        <Panel ornate={false} className="flex flex-col gap-3 px-6 py-4">
          <span className={cx('text-sm', spent === budget ? 'text-success' : 'text-warning')}>
            Распределите потерю: {spent} из {budget}
          </span>
          <div className="flex flex-wrap gap-4">
            {lossIds.map((id) => (
              <NumberField
                key={id}
                label={CHAR_SHORT[id]}
                value={creation.ageLoss[id] ?? 0}
                min={0}
                max={budget}
                onChange={(v) => creation.setAgeLoss({ ...creation.ageLoss, [id]: v })}
                className="w-24"
              />
            ))}
          </div>
        </Panel>
      )}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {rules.eduChecks > 0 && (
          <Button variant={creation.eduGains ? 'secondary' : 'primary'} onClick={creation.rollEdu}>
            {creation.eduGains
              ? `ОБР: +${creation.eduGains.reduce((s, g) => s + g, 0)} · перебросить`
              : `Проверки ОБР (${rules.eduChecks})`}
          </Button>
        )}
        {rules.youth && creation.luckRolls.length < 2 && (
          <Button onClick={creation.rollLuck}>Второй бросок удачи</Button>
        )}
      </div>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------
// Occupation
// ------------------------------------------------------------------------------------------------

export const OccupationStep: React.FC<{ creation: CocCreation }> = ({ creation }) => {
  const [query, setQuery] = useState('');
  const info = creation.occupationInfo;
  const shown = OCCUPATIONS.filter(
    (o) => (!o.era || o.era === creation.era) && o.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const anyOptions = useMemo(
    () =>
      SKILLS.flatMap((s) =>
        s.noPoints ? [] : s.specialities ? s.specialities.map((sp) => `${s.id}:${sp.id}`) : [s.id],
      ).filter((id) => id !== 'credit-rating'),
    [],
  );
  return (
    <div>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Найти профессию"
        className="mx-auto mb-3 block w-72"
      />
      <TileGrid
        items={shown.map((o) => ({
          id: o.id,
          name: o.lovecraftian ? `${o.name} ✦` : o.name,
          note: o.description,
        }))}
        selected={creation.occupation}
        onSelect={creation.setOccupation}
        columns={7}
      />
      {info ? (
        <div className="mt-5 border-t border-line/60 pt-5">
          <h3 className="ui-display ui-title text-center text-[1.5rem] text-frame-bright">{info.name}</h3>
          <p className="mx-auto mt-1 max-w-2xl text-center text-sm text-ink-muted">{info.description}</p>
          <div className="mx-auto mt-5 grid max-w-4xl grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-6">
            <Facts
              facts={[
                ['Очки профессии', `${formulaText(info.points)} = ${creation.budgets.occupation}`],
                ['Средства', `${info.creditRating[0]}–${info.creditRating[1]}`],
                ...(info.contacts ? ([['Связи', info.contacts]] as [string, string][]) : []),
              ]}
            />
            <div className="flex flex-col gap-3 text-sm">
              {info.skills.map((choice, i) => {
                if ('skill' in choice) return <div key={i}>• {skillName(choice.skill)}</div>;
                const options = choiceOptions(choice);
                const picked = creation.picks[i] ?? [];
                const list =
                  options === 'any'
                    ? anyOptions
                    : options.flatMap((id) =>
                        skillDef(id)?.skill.specialities && !id.includes(':')
                          ? skillDef(id)!.skill.specialities!.map((s) => `${id}:${s.id}`)
                          : [id],
                      );
                return (
                  <div key={i}>
                    <div className="mb-1 text-ink-muted">
                      Выбрать {choice.pick}:{' '}
                      {options === 'any' ? 'любые навыки' : 'social' in choice ? 'межличностные' : ''}
                      <span className="text-ink-faint">
                        {' '}
                        ({picked.length}/{choice.pick})
                      </span>
                    </div>
                    <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                      {list.map((id) => {
                        const on = picked.includes(id);
                        return (
                          <button
                            key={id}
                            type="button"
                            aria-pressed={on}
                            disabled={!on && picked.length >= choice.pick}
                            onClick={() =>
                              creation.setPicks({
                                ...creation.picks,
                                [i]: on ? picked.filter((p) => p !== id) : [...picked, id],
                              })
                            }
                            className={cx(
                              'rounded-sm border px-2 py-0.5 text-xs',
                              on
                                ? 'border-frame-bright text-frame-bright'
                                : 'border-line text-ink-muted disabled:opacity-40',
                            )}
                          >
                            {skillName(id)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-8 text-center text-sm text-ink-faint">
          Профессия даёт навыки и очки на них. ✦ — типичные для рассказов Лавкрафта.
        </p>
      )}
    </div>
  );
};

// ------------------------------------------------------------------------------------------------
// Skills
// ------------------------------------------------------------------------------------------------

const Budget: React.FC<{ label: string; left: number; total: number }> = ({ label, left, total }) => (
  <div className="flex flex-col items-center">
    <span
      className={cx(
        'ui-display ui-numeric text-2xl',
        left === 0 ? 'text-success' : left < 0 ? 'text-danger' : 'text-frame-bright',
      )}
    >
      {left}
    </span>
    <span className="text-xs text-ink-faint">
      {label} из {total}
    </span>
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
    .filter((r) => !needle || r.name.toLowerCase().includes(needle))
    .sort(
      (a, b) =>
        Number(b.own) - Number(a.own) ||
        Number(b.arch) - Number(a.arch) ||
        a.name.localeCompare(b.name, 'ru'),
    );
  const range = creation.occupationInfo?.creditRating;
  const wealth = wealthOf(creation.creditRating, creation.era);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-center gap-10">
        <Budget label="Профессия" left={creation.remaining.occupation} total={creation.budgets.occupation} />
        <Budget label="Личные (ИНТ×2)" left={creation.remaining.personal} total={creation.budgets.personal} />
        {creation.pulp && (
          <Budget label="Архетип" left={creation.remaining.archetype} total={creation.budgets.archetype} />
        )}
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Найти навык"
          className="w-48"
        />
      </div>
      {range && (
        <p className="text-center text-sm text-ink-muted">
          Средства {creation.creditRating} (профессия позволяет {range[0]}–{range[1]}) · {wealth.label},
          наличные ${wealth.cash.toLocaleString('ru-RU')}
        </p>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-ink-faint">
            <th className="py-1 font-normal">Навык</th>
            <th className="w-24 font-normal">Профессия</th>
            <th className="w-24 font-normal">Личные</th>
            {creation.pulp && <th className="w-24 font-normal">Архетип</th>}
            <th className="w-16 text-right font-normal">Итог</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-line/40">
              <td className={cx('py-1', row.own ? 'text-ink' : 'text-ink-muted')}>
                {row.name}
                {row.own && <span className="text-frame-bright"> ●</span>}
                {row.arch && <span className="text-accent"> ◆</span>}
              </td>
              <td>
                {row.own && (
                  <NumberField
                    label="Профессия"
                    value={creation.points.occupation[row.id] ?? 0}
                    min={0}
                    onChange={(v) => creation.setPoint('occupation', row.id, v)}
                    className="w-20"
                  />
                )}
              </td>
              <td>
                {row.id !== 'credit-rating' && (
                  <NumberField
                    label="Личные"
                    value={creation.points.personal[row.id] ?? 0}
                    min={0}
                    onChange={(v) => creation.setPoint('personal', row.id, v)}
                    className="w-20"
                  />
                )}
              </td>
              {creation.pulp && (
                <td>
                  {row.arch && (
                    <NumberField
                      label="Архетип"
                      value={creation.points.archetype[row.id] ?? 0}
                      min={0}
                      onChange={(v) => creation.setPoint('archetype', row.id, v)}
                      className="w-20"
                    />
                  )}
                </td>
              )}
              <td className="ui-numeric text-right text-base">{creation.skillValue(row.id)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-center text-xs text-ink-faint">
        ● навык профессии · ◆ навык архетипа · Средства покупаются очками профессии.
      </p>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------
// Talents (Pulp)
// ------------------------------------------------------------------------------------------------

const TALENT_GROUPS: { id: TalentCategory; title: string }[] = [
  { id: 'physical', title: 'Физические' },
  { id: 'mental', title: 'Ментальные' },
  { id: 'combat', title: 'Боевые' },
  { id: 'misc', title: 'Особые' },
];

export const TalentsStep: React.FC<{ creation: CocCreation }> = ({ creation }) => {
  const need = creation.archetypeInfo?.talents ?? 2;
  const suggested = new Set(creation.archetypeInfo?.suggestedTalents ?? []);
  const toggle = (id: string) =>
    creation.setTalents(
      creation.talents.includes(id)
        ? creation.talents.filter((t) => t !== id)
        : creation.talents.length < need
          ? [...creation.talents, id]
          : creation.talents,
    );
  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-sm text-ink-muted">
        Выберите таланты: {creation.talents.length} из {need}. ✦ — подходят архетипу.
      </p>
      <div className="grid grid-cols-4 gap-5">
        {TALENT_GROUPS.map((group) => (
          <div key={group.id} className="flex flex-col gap-1.5">
            <span className="ui-label">{group.title}</span>
            {TALENTS.filter((t) => t.category === group.id).map((t) => {
              const on = creation.talents.includes(t.id);
              return (
                <Panel
                  key={t.id}
                  as="button"
                  ornate={false}
                  interactive
                  active={on}
                  onClick={() => toggle(t.id)}
                  aria-pressed={on}
                  className="px-3 py-2 text-left"
                >
                  <span className="block text-sm text-ink">
                    {t.name}
                    {suggested.has(t.id) && <span className="text-frame-bright"> ✦</span>}
                  </span>
                  <span className="block text-xs text-ink-faint">{t.description}</span>
                </Panel>
              );
            })}
          </div>
        ))}
      </div>
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
  <div className="mx-auto flex max-w-4xl flex-col gap-4">
    <div className="grid grid-cols-2 gap-4">
      <Input
        value={creation.residence}
        onChange={(e) => creation.setResidence(e.target.value)}
        placeholder="Где живёт"
      />
      <Input
        value={creation.birthplace}
        onChange={(e) => creation.setBirthplace(e.target.value)}
        placeholder="Где родился"
      />
    </div>
    <div className="grid grid-cols-2 gap-4">
      {STORY.map((s) => (
        <label key={s.field} className="flex flex-col gap-1">
          <span className="ui-label">{s.title}</span>
          <TextArea
            rows={3}
            value={creation.story[s.field] ?? ''}
            placeholder={s.hint}
            onChange={(e) => creation.setStory({ ...creation.story, [s.field]: e.target.value })}
          />
        </label>
      ))}
    </div>
  </div>
);

export const GearStep: React.FC<{ creation: CocCreation }> = ({ creation }) => {
  const weapons = WEAPONS.filter((w) => !w.era || w.era === creation.era);
  const groups = [...new Set(weapons.map((w) => skillName(w.skill)))];
  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-sm text-ink-muted">
        Что сыщик носит с собой? Удар рукой есть у всех. Остальное — по средствам и по закону.
      </p>
      <div className="grid grid-cols-3 gap-5">
        {groups.map((group) => (
          <div key={group} className="flex flex-col gap-1">
            <span className="ui-label">{group}</span>
            {weapons
              .filter((w) => skillName(w.skill) === group && w.id !== 'unarmed')
              .map((w) => {
                const on = creation.weapons.includes(w.id);
                return (
                  <button
                    key={w.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      creation.setWeapons(
                        on ? creation.weapons.filter((x) => x !== w.id) : [...creation.weapons, w.id],
                      )
                    }
                    className={cx(
                      'flex justify-between gap-3 border-b border-line/40 py-1 text-left text-sm',
                      on ? 'text-frame-bright' : 'text-ink-muted hover:text-ink',
                    )}
                  >
                    <span>
                      {on ? '◆ ' : '◇ '}
                      {w.name}
                    </span>
                    <span className="text-xs text-ink-faint">{w.damage}</span>
                  </button>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
};

export const IdentityStep: React.FC<{ creation: CocCreation }> = ({ creation }) => (
  <div className="mx-auto flex h-full max-w-3xl flex-col justify-center gap-8">
    <input
      value={creation.name}
      onChange={(e) => creation.setName(e.target.value)}
      placeholder="Имя сыщика"
      aria-label="Имя сыщика"
      autoFocus
      className="ui-display border-b border-frame/50 bg-transparent pb-2 text-center text-4xl text-ink outline-none placeholder:text-ink-faint focus:border-frame-bright"
    />
    <div className="flex items-start justify-center gap-6">
      <ImageSlot
        label="Полный арт"
        kind="full"
        hint="Во весь рост"
        asset={creation.images.full}
        onUploaded={(full) => creation.setImages({ ...creation.images, full })}
        className="h-[16.6rem] w-40"
      />
      <ImageSlot
        label="Портрет"
        kind="portrait"
        hint="Лицо"
        asset={creation.images.portrait}
        onUploaded={(portrait) => creation.setImages({ ...creation.images, portrait })}
        className="h-[9.6rem] w-32"
      />
    </div>
  </div>
);

// ------------------------------------------------------------------------------------------------
// Summary
// ------------------------------------------------------------------------------------------------

/** The investigator as it stands, beside every step: characteristics, derived numbers, best skills. */
export const CocSummary: React.FC<{ creation: CocCreation }> = ({ creation }) => {
  const sheet = creation.preview;
  const top = [...(sheet.coc?.skills ?? [])]
    .filter((s) => s.occupation || s.value >= 40)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
  const d = creation.derived;
  return (
    <Panel ornate className="ui-scroll flex min-h-0 flex-col gap-4 overflow-y-auto px-5 py-5">
      <div>
        <div className="ui-display ui-title text-xl text-frame-bright">
          {creation.name.trim() || 'Безымянный'}
        </div>
        <div className="text-sm text-ink-muted">
          {[creation.occupationInfo?.name, creation.archetypeInfo?.name, `${creation.age} лет`]
            .filter(Boolean)
            .join(' · ')}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5 text-center">
        {CHARACTERISTICS.map((c) => (
          <div key={c.id} className="border border-line/60 py-1">
            <div className="text-[10px] text-ink-faint">{c.short}</div>
            <div className="ui-numeric text-lg">{creation.characteristics[c.id] || '—'}</div>
          </div>
        ))}
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
        {(
          [
            ['Хиты', d.maxHP || '—'],
            ['Магия', d.maxMP || '—'],
            ['Рассудок', d.startingSanity || '—'],
            ['Удача', creation.luck || '—'],
            ['Бонус урона', d.damageBonus],
            ['Комплекция', d.build],
            ['Движение', d.move],
            ['Средства', creation.creditRating],
          ] as [string, React.ReactNode][]
        ).map(([label, value]) => (
          <React.Fragment key={label}>
            <dt className="text-ink-faint">{label}</dt>
            <dd className="ui-numeric text-right">{value}</dd>
          </React.Fragment>
        ))}
      </dl>
      {top.length > 0 && (
        <div className="flex flex-col gap-0.5 text-sm">
          <span className="ui-label">Лучшие навыки</span>
          {top.map((s) => (
            <div key={s.id} className="flex justify-between gap-2">
              <span className="truncate text-ink-muted">{skillName(s.id)}</span>
              <span className="ui-numeric">{s.value}</span>
            </div>
          ))}
        </div>
      )}
      {creation.talents.length > 0 && (
        <div className="text-sm">
          <span className="ui-label">Таланты</span>
          <div className="text-ink-muted">
            {creation.talents.map((id) => TALENTS.find((t) => t.id === id)?.name ?? id).join(', ')}
          </div>
        </div>
      )}
    </Panel>
  );
};
