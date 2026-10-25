import React, { useMemo, useRef, useState } from 'react';
import {
  COC_CONDITIONS,
  CONDITION_IDS,
  MYTHOS_SPELLS,
  SKILLS,
  WEAPONS,
  addItem,
  addWeapon,
  applyDevelopment,
  changeMagic,
  displaySkillName,
  fifth,
  gainMythos,
  gainSanity,
  half,
  learnSpell,
  recoverLuck,
  rollDevelopment,
  rollLuckRecovery,
  setCash,
  setSkill,
  skillDef,
  skillName,
  skillValue,
  spellDef,
  startDay,
  wealthOf,
  weaponAttack,
  weaponDef,
  type DevelopmentRoll,
} from '@itd/game-logic/coc';
import { createEntityId, maxSanityOf } from '@itd/game-logic';
import type { Character, CocSheet } from '@itd/schema';
import { toast } from 'react-hot-toast';
import { Dialog } from '../../ui/Dialog';
import { NumberField } from '../../ui/forms';
import { Ledger, LedgerRow, MetaLine, MetaValue } from '../../ui/Ledger';
import { Button, Input, Meter, Panel, SectionTitle, Tag } from '../../ui/primitives';
import { IconPlus } from '../../ui/icons';
import { SectionNotes } from '../sheet/parts/EditableText';
import { useCoc } from './context';
import { useCocSelection } from './details';
import { CharacteristicsGrid, DerivedStrip, ModsNote, RollModsBar, SkillList } from './parts';
import { ItemDialog, PickerDialog, type PickOption } from './picker';
import { addCondition, isSanitySpec, parseCashInput, setAssets } from './sheetRules';

/** "Add" under a list: a quiet button that opens the dialog to pick from. */
const AddButton: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <Button size="sm" variant="secondary" icon={<IconPlus width={14} height={14} />} onClick={onClick}>
    {label}
  </Button>
);

/** One of the sheet's own texts (`attacksNotes`, `inventoryNotes`…), saved as typed. */
const saveNotes =
  (field: 'attacksNotes' | 'inventoryNotes' | 'spellsNotes' | 'abilitiesNotes') =>
  (value: string) =>
  (doc: Character): Character => ({ ...doc, [field]: value });

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

interface DevelopmentResult {
  rolls: (DevelopmentRoll & { name: string; before: number })[];
  luck?: { roll: number; gain: number; before: number };
}

/**
 * The development phase between scenarios: asks first (it clears every tick), then rolls each ticked
 * skill — and Luck, by the optional rule — outside the edit, writes the rolls down and shows them.
 */
