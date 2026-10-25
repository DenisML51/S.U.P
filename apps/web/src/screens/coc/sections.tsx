import React, { useMemo, useState } from 'react';
import {
  BOUTS_REAL_TIME,
  BOUTS_SUMMARY,
  COC_CONDITIONS,
  MANIAS,
  MYTHOS_SPELLS,
  PHOBIAS,
  SKILLS,
  WEAPONS,
  addItem,
  addMadness,
  addWeapon,
  changeMagic,
  developSkills,
  fifth,
  gainMythos,
  half,
  learnSpell,
  setCash,
  setSkill,
  skillName,
  skillValue,
  spellDef,
  startDay,
  wealthOf,
  weaponAttack,
  weaponDef,
} from '@itd/game-logic/coc';
import { maxSanityOf, rollDie } from '@itd/game-logic';
import type { Character, CocSheet } from '@itd/schema';
import { Ledger, LedgerRow, MetaLine, MetaValue } from '../../ui/Ledger';
import { Button, Input, Meter, Panel, SectionTitle, Tag } from '../../ui/primitives';
import { IconPlus } from '../../ui/icons';
import { useCoc } from './context';
import { useCocSelection } from './details';
import { CharacteristicsGrid, DerivedStrip, RollModsBar, SkillList, type RollMods } from './parts';
import { ItemDialog, PickerDialog, type PickOption } from './picker';

const NO_MODS: RollMods = { difficulty: 'regular', dice: 0 };

/** "Add" under a list: a quiet button that opens the dialog to pick from. */
const AddButton: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <Button size="sm" variant="secondary" icon={<IconPlus width={14} height={14} />} onClick={onClick}>
    {label}
  </Button>
);

// ------------------------------------------------------------------------------------------------
// Investigator: characteristics and skills
// ------------------------------------------------------------------------------------------------

/** Every skill and speciality not on the sheet yet, grouped by family, for the add dialog. */
const missingSkillOptions = (have: Set<string>): PickOption[] =>
  SKILLS.flatMap((skill): PickOption[] =>
    skill.specialities
      ? skill.specialities.map((s) => ({
          id: `${skill.id}:${s.id}`,
          name: s.name,
          group: skill.name,
          hint: `база ${s.base ?? (typeof skill.base === 'number' ? skill.base : '—')}`,
          description: skill.description,
        }))
      : [
          {
            id: skill.id,
            name: skill.name,
            group: skill.uncommon ? 'Редкие навыки' : 'Навыки',
            hint: typeof skill.base === 'number' ? `база ${skill.base}` : undefined,
            description: skill.description,
          },
        ],
  ).filter((o) => !have.has(o.id));

export const InvestigatorSection: React.FC = () => {
  const { character, update } = useCoc();
  const [mods, setMods] = useState<RollMods>(NO_MODS);
  const [filter, setFilter] = useState('');
  const [adding, setAdding] = useState(false);
  const ticked = character.coc?.skills.filter((s) => s.check).length ?? 0;
  const options = useMemo(
    () => missingSkillOptions(new Set(character.coc?.skills.map((s) => s.id))),
    [character.coc?.skills],
  );
  const develop = () =>
    update((doc) => developSkills(doc).character, {
      message: `Фаза развития: проверено навыков — ${ticked}`,
      type: 'other',
    });

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
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Найти навык"
              className="!h-8 w-44 text-sm"
            />
            <Button
              size="sm"
              variant="secondary"
              disabled={ticked === 0}
              onClick={develop}
              title="Каждый отмеченный навык бросает d100: выше значения — +1d10"
            >
              Развитие ({ticked})
            </Button>
          </>
        }
      >
        <li className="list-none pb-3 pt-1">
          <RollModsBar value={mods} onChange={setMods} />
        </li>
        <li className="list-none pb-4">
          <SkillList mods={mods} filter={filter} wide />
        </li>
      </Ledger>
      <div>
        <AddButton label="Добавить навык" onClick={() => setAdding(true)} />
      </div>
      <PickerDialog
        open={adding}
        onClose={() => setAdding(false)}
        title="Новый навык"
        subtitle="Редкий навык или специализация, которой ещё нет в листе"
        options={options}
        confirmLabel="Добавить"
        onPick={(id) =>
          update(setSkill(id, skillValue(character, id)), {
            message: `Новый навык: ${skillName(id)}`,
            type: 'other',
          })
        }
      />
    </div>
  );
};

