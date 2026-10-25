import React, { useState } from 'react';
import {
  BOUTS_REAL_TIME,
  BOUTS_SUMMARY,
  COC_CONDITIONS,
  MANIAS,
  PHOBIAS,
  addMadness,
  changeMagic,
  developSkills,
  fifth,
  fireWeapon,
  gainMythos,
  half,
  malfunctions,
  recoverFrom,
  reloadWeapon,
  removeMadness,
  setSkill,
  skillName,
  skillValue,
  startDay,
  wealthOf,
  weaponDamage,
} from '@itd/game-logic/coc';
import { maxSanityOf, rollDie } from '@itd/game-logic';
import type { Character, CocSheet } from '@itd/schema';
import { Ledger, LedgerRow, MetaLine, MetaValue } from '../../ui/Ledger';
import { Button, Input, Meter, Panel, SectionTitle, Tag } from '../../ui/primitives';
import { Select } from '../../ui/forms';
import { useCoc, type RollRecord } from './context';
import { CharacteristicsGrid, DerivedStrip, RollModsBar, SkillList, missingSkills, modsToRoll, type RollMods } from './parts';

const NO_MODS: RollMods = { difficulty: 'regular', dice: 0 };

// ------------------------------------------------------------------------------------------------
// Investigator: characteristics and skills
// ------------------------------------------------------------------------------------------------