const DevelopmentPhase: React.FC = () => {
  const { character, update } = useCoc();
  const [asking, setAsking] = useState(false);
  const [withLuck, setWithLuck] = useState(false);
  const [result, setResult] = useState<DevelopmentResult | null>(null);
  const skills = character.coc?.skills ?? [];
  const ticked = skills.filter((s) => s.check && !skillDef(s.id)?.skill.noImprovement).length;

  const develop = () => {
    setAsking(false);
    // The dice are thrown here, once; the edit (run twice by the store) only writes them down.
    const rolls = rollDevelopment(character);
    const luck = withLuck ? rollLuckRecovery(character) : undefined;
    const named = rolls.map((r) => {
      const skill = skills.find((s) => s.id === r.id);
      return { ...r, name: skill ? displaySkillName(skill) : skillName(r.id), before: skill?.value ?? 0 };
    });
    const grown = named.filter((r) => r.gain > 0);
    const sanity = rolls.reduce((total, r) => total + r.sanityGain, 0);
    const parts = [
      rolls.length > 0 &&
        (grown.length > 0
          ? `выросли ${grown.map((r) => `${r.name} +${r.gain}`).join(', ')}`
          : `ни один из ${rolls.length} навыков не вырос`),
      sanity > 0 && `рассудок +${sanity}`,
      luck && (luck.gain > 0 ? `удача +${luck.gain}` : 'удача не восстановилась'),
    ].filter(Boolean);
    update(
      (doc) => {
        const developed = applyDevelopment(rolls)(doc);
        return luck && luck.gain > 0 ? recoverLuck(luck.gain)(developed) : developed;
      },
      { message: `Фаза развития: ${parts.join('; ')}`, type: 'other' },
      { quiet: true },
    );
    setResult({ rolls: named, luck: luck && { roll: luck.roll, gain: luck.gain, before: character.coc?.luck ?? 0 } });
  };

  const sanityGain = result?.rolls.reduce((total, r) => total + r.sanityGain, 0) ?? 0;
  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => setAsking(true)}
        title="Каждый отмеченный навык бросает d100: выше значения (или 96+) — +1d10"
      >
        Развитие ({ticked})
      </Button>
      <Dialog
        open={asking}
        onClose={() => setAsking(false)}
        title="Фаза развития"
        width="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAsking(false)}>
              Отмена
            </Button>
            <Button variant="primary" disabled={ticked === 0 && !withLuck} onClick={develop}>
              Бросить
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3 text-[15px] leading-relaxed text-ink-muted">
          <p>
            {ticked > 0
              ? `Проверить ${ticked} отмеченных навыков? Каждый бросает d100: выше значения или 96+ — навык растёт на 1d10. Все отметки снимутся.`
              : 'Отмеченных навыков нет: развивать нечего.'}
          </p>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={withLuck}
              onChange={(e) => setWithLuck(e.target.checked)}
            />
            <span>
              Восстановление удачи (необязательное правило): d100 выше текущей удачи — +1d10
              {character.build?.ruleset === 'coc7' && character.build.variant === 'pulp'
                ? ', не выше начальной.'
                : '.'}
            </span>
          </label>
        </div>
      </Dialog>
      <Dialog
        open={result !== null}
        onClose={() => setResult(null)}
        title="Итоги развития"
        width="sm"
        footer={
          <Button variant="primary" onClick={() => setResult(null)}>
            Готово
          </Button>
        }
      >
        {result && (
          <div className="flex flex-col gap-3 text-sm">
            {result.rolls.length > 0 && (
              <table className="w-full">
                <thead className="text-xs text-ink-faint">
                  <tr>
                    <th className="py-1 text-left font-normal">Навык</th>
                    <th className="py-1 text-right font-normal">Бросок</th>
                    <th className="py-1 text-right font-normal">Рост</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rolls.map((r) => (
                    <tr key={r.id} className="border-t border-line/50">
                      <td className="py-1.5">{r.name}</td>
                      <td className="py-1.5 text-right tabular-nums">
                        {r.roll} / {r.before}
                      </td>
                      <td
                        className={r.gain > 0 ? 'py-1.5 text-right tabular-nums text-success' : 'py-1.5 text-right text-ink-faint'}
                      >
                        {r.gain > 0 ? `+${r.gain} → ${r.before + r.gain}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {sanityGain > 0 && (
              <p className="text-success">
                Навык достиг 90: рассудок +{sanityGain} (не выше предела 99 − Мифы).
              </p>
            )}
            {result.luck && (
              <p>
                Удача: бросок {result.luck.roll} против {result.luck.before} —{' '}
                {result.luck.gain > 0 ? (
                  <span className="text-success">+{result.luck.gain}</span>
                ) : (
                  'без изменений'
                )}
              </p>
            )}
          </div>
        )}
      </Dialog>
    </>
  );
};

export const InvestigatorSection: React.FC = () => {
  const { character, update, mods, setMods } = useCoc();
  const [filter, setFilter] = useState('');
  const [adding, setAdding] = useState(false);
  const options = useMemo(
    () => missingSkillOptions(new Set(character.coc?.skills.map((s) => s.id))),
    [character.coc?.skills],
  );

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <SectionTitle>Характеристики</SectionTitle>
        <CharacteristicsGrid />
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
              aria-label="Найти навык"
              className="!h-8 w-44 text-sm"
            />
            <DevelopmentPhase />
          </>
        }
      >
        <li className="list-none pb-3 pt-1">
          <RollModsBar value={mods} onChange={setMods} />
        </li>
        <li className="list-none pb-4">
          <SkillList filter={filter} wide />
        </li>
      </Ledger>
      <div>
        <AddButton label="Добавить навык" onClick={() => setAdding(true)} />
      </div>
      <SectionNotes
        value={character.abilitiesNotes}
        onSave={(value) => update(saveNotes('abilitiesNotes')(value))}
      />
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
  const { character, update, isJammed } = useCoc();
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
                    isJammed(a.id) && <span className="text-danger">заклинило</span>,
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
      <SectionNotes value={character.attacksNotes} onSave={(value) => update(saveNotes('attacksNotes')(value))} />
      <PickerDialog
        open={adding}
        onClose={() => setAdding(false)}
        title="Оружие"
        subtitle="Из таблицы оружия 7-й редакции"
        options={WEAPON_OPTIONS.filter((o) => !character.attacks.some((a) => a.id === `coc-${o.id}`))}
        confirmLabel="Взять"
        onPick={(id) => {
          const weapon = weaponDef(id);
          if (!weapon) return;
          const attack = weaponAttack(weapon);
          // Taking it again would replace the one in hand, with its rounds.
          if (character.attacks.some((a) => a.id === attack.id)) {
            toast(`${weapon.name} уже в листе`, { id: 'coc-weapon-owned' });
            return;
          }
          update(addWeapon(attack), { message: `Взято оружие: ${weapon.name}`, type: 'inventory' });
        }}
      />
    </div>
  );
};

// ------------------------------------------------------------------------------------------------
// Sanity
// ------------------------------------------------------------------------------------------------

/** Sanity regained: therapy, a horror defeated, the Keeper's reward; never above 99 − Mythos. */
const RegainSanity: React.FC = () => {
  const { character, update } = useCoc();
  const [amount, setAmount] = useState(1);
  const [reason, setReason] = useState('');
  const max = maxSanityOf(character);
  const room = Math.max(0, max - character.sanity);
  const regain = () => {
    const gained = Math.min(room, amount);
    const why = reason.trim() || 'восстановление';
    update(gainSanity(amount), { message: `Рассудок +${gained}: ${why}`, type: 'sanity' });
    setReason('');
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <NumberField label="Сколько восстановить" value={amount} min={1} max={99} onChange={setAmount} className="w-20" />
      <Input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="За что: лечение, победа над ужасом…"
        aria-label="Причина восстановления рассудка"
        className="!h-9 min-w-0 flex-1"
      />
      <Button
        size="sm"
        disabled={room === 0}
        onClick={regain}
        title={room === 0 ? `Рассудок уже на пределе (${max})` : `Не выше ${max} (99 − Мифы Ктулху)`}
      >
        Восстановить
      </Button>
    </div>
  );
};

export const SanitySection: React.FC = () => {
  const { character, update, sanityRoll, rollModded, rollBout, bout, followUps } = useCoc();
  const { open, isOpen } = useCocSelection();
  const coc = character.coc as CocSheet;
  const [spec, setSpec] = useState('0/1d6');
  const [source, setSource] = useState('');
  const max = maxSanityOf(character);
  const mythos = skillValue(character, 'cthulhu-mythos');
  const insanity = COC_CONDITIONS.filter((c) => c.id.includes('insanity'));
  const insane = character.conditions.some((id) => id.includes('insanity'));
  const specOk = isSanitySpec(spec);

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
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-end gap-2">
              <Input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Что увидел"
                aria-label="Что увидел"
                className="!h-9 flex-1"
              />
              <Input
                value={spec}
                onChange={(e) => setSpec(e.target.value)}
                placeholder="0/1d6"
                className="!h-9 w-24 text-center"
                aria-label="Цена: успех/провал"
                aria-invalid={!specOk || undefined}
                aria-describedby={specOk ? undefined : 'coc-sanity-spec-error'}
              />
              <Button
                variant="primary"
                disabled={!specOk}
                onClick={() => sanityRoll(source.trim() || 'Проверка рассудка', spec.replace(/\s/g, ''))}
              >
                Проверка рассудка
              </Button>
            </div>
            {!specOk && (
              <p id="coc-sanity-spec-error" className="text-xs text-danger">
                Цена пишется как «успех/провал»: 0/1d6, 1/1d4+1, 1d3/1d10.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => update(startDay, { message: 'Начался новый день', type: 'sanity' })}
            >
              Новый день
            </Button>
            <Button
              size="sm"
              onClick={() => rollModded({ label: 'Мифы Ктулху', value: mythos, kind: 'skill', id: 'cthulhu-mythos' })}
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
            <ModsNote />
          </div>
          <RegainSanity />
        </Panel>

        <Panel ornate={false} className="flex flex-col gap-3 px-6 py-5">
          <SectionTitle>Безумие</SectionTitle>
          {insanity.map((c) => {
            const on = character.conditions.includes(c.id);
            // Permanent insanity comes only with sanity at zero; the rest the Keeper may declare.
            const manual = c.id !== CONDITION_IDS.permanentInsanity;
            return (
              <button
                key={c.id}
                type="button"
                disabled={!on && !manual}
                aria-pressed={on}
                onClick={() =>
                  on
                    ? open('condition', c.id)
                    : update(addCondition(c.id), { message: `Состояние: ${c.name}`, type: 'sanity' })
                }
                title={on ? 'Открыть: снять можно в карточке' : 'Отметить по решению Хранителя'}
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
            <Button size="sm" onClick={() => rollBout(false)} disabled={!insane && !followUps.bout}>
              Приступ (в моменте)
            </Button>
            <Button size="sm" onClick={() => rollBout(true)} disabled={!insane && !followUps.bout}>
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
        <SectionNotes value={character.spellsNotes} onSave={(value) => update(saveNotes('spellsNotes')(value))} />
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
            <Button size="row" variant="ghost" onClick={() => update(changeMagic(-1))} aria-label="Магия: −1">
              −1
            </Button>
            <Button
              size="row"
              variant="ghost"
              onClick={() => update(changeMagic(1))}
              title="Магия восстанавливается по 1 ПМ в час"
              aria-label="Магия: +1"
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

/** A short text of the sheet edited in place: saved on blur or Enter, Escape drops the edit. */
const InlineText: React.FC<{
  value: string;
  label: string;
  placeholder?: string;
  onSave: (value: string) => void;
  className?: string;
}> = ({ value, label, placeholder, onSave, className }) => {
  const [draft, setDraft] = useState<string | null>(null);
  const cancelled = useRef(false);
  return (
    <Input
      className={className}
      aria-label={label}
      placeholder={placeholder}
      value={draft ?? value}
      onFocus={() => {
        cancelled.current = false;
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (!cancelled.current && draft !== null && draft.trim() !== value) onSave(draft.trim());
        setDraft(null);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          e.stopPropagation();
          cancelled.current = true;
          e.currentTarget.blur();
        }
      }}
    />
  );
};

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
        <SectionNotes
          value={character.inventoryNotes}
          onSave={(value) => update(saveNotes('inventoryNotes')(value))}
        />
        <ItemDialog
          open={adding}
          onClose={() => setAdding(false)}
          onAdd={(item) => {
            // The id is made here, once: the edit runs twice (screen and stored copy).
            const id = createEntityId('item');
            update(addItem({ ...item, id }), { message: `Взято: ${item.name}`, type: 'inventory' });
          }}
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
          <label className="text-ink-muted" htmlFor="coc-cash">
            Наличные, $
          </label>
          <Input
            id="coc-cash"
            className="!h-8 text-right"
            inputMode="decimal"
            value={cash ?? String(coc.cash)}
            onChange={(e) => setCashText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') {
                e.stopPropagation();
                setCashText(null);
              }
            }}
            onBlur={() => {
              // An empty or unreadable entry keeps the money as it was.
              const value = cash === null ? null : parseCashInput(cash);
              if (value !== null && value !== coc.cash)
                update(setCash(value), { message: `Наличные: $${coc.cash} → $${value}`, type: 'inventory' });
              setCashText(null);
            }}
          />
          <span className="text-ink-muted">Имущество</span>
          <InlineText
            className="!h-8 text-right"
            label="Имущество"
            placeholder="—"
            value={coc.assets}
            onSave={(assets) => update(setAssets(assets), { message: 'Имущество изменено', type: 'inventory' })}
          />
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

/** Talents of a Pulp hero and the player's own traits; each opens its card, own traits are added here. */
const Talents: React.FC = () => {
  const { character, update } = useCoc();
  const { open, isOpen } = useCocSelection();
  const add = () => {
    // The id is made here, once: the edit runs twice (screen and stored copy).
    const id = createEntityId('trait');
    update(
      (doc) => ({ ...doc, traits: [...doc.traits, { id, name: 'Новая особенность', description: '' }] }),
      { message: 'Добавлена особенность', type: 'other' },
    );
    open('talent', id);
  };
  return (
    <div className="flex flex-col gap-3">
      {character.traits.length > 0 && (
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
      )}
      <div>
        <AddButton label="Своя особенность" onClick={add} />
      </div>
    </div>
  );
};

/** The backstory in the order of the paper sheet; each block is written in place, Escape drops the edit. */
export const StorySection: React.FC = () => {
  const { character, update } = useCoc();
  const story = (character.coc as CocSheet).backstory;
  const [editing, setEditing] = useState<string | null>(null);
  const cancelled = useRef(false);
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
                    aria-label={title}
                    defaultValue={story[field]}
                    className="ui-input min-h-24 w-full resize-y bg-transparent text-paper-ink"
                    onFocus={() => {
                      cancelled.current = false;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.stopPropagation();
                        cancelled.current = true;
                        e.currentTarget.blur();
                      }
                    }}
                    onBlur={(e) => {
                      const value = e.currentTarget.value;
                      if (!cancelled.current && value !== story[field])
                        update(
                          (doc) =>
                            doc.coc
                              ? {
                                  ...doc,
                                  coc: { ...doc.coc, backstory: { ...doc.coc.backstory, [field]: value } },
                                }
                              : doc,
                          { message: `История: ${title.toLowerCase()}`, type: 'other' },
                        );
                      setEditing(null);
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditing(field)}
                    aria-label={`${title}: изменить`}
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