// ------------------------------------------------------------------------------------------------
// Weapons
// ------------------------------------------------------------------------------------------------

const WEAPON_OPTIONS: PickOption[] = WEAPONS.map((w) => ({
  id: w.id,
  name: w.name,
  group: skillName(w.skill),
  hint: [w.damage, w.range].filter(Boolean).join(' · '),
  description: [
    w.description,
    w.ammo !== undefined && `Патронов: ${w.ammo}.`,
    w.malfunction && `Осечка на ${w.malfunction}+.`,
    w.impale && 'Пронзающее.',
    w.price &&
      `Цена: ${[
        w.price['1920s'] && `$${w.price['1920s']} (1920-е)`,
        w.price.modern && `$${w.price.modern} (сейчас)`,
      ]
        .filter(Boolean)
        .join(', ')}.`,
  ]
    .filter(Boolean)
    .join(' '),
}));

/** Weapons: the row opens the weapon's card, which attacks; the result comes as the roll's toast. */
export const WeaponsSection: React.FC = () => {
  const { character, update } = useCoc();
  const { open, isOpen } = useCocSelection();
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <Ledger title="Оружие" scroll={false}>
        {character.attacks.map((a) => {
          const value = a.skill ? skillValue(character, a.skill) : 0;
          const empty = a.ammo !== undefined && a.ammo <= 0;
          return (
            <LedgerRow
              key={a.id}
              title={a.name}
              onOpen={() => open('weapon', a.id)}
              selected={isOpen('weapon', a.id)}
              dim={empty}
              meta={
                <MetaLine
                  parts={[
                    a.skill && `${skillName(a.skill)} ${value} · ${half(value)} · ${fifth(value)}`,
                    <>
                      урон <MetaValue>{a.damage}</MetaValue>
                    </>,
                    a.range,
                    a.malfunction && `осечка ${a.malfunction}`,
                  ]}
                />
              }
              value={a.ammo !== undefined ? `${a.ammo} / ${a.magazine}` : undefined}
            />
          );
        })}
      </Ledger>
      <div>
        <AddButton label="Взять оружие" onClick={() => setAdding(true)} />
      </div>
      <PickerDialog
        open={adding}
        onClose={() => setAdding(false)}
        title="Оружие"
        subtitle="Из таблицы оружия 7-й редакции"
        options={WEAPON_OPTIONS.filter((o) => !character.attacks.some((a) => a.id === `coc-${o.id}`))}
        confirmLabel="Взять"
        onPick={(id) => {
          const weapon = weaponDef(id);
          if (weapon)
            update(addWeapon(weaponAttack(weapon)), {
              message: `Взято оружие: ${weapon.name}`,
              type: 'inventory',
            });
        }}
      />
    </div>
  );
};

// ------------------------------------------------------------------------------------------------
// Sanity
// ------------------------------------------------------------------------------------------------

const pick = <T,>(list: T[]) => list[rollDie(list.length) - 1];