export const InvestigatorSection: React.FC = () => {
  const { character, update } = useCoc();
  const [mods, setMods] = useState<RollMods>(NO_MODS);
  const [filter, setFilter] = useState('');
  const [adding, setAdding] = useState('');
  const ticked = character.coc?.skills.filter((s) => s.check).length ?? 0;
  const have = new Set(character.coc?.skills.map((s) => s.id));
  const develop = () =>
    update(
      (doc) => developSkills(doc).character,
      { message: `Фаза развития: проверено навыков — ${ticked}`, type: 'other' },
    );

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <SectionTitle>Характеристики</SectionTitle>
        <CharacteristicsGrid mods={mods} />
        <DerivedStrip />
      </section>
      <Ledger
        title="Навыки"
        scroll={false}
        aside={
          <>
            <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Найти навык" className="!h-8 w-44 text-sm" />
            <Button size="sm" variant="secondary" disabled={ticked === 0} onClick={develop} title="Каждый отмеченный навык бросает d100: выше значения — +1d10">
              Развитие ({ticked})
            </Button>
          </>
        }
      >
        <li className="list-none pb-3 pt-1">
          <RollModsBar value={mods} onChange={setMods} />
        </li>
        <li className="list-none pb-2">
          <SkillList mods={mods} filter={filter} wide />
        </li>
        <li className="flex list-none items-center gap-2 pb-4 pt-2">
          <Select
            value={adding}
            onChange={setAdding}
            placeholder="Добавить навык или специализацию…"
            options={missingSkills(have).map((s) => ({ value: s.id, label: s.name }))}
            className="w-80"
          />
          <Button
            size="sm"
            disabled={!adding}
            onClick={() => {
              const value = skillValue(character, adding);
              update(setSkill(adding, value), { message: `Новый навык: ${skillName(adding)}`, type: 'other' });
              setAdding('');
            }}
          >
            Добавить
          </Button>
        </li>
      </Ledger>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------
// Weapons
// ------------------------------------------------------------------------------------------------

/** Weapons and the attack roll: the skill, rounds and the jam; a hit offers its damage. */
export const WeaponsSection: React.FC = () => {
  const { character, update, roll, damageBonus, last } = useCoc();
  const [mods, setMods] = useState<RollMods>(NO_MODS);
  const [damage, setDamage] = useState<{ serial: number; text: string } | null>(null);

  const attack = (id: string) => {
    const weapon = character.attacks.find((a) => a.id === id);
    if (!weapon) return;
    const value = weapon.skill ? skillValue(character, weapon.skill) : 0;
    const record = roll({ label: weapon.name, value, kind: 'skill', id: weapon.skill, ...modsToRoll(mods) });
    if (weapon.ammo !== undefined) update(fireWeapon(weapon.id));
    if (malfunctions(record.check.total, weapon.malfunction))
      update((doc) => doc, { message: `${weapon.name}: осечка (${record.check.total} ≥ ${weapon.malfunction})`, type: 'other' });
  };

  const rollDamage = (record: RollRecord) => {
    const weapon = character.attacks.find((a) => a.skill === record.id && a.name === record.label);
    if (!weapon) return;
    const result = weaponDamage(weapon, damageBonus, record.check.level);
    setDamage({ serial: record.serial, text: `${result.total} (${result.formula})` });
    update((doc) => doc, { message: `${weapon.name}: урон ${result.total}`, type: 'other' });
  };

  const hit = last && last.check.success && character.attacks.some((a) => a.name === last.label);

  return (
    <div className="flex flex-col gap-4">
      <RollModsBar value={mods} onChange={setMods} />
      <Ledger title="Оружие" scroll={false}>
        {character.attacks.map((a) => {
          const value = a.skill ? skillValue(character, a.skill) : 0;
          const empty = a.ammo !== undefined && a.ammo <= 0;
          return (
            <LedgerRow
              key={a.id}
              title={a.name}
              onOpen={empty ? undefined : () => attack(a.id)}
              dim={empty}
              meta={
                <MetaLine
                  parts={[
                    a.skill && `${skillName(a.skill)} ${value} · ${half(value)} · ${fifth(value)}`,
                    <>
                      урон <MetaValue>{a.damage}</MetaValue>
                    </>,
                    a.range,
                    a.uses && `атак: ${a.uses}`,
                    a.malfunction && `осечка ${a.malfunction}`,
                  ]}
                />
              }
              value={a.ammo !== undefined ? `${a.ammo} / ${a.magazine}` : undefined}
              action={
                a.magazine !== undefined && (
                  <Button size="row" variant="ghost" onClick={() => update(reloadWeapon(a.id), { message: `${a.name}: перезаряжено`, type: 'inventory' })}>
                    Перезарядить
                  </Button>
                )
              }
            />
          );
        })}
      </Ledger>
      {hit && last && (
        <Panel ornate={false} className="flex items-center gap-4 px-5 py-3">
          <span className="text-sm text-ink-muted">
            {last.label}: попадание ({last.check.level === 'extreme' || last.check.level === 'critical' ? 'экстремальное' : 'обычное'})
          </span>
          {damage?.serial === last.serial ? (
            <span className="ui-display ui-numeric ml-auto text-2xl">{damage.text}</span>
          ) : (
            <Button size="sm" variant="primary" className="ml-auto" onClick={() => rollDamage(last)}>
              Бросить урон
            </Button>
          )}
        </Panel>
      )}
    </div>
  );
};

// ------------------------------------------------------------------------------------------------
// Sanity
// ------------------------------------------------------------------------------------------------

const pick = <T,>(list: T[]) => list[rollDie(list.length) - 1];

export const SanitySection: React.FC = () => {
  const { character, update, sanityRoll, roll } = useCoc();
  const coc = character.coc as CocSheet;
  const [spec, setSpec] = useState('0/1d6');
  const [source, setSource] = useState('');
  const [bout, setBout] = useState<string | null>(null);
  const max = maxSanityOf(character);
  const mythos = skillValue(character, 'cthulhu-mythos');
  const insanity = COC_CONDITIONS.filter((c) => c.id.includes('insanity'));

  const rollBout = (summary: boolean) => {
    const entry = pick(summary ? BOUTS_SUMMARY : BOUTS_REAL_TIME);
    let text = `${entry.name}: ${entry.description}`;
    let edit = (doc: Character) => doc;
    if (entry.id.includes('phobia')) {
      const phobia = pick(PHOBIAS);
      text += ` — ${phobia.name}`;
      edit = addMadness({ name: phobia.name, kind: 'phobia', description: phobia.description });
    } else if (entry.id.includes('mania')) {
      const mania = pick(MANIAS);
      text += ` — ${mania.name}`;
      edit = addMadness({ name: mania.name, kind: 'mania', description: mania.description });
    }
    setBout(text);
    update(edit, { message: `Приступ безумия: ${text}`, type: 'sanity' });
  };

  return (
    <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-6">
      <div className="flex flex-col gap-5">
        <Panel crest className="flex flex-col gap-4 px-6 py-5">
          <div className="flex items-baseline gap-3">
            <SectionTitle className="flex-1">Рассудок</SectionTitle>
            <span className="ui-display ui-numeric text-4xl">{character.sanity}</span>
            <span className="text-ink-faint">/ {max}</span>
          </div>
          <Meter value={character.sanity} max={99} tone="sanity" height={10} ticks label="Рассудок" />
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink-muted">
            <span>Начальный: {coc.startingSanity ?? '—'}</span>
            <span>В начале дня: {coc.sanityAtDayStart ?? character.sanity}</span>
            <span>Бессрочное при потере ≥ {Math.max(1, Math.floor((coc.sanityAtDayStart ?? character.sanity) / 5))} за день</span>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Что увидел" className="!h-9 flex-1" />
            <Input value={spec} onChange={(e) => setSpec(e.target.value)} placeholder="0/1d6" className="!h-9 w-24 text-center" aria-label="Цена: успех/провал" />
            <Button variant="primary" onClick={() => sanityRoll(source.trim() || 'Проверка рассудка', spec)}>
              Проверка рассудка
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => update(startDay, { message: 'Начался новый день', type: 'sanity' })}>
              Новый день
            </Button>
            <Button size="sm" onClick={() => roll({ label: 'Мифы Ктулху', value: mythos, kind: 'skill', id: 'cthulhu-mythos' })}>
              Бросок Мифов ({mythos})
            </Button>
            <Button size="sm" onClick={() => update(gainMythos(1), { message: 'Мифы Ктулху +1', type: 'sanity' })} title="Предел рассудка снижается вместе с ростом Мифов">
              Мифы +1
            </Button>
          </div>
        </Panel>

        <Panel ornate={false} className="flex flex-col gap-3 px-6 py-5">
          <SectionTitle>Безумие</SectionTitle>
          {insanity.map((c) => {
            const on = character.conditions.includes(c.id);
            return (
              <div key={c.id} className="flex items-start gap-3">
                <Tag tone={on ? 'danger' : 'line'}>{on ? 'есть' : 'нет'}</Tag>
                <div className="min-w-0 flex-1">
                  <div className={on ? 'text-ink' : 'text-ink-muted'}>{c.name}</div>
                  <div className="text-xs text-ink-faint">{c.description}</div>
                </div>
                {on && (
                  <Button size="row" variant="ghost" onClick={() => update(recoverFrom(c.id), { message: `Прошло: ${c.name}`, type: 'sanity' })}>
                    Прошло
                  </Button>
                )}
              </div>
            );
          })}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" onClick={() => rollBout(false)} disabled={!character.conditions.some((id) => id.includes('insanity'))}>
              Приступ (в моменте)
            </Button>
            <Button size="sm" onClick={() => rollBout(true)} disabled={!character.conditions.some((id) => id.includes('insanity'))}>
              Приступ (вкратце)
            </Button>
          </div>
          {bout && <p className="text-sm text-warning">{bout}</p>}
        </Panel>
      </div>

      <div className="flex flex-col gap-5">
        <Ledger title="Фобии и мании" scroll={false}>
          {coc.madness.length === 0 && <li className="list-none py-3 text-sm opacity-70">Пока рассудок держится.</li>}
          {coc.madness.map((m) => (
            <LedgerRow
              key={m.id}
              title={m.name}
              meta={<MetaLine parts={[m.kind === 'phobia' ? 'Фобия' : 'Мания', m.description]} />}
              action={
                <Button size="row" variant="ghost" onClick={() => update(removeMadness(m.id), { message: `Излечено: ${m.name}`, type: 'sanity' })}>
                  Излечено
                </Button>
              }
            />
          ))}
        </Ledger>
        <MagicPanel />
      </div>
    </div>
  );
};