export const SanitySection: React.FC = () => {
  const { character, update, sanityRoll, roll } = useCoc();
  const { open, isOpen } = useCocSelection();
  const coc = character.coc as CocSheet;
  const [spec, setSpec] = useState('0/1d6');
  const [source, setSource] = useState('');
  const [bout, setBout] = useState<string | null>(null);
  const max = maxSanityOf(character);
  const mythos = skillValue(character, 'cthulhu-mythos');
  const insanity = COC_CONDITIONS.filter((c) => c.id.includes('insanity'));
  const insane = character.conditions.some((id) => id.includes('insanity'));

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
            <span>
              Бессрочное при потере ≥{' '}
              {Math.max(1, Math.floor((coc.sanityAtDayStart ?? character.sanity) / 5))} за день
            </span>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Что увидел"
              className="!h-9 flex-1"
            />
            <Input
              value={spec}
              onChange={(e) => setSpec(e.target.value)}
              placeholder="0/1d6"
              className="!h-9 w-24 text-center"
              aria-label="Цена: успех/провал"
            />
            <Button variant="primary" onClick={() => sanityRoll(source.trim() || 'Проверка рассудка', spec)}>
              Проверка рассудка
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => update(startDay, { message: 'Начался новый день', type: 'sanity' })}
            >
              Новый день
            </Button>
            <Button
              size="sm"
              onClick={() =>
                roll({ label: 'Мифы Ктулху', value: mythos, kind: 'skill', id: 'cthulhu-mythos' })
              }
            >
              Бросок Мифов ({mythos})
            </Button>
            <Button
              size="sm"
              onClick={() => update(gainMythos(1), { message: 'Мифы Ктулху +1', type: 'sanity' })}
              title="Предел рассудка снижается вместе с ростом Мифов"
            >
              Мифы +1
            </Button>
          </div>
        </Panel>

        <Panel ornate={false} className="flex flex-col gap-3 px-6 py-5">
          <SectionTitle>Безумие</SectionTitle>
          {insanity.map((c) => {
            const on = character.conditions.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                disabled={!on}
                onClick={() => open('condition', c.id)}
                className="flex items-start gap-3 text-left"
              >
                <Tag tone={on ? 'danger' : 'line'}>{on ? 'есть' : 'нет'}</Tag>
                <span className="min-w-0 flex-1">
                  <span className={on ? 'block text-ink' : 'block text-ink-muted'}>{c.name}</span>
                  <span className="block text-xs text-ink-faint">{c.description}</span>
                </span>
              </button>
            );
          })}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" onClick={() => rollBout(false)} disabled={!insane}>
              Приступ (в моменте)
            </Button>
            <Button size="sm" onClick={() => rollBout(true)} disabled={!insane}>
              Приступ (вкратце)
            </Button>
          </div>
          {bout && <p className="text-sm text-warning">{bout}</p>}
        </Panel>
      </div>

      <div className="flex flex-col gap-5">
        <Ledger title="Фобии и мании" scroll={false}>
          {coc.madness.length === 0 && (
            <li className="list-none py-3 text-sm opacity-70">Пока рассудок держится.</li>
          )}
          {coc.madness.map((m) => (
            <LedgerRow
              key={m.id}
              title={m.name}
              onOpen={() => open('madness', m.id)}
              selected={isOpen('madness', m.id)}
              meta={<MetaLine parts={[m.kind === 'phobia' ? 'Фобия' : 'Мания', m.description]} />}
            />
          ))}
        </Ledger>
        <MagicPanel />
      </div>
    </div>
  );
};

const SPELL_OPTIONS: PickOption[] = MYTHOS_SPELLS.map((s) => ({
  id: s.id,
  name: s.name,
  hint: s.cost,
  description: [
    s.description,
    `Время: ${s.castingTime}.`,
    s.aliases?.length && `Также: ${s.aliases.join(', ')}.`,
  ]
    .filter(Boolean)
    .join(' '),
}));

/** Magic points and the spells of the Mythos the investigator has learned; a spell's card casts it. */
const MagicPanel: React.FC = () => {
  const { character, update } = useCoc();
  const { open, isOpen } = useCocSelection();
  const coc = character.coc as CocSheet;
  const maxMP = Math.floor((coc.characteristics.pow ?? 0) / 5);
  const [learning, setLearning] = useState(false);
  const known = new Set(coc.spells.map((s) => s.ref));
  return (
    <div className="flex flex-col gap-3">
      <Ledger
        title="Заклинания"
        scroll={false}
        aside={
          <span className="flex items-center gap-2">
            ПМ <b className="tabular-nums">{coc.magicPoints}</b> / {maxMP}
            <Button size="row" variant="ghost" onClick={() => update(changeMagic(-1))}>
              −1
            </Button>
            <Button
              size="row"
              variant="ghost"
              onClick={() => update(changeMagic(1))}
              title="Магия восстанавливается по 1 ПМ в час"
            >
              +1
            </Button>
          </span>
        }
      >
        {coc.spells.length === 0 && (
          <li className="list-none py-3 text-sm opacity-70">
            Ни одного заклинания — и, возможно, к лучшему.
          </li>
        )}
        {coc.spells.map((s) => (
          <LedgerRow
            key={s.id}
            title={s.name}
            onOpen={() => open('spell', s.id)}
            selected={isOpen('spell', s.id)}
            meta={<MetaLine parts={[s.cost, s.castingTime]} />}
          />
        ))}
      </Ledger>
      <div>
        <AddButton label="Выучить заклинание" onClick={() => setLearning(true)} />
      </div>
      <PickerDialog
        open={learning}
        onClose={() => setLearning(false)}
        title="Гримуар"
        subtitle="Заклинания Мифов, доступные сыщикам"
        options={SPELL_OPTIONS.filter((o) => !known.has(o.id))}
        confirmLabel="Выучить"
        onPick={(id) => {
          const spell = spellDef(id);
          if (spell)
            update(learnSpell(spell), { message: `Выучено заклинание «${spell.name}»`, type: 'other' });
        }}
      />
    </div>
  );
};

// ------------------------------------------------------------------------------------------------
// Gear and money
// ------------------------------------------------------------------------------------------------

export const GearSection: React.FC = () => {
  const { character, update } = useCoc();
  const { open, isOpen } = useCocSelection();
  const coc = character.coc as CocSheet;
  const era = character.build?.ruleset === 'coc7' ? character.build.era : '1920s';
  const credit = skillValue(character, 'credit-rating');
  const wealth = wealthOf(credit, era);
  const [adding, setAdding] = useState(false);
  const [cash, setCashText] = useState<string | null>(null);
  return (
    <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-start gap-6">
      <div className="flex flex-col gap-3">
        <Ledger title="Снаряжение и вещи" scroll={false}>
          {character.inventory.length === 0 && (
            <li className="list-none py-3 text-sm opacity-70">Карманы пусты.</li>
          )}
          {character.inventory.map((item) => (
            <LedgerRow
              key={item.id}
              title={item.name}
              meta={item.description}
              value={item.quantity}
              onOpen={() => open('item', item.id)}
              selected={isOpen('item', item.id)}
            />
          ))}
        </Ledger>
        <div>
          <AddButton label="Добавить вещь" onClick={() => setAdding(true)} />
        </div>
        <ItemDialog
          open={adding}
          onClose={() => setAdding(false)}
          onAdd={(item) =>
            update(addItem(item.name, item.quantity, item.description), {
              message: `Взято: ${item.name}`,
              type: 'inventory',
            })
          }
        />
      </div>
      <Panel ornate={false} className="flex flex-col gap-3 px-6 py-5">
        <SectionTitle>Деньги</SectionTitle>
        <div className="grid grid-cols-2 items-center gap-y-2 text-sm">
          <span className="text-ink-muted">Средства</span>
          <span className="text-right">
            {credit} · {wealth.label}
          </span>
          <span className="text-ink-muted">Расходы в день</span>
          <span className="text-right">${wealth.spendingLevel.toLocaleString('ru-RU')}</span>
          <span className="text-ink-muted">Наличные, $</span>
          <Input
            className="!h-8 text-right"
            inputMode="decimal"
            value={cash ?? String(coc.cash)}
            onChange={(e) => setCashText(e.target.value)}
            onBlur={() => {
              const value = Number((cash ?? '').replace(',', '.'));
              if (cash !== null && Number.isFinite(value) && value !== coc.cash)
                update(setCash(value), { message: `Наличные: $${coc.cash} → $${value}`, type: 'inventory' });
              setCashText(null);
            }}
          />
          <span className="text-ink-muted">Имущество</span>
          <span className="text-right">{coc.assets || '—'}</span>
        </div>
      </Panel>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------
// Backstory and talents
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

/** Talents of a Pulp hero and the player's own traits; each opens its card. */
const Talents: React.FC = () => {
  const { character } = useCoc();
  const { open, isOpen } = useCocSelection();
  if (character.traits.length === 0) return null;
  return (
    <Ledger title="Таланты и особенности" scroll={false}>
      {character.traits.map((t) => (
        <LedgerRow
          key={t.id}
          title={t.name}
          meta={t.grant?.startsWith('talent:') ? 'Талант Pulp' : 'Своя особенность'}
          onOpen={() => open('talent', t.id)}
          selected={isOpen('talent', t.id)}
        />
      ))}
    </Ledger>
  );
};

/** The backstory in the order of the paper sheet; each block is written in place. */
export const StorySection: React.FC = () => {
  const { character, update } = useCoc();
  const story = (character.coc as CocSheet).backstory;
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-6">
      <Talents />
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
                        update((doc) =>
                          doc.coc
                            ? {
                                ...doc,
                                coc: { ...doc.coc, backstory: { ...doc.coc.backstory, [field]: value } },
                              }
                            : doc,
                        );
                      setEditing(null);
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditing(field)}
                    className="block w-full whitespace-pre-wrap text-left text-[15px] leading-relaxed"
                  >
                    {story[field] || <span className="opacity-50">Нажмите, чтобы записать</span>}
                  </button>
                )}
              </div>
            ))}
          </Panel>
        ))}
      </div>
    </div>
  );
};