/** Magic points and the spells of the Mythos the investigator has learned. */
const MagicPanel: React.FC = () => {
  const { character, update } = useCoc();
  const coc = character.coc as CocSheet;
  const maxMP = Math.floor((coc.characteristics.pow ?? 0) / 5);
  return (
    <Ledger
      title="Заклинания"
      scroll={false}
      aside={
        <span className="flex items-center gap-2">
          ПМ <b className="tabular-nums">{coc.magicPoints}</b> / {maxMP}
          <Button size="row" variant="ghost" onClick={() => update(changeMagic(-1))}>
            −1
          </Button>
          <Button size="row" variant="ghost" onClick={() => update(changeMagic(1))}>
            +1
          </Button>
        </span>
      }
    >
      {coc.spells.length === 0 && <li className="list-none py-3 text-sm opacity-70">Ни одного заклинания — и, возможно, к лучшему.</li>}
      {coc.spells.map((s) => (
        <LedgerRow key={s.id} title={s.name} meta={<MetaLine parts={[s.cost, s.castingTime]} />} />
      ))}
    </Ledger>
  );
};

// ------------------------------------------------------------------------------------------------
// Gear and money
// ------------------------------------------------------------------------------------------------

export const GearSection: React.FC = () => {
  const { character } = useCoc();
  const coc = character.coc as CocSheet;
  const era = character.build?.ruleset === 'coc7' ? character.build.era : '1920s';
  const credit = skillValue(character, 'credit-rating');
  const wealth = wealthOf(credit, era);
  return (
    <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-6">
      <Ledger title="Снаряжение и вещи" scroll={false}>
        {character.inventory.length === 0 && <li className="list-none py-3 text-sm opacity-70">Карманы пусты.</li>}
        {character.inventory.map((item) => (
          <LedgerRow key={item.id} title={item.name} meta={item.description} value={item.quantity} />
        ))}
      </Ledger>
      <Panel ornate={false} className="flex flex-col gap-3 px-6 py-5">
        <SectionTitle>Деньги</SectionTitle>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <span className="text-ink-muted">Средства</span>
          <span className="text-right">
            {credit} · {wealth.label}
          </span>
          <span className="text-ink-muted">Расходы в день</span>
          <span className="text-right">${wealth.spendingLevel.toLocaleString('ru-RU')}</span>
          <span className="text-ink-muted">Наличные</span>
          <span className="text-right">${coc.cash.toLocaleString('ru-RU')}</span>
          <span className="text-ink-muted">Имущество</span>
          <span className="text-right">{coc.assets || '—'}</span>
        </div>
      </Panel>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------
// Backstory
// ------------------------------------------------------------------------------------------------

const STORY_FIELDS: { field: keyof CocSheet['backstory']; title: string }[] = [
  { field: 'personalDescription', title: 'Внешность' },
  { field: 'ideology', title: 'Убеждения' },
  { field: 'significantPeople', title: 'Значимые люди' },
  { field: 'meaningfulLocations', title: 'Важные места' },
  { field: 'treasuredPossessions', title: 'Ценные вещи' },
  { field: 'traits', title: 'Черты' },
  { field: 'injuries', title: 'Травмы и шрамы' },
  { field: 'arcaneTomes', title: 'Тайные книги, заклинания и артефакты' },
  { field: 'encounters', title: 'Встречи с неведомым' },
];

/** The backstory in the order of the paper sheet; each block is written in place. */
export const StorySection: React.FC = () => {
  const { character, update } = useCoc();
  const story = (character.coc as CocSheet).backstory;
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <div className="grid grid-cols-2 items-start gap-6">
      {[STORY_FIELDS.slice(0, 5), STORY_FIELDS.slice(5)].map((column, i) => (
        <Panel key={i} variant="paper" ornate={false} className="flex flex-col gap-5 px-7 py-6">
          {column.map(({ field, title }) => (
            <div key={field}>
              <div className="ui-display mb-1 text-lg">{title}</div>
              {editing === field ? (
                <textarea
                  autoFocus
                  defaultValue={story[field]}
                  className="ui-input min-h-24 w-full resize-y bg-transparent text-paper-ink"
                  onBlur={(e) => {
                    const value = e.currentTarget.value;
                    if (value !== story[field])
                      update((doc) => (doc.coc ? { ...doc, coc: { ...doc.coc, backstory: { ...doc.coc.backstory, [field]: value } } } : doc));
                    setEditing(null);
                  }}
                />
              ) : (
                <button type="button" onClick={() => setEditing(field)} className="block w-full whitespace-pre-wrap text-left text-[15px] leading-relaxed">
                  {story[field] || <span className="opacity-50">Нажмите, чтобы записать</span>}
                </button>
              )}
            </div>
          ))}
        </Panel>
      ))}
    </div>
  );
};

