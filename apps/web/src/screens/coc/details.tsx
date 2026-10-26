import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  CHARACTERISTICS,
  COC_CONDITIONS,
  castSpell,
  changeItemCount,
  displaySkillName,
  fifth,
  fireWeapon,
  forgetSpell,
  half,
  parseSpellCost,
  recoverFrom,
  reloadWeapon,
  removeItem,
  removeMadness,
  removeSkill,
  removeWeapon,
  sanityLoss as sanityLossOf,
  setCharacteristic,
  setSkill,
  skillBase,
  skillDef,
  skillName,
  skillValue,
  talentDef,
  toggleSkillCheck,
  cocCharacteristics,
  type CharacteristicId,
} from '@itd/game-logic/coc';
import type { Character } from '@itd/schema';
import { DetailsPane, type DetailsFact } from '../../ui/DetailsPane';
import { Dialog } from '../../ui/Dialog';
import { NumberField } from '../../ui/forms';
import { Button, Input, cx } from '../../ui/primitives';
import { Prose } from '../../ui/Prose';
import { useWideSheet } from '../sheet/dialogs/context';
import { EditableText } from '../sheet/parts/EditableText';
import { canRollDamage, useCoc } from './context';
import { ConfirmButton } from './controls';
import { RollModsBar } from './parts';
import { tIn } from '../../i18n';

/** What a card can show: an entry of one of the sheet's lists. */
export type CocEntryKind =
  'skill' | 'characteristic' | 'weapon' | 'spell' | 'item' | 'madness' | 'talent' | 'condition';
export interface CocEntry {
  kind: CocEntryKind;
  id: string;
}

interface Selection {
  selected: CocEntry | null;
  open: (kind: CocEntryKind, id: string) => void;
  close: () => void;
  isOpen: (kind: CocEntryKind, id: string) => boolean;
  /** A spell was cast from its card (the combat screen spends the round's action). */
  onCast?: () => void;
}

const SelectionContext = createContext<Selection | null>(null);

export const useCocSelection = (): Selection => {
  const value = useContext(SelectionContext);
  if (!value) throw new Error('useCocSelection outside CocSelectionProvider');
  return value;
};

export const CocSelectionProvider: React.FC<{ children: React.ReactNode; onCast?: () => void }> = ({
  children,
  onCast,
}) => {
  const [selected, setSelected] = useState<CocEntry | null>(null);
  const open = useCallback((kind: CocEntryKind, id: string) => setSelected({ kind, id }), []);
  const close = useCallback(() => setSelected(null), []);
  const value = useMemo(
    () => ({
      selected,
      open,
      close,
      isOpen: (kind: CocEntryKind, id: string) => selected?.kind === kind && selected.id === id,
      // A screen that acts on a casting (the fight) is done with the card once the spell is cast.
      onCast: onCast
        ? () => {
            onCast();
            setSelected(null);
          }
        : undefined,
    }),
    [selected, open, close, onCast],
  );
  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
};

/** A quiet "i" that opens an entry's card, for rows whose own click rolls. */
export const InfoButton: React.FC<{ kind: CocEntryKind; id: string; label: string }> = ({
  kind,
  id,
  label,
}) => {
  // Parts shown on their own (the showcase) have no cards to open.
  const selection = useContext(SelectionContext);
  if (!selection) return null;
  return (
    <button
      type="button"
      onClick={() => selection.open(kind, id)}
      aria-label={`Подробнее: ${label}`}
      title="Подробнее"
      className="coc-info grid h-5 w-5 shrink-0 place-items-center rounded-full border border-current text-[10px] italic"
    >
      i
    </button>
  );
};

interface CardContent {
  eyebrow: string;
  title: string;
  facts?: DetailsFact[];
  body?: React.ReactNode;
  actions?: React.ReactNode;
}

/** A trait of the player's own renamed or rewritten; a Pulp talent is rebuilt from the build and stays. */
const editTrait =
  (id: string, patch: { name?: string; description?: string }) =>
  (doc: Character): Character => ({
    ...doc,
    traits: doc.traits.map((t) => (t.id === id ? { ...t, ...patch } : t)),
  });

/** The name of an own trait, edited in place. */
const TraitName: React.FC<{ value: string; onSave: (name: string) => void }> = ({ value, onSave }) => {
  const [draft, setDraft] = useState(value);
  return (
    <Input
      aria-label="Название особенности"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
      onBlur={() => {
        const name = draft.trim();
        if (name && name !== value) onSave(name);
        else setDraft(value);
      }}
    />
  );
};

/** What the card of each kind of entry shows and lets do; null when the entry is gone. */
function useCard(entry: CocEntry): CardContent | null {
  const { character, update, rollModded, present, last, rollDamage, onTurn, isJammed, clearJam, sanityLost } =
    useCoc();
  const { close, onCast } = useCocSelection();
  const coc = character.coc!;
  const [mp, setMp] = useState<number | null>(null);
  const [casting, setCasting] = useState(false);
  const [firstCast, setFirstCast] = useState(false);
  const rollEntry = (label: string, value: number, extra: object) =>
    rollModded({ label, value, kind: 'skill', ...extra });

  switch (entry.kind) {
    case 'skill': {
      const skill = coc.skills.find((s) => s.id === entry.id);
      const def = skillDef(entry.id);
      if (!skill || !def) return null;
      const name = displaySkillName(skill);
      const base = skillBase(entry.id, cocCharacteristics(character));
      return {
        eyebrow: ['Навык', skill.occupation && 'профессиональный', def.skill.uncommon && 'редкий']
          .filter(Boolean)
          .join(' · '),
        title: name,
        facts: [
          { label: 'Значение', value: skill.value },
          { label: 'Трудный', value: half(skill.value) },
          { label: 'Экстремальный', value: fifth(skill.value) },
          { label: 'База', value: base },
        ],
        body: (
          <div className="flex flex-col gap-4">
            <Prose>{def.skill.description}</Prose>
            <div className="flex items-center gap-3">
              <NumberField
                label="Значение"
                value={skill.value}
                min={0}
                max={99}
                onChange={(v) =>
                  update(setSkill(entry.id, v), { message: `${name}: ${skill.value} → ${v}`, type: 'other' })
                }
                className="w-24"
              />
              <span className="text-xs text-ink-faint">
                {def.skill.noImprovement
                  ? 'Не развивается отметками.'
                  : skill.check
                    ? 'Отмечен для развития.'
                    : 'Успех в игре ставит отметку.'}
              </span>
            </div>
          </div>
        ),
        actions: (
          <>
            <Button variant="primary" onClick={() => rollEntry(name, skill.value, { kind: 'skill', id: entry.id })}>
              Бросить
            </Button>
            {!def.skill.noImprovement && (
              <Button onClick={() => update(toggleSkillCheck(entry.id))}>
                {skill.check ? 'Снять отметку' : 'Отметить'}
              </Button>
            )}
            {(def.speciality || def.skill.uncommon) && (
              <ConfirmButton
                title="Убрать навык?"
                message={
                  <>
                    <span className="text-ink">{name}</span> ({skill.value}) исчезнет из листа.
                  </>
                }
                confirmLabel="Убрать"
                onConfirm={() => {
                  update(removeSkill(entry.id), { message: `Убран навык: ${name}`, type: 'other' });
                  close();
                }}
              >
                Убрать
              </ConfirmButton>
            )}
          </>
        ),
      };
    }
    case 'characteristic': {
      const def = CHARACTERISTICS.find((c) => c.id === entry.id);
      if (!def) return null;
      const value = cocCharacteristics(character)[def.id as CharacteristicId];
      return {
        eyebrow: `Характеристика · ${tIn('coc', def.short)}`,
        title: tIn('coc', def.name),
        facts: [
          { label: 'Значение', value },
          { label: 'Половина', value: half(value) },
          { label: 'Пятая', value: fifth(value) },
        ],
        body: (
          <div className="flex flex-col gap-4">
            <Prose>{def.description}</Prose>
            <NumberField
              label="Значение"
              value={value}
              min={0}
              max={200}
              onChange={(v) =>
                update(setCharacteristic(def.id, v), {
                  message: `${def.name}: ${value} → ${v}`,
                  type: 'other',
                })
              }
              className="w-24"
            />
            <p className="text-xs text-ink-faint">
              Изменение ВЫН, ТЕЛ и МОЩ пересчитывает хиты, магию и движение.
            </p>
          </div>
        ),
        actions: (
          <Button variant="primary" onClick={() => rollEntry(def.name, value, { kind: 'characteristic' })}>
            Бросить
          </Button>
        ),
      };
    }
    case 'weapon': {
      const weapon = character.attacks.find((a) => a.id === entry.id);
      if (!weapon) return null;
      const value = weapon.skill ? skillValue(character, weapon.skill) : 0;
      const empty = weapon.ammo !== undefined && weapon.ammo <= 0;
      const jammed = isJammed(weapon.id);
      const hit = canRollDamage(last) && last.id === weapon.id ? last : null;
      return {
        eyebrow: weapon.skill ? `Оружие · ${skillName(weapon.skill)}` : 'Оружие',
        title: weapon.name,
        facts: [
          { label: 'Навык', value: `${value} · ${half(value)} · ${fifth(value)}` },
          { label: 'Урон', value: weapon.damage },
          ...(weapon.range ? [{ label: 'Дальность', value: weapon.range }] : []),
          ...(weapon.uses ? [{ label: 'Атак', value: weapon.uses }] : []),
          ...(weapon.ammo !== undefined
            ? [{ label: 'Патроны', value: `${weapon.ammo} / ${weapon.magazine}` }]
            : []),
          ...(weapon.malfunction ? [{ label: 'Осечка', value: weapon.malfunction }] : []),
        ],
        body: (
          <div className="flex flex-col gap-2 text-sm">
            {jammed && (
              <p className="text-danger">
                Оружие заклинило: нужен раунд на починку (по решению Хранителя — бросок навыка). Отметка
                держится, пока лист открыт.
              </p>
            )}
            {weapon.description && <Prose>{weapon.description}</Prose>}
            {weapon.impale && <p>Пронзающее: экстремальный успех — максимум урона и ещё один бросок.</p>}
            {weapon.damage.includes('DB') && <p>К урону прибавляется бонус урона сыщика.</p>}
          </div>
        ),
        actions: (
          <>
            {jammed ? (
              <Button
                variant="primary"
                onClick={() =>
                  onTurn(() => {
                    clearJam(weapon.id);
                    update((doc) => doc, { message: `${weapon.name}: починено`, type: 'inventory' }, { quiet: true });
                  })
                }
              >
                Починить
              </Button>
            ) : (
              <Button
                variant="primary"
                disabled={empty}
                onClick={() =>
                  onTurn(() => {
                    rollEntry(weapon.name, value, {
                      kind: 'attack',
                      id: weapon.id,
                      skill: weapon.skill,
                      malfunction: weapon.malfunction,
                    });
                    if (weapon.ammo !== undefined) update(fireWeapon(weapon.id), undefined, { quiet: true });
                  })
                }
              >
                {empty ? 'Нет патронов' : 'Атаковать'}
              </Button>
            )}
            {hit && (
              <Button variant="danger" onClick={rollDamage}>
                Урон
              </Button>
            )}
            {weapon.magazine !== undefined && (
              <Button
                onClick={() =>
                  onTurn(() =>
                    update(reloadWeapon(weapon.id), {
                      message: `${weapon.name}: перезаряжено`,
                      type: 'inventory',
                    }),
                  )
                }
              >
                Перезарядить
              </Button>
            )}
            {weapon.id !== 'coc-unarmed' && (
              <ConfirmButton
                title="Убрать оружие?"
                message={
                  <>
                    <span className="text-ink">{weapon.name}</span> исчезнет из листа
                    {weapon.ammo !== undefined ? ' вместе с патронами в нём' : ''}.
                  </>
                }
                confirmLabel="Убрать"
                onConfirm={() => {
                  update(removeWeapon(weapon.id), {
                    message: `Убрано оружие: ${weapon.name}`,
                    type: 'inventory',
                  });
                  clearJam(weapon.id);
                  close();
                }}
              >
                Убрать
              </ConfirmButton>
            )}
          </>
        ),
      };
    }
    case 'spell': {
      const spell = coc.spells.find((s) => s.id === entry.id);
      if (!spell) return null;
      const cost = parseSpellCost(spell.cost);
      const chosen = mp ?? Math.max(1, cost.mp);
      const spend = cost.variable ? chosen : cost.mp;
      const shortfall = Math.max(0, spend - coc.magicPoints);
      const pow = cocCharacteristics(character).pow;

      const cast = () => {
        setCasting(false);
        // Every die (the POW roll, the sanity it costs) is thrown here; the edit only pays the price.
        const result = castSpell(character, spell.cost, cost.variable ? chosen : undefined, Math.random, {
          firstCast,
        });
        const outcome = result.sanityLoss > 0 ? sanityLossOf(character, result.sanityLoss) : null;
        const parts = [
          result.mp && `${result.mp} ПМ`,
          result.shortfall && `${result.shortfall} из хитов`,
          result.sanityLoss && `${result.sanityLoss} рассудка`,
          result.pow && `${result.pow} МОЩ`,
        ].filter(Boolean);
        const first = result.powCheck ? (result.worked ? ' (первое сотворение удалось)' : ' — не сработало (МОЩ провален)') : '';
        update(
          result.edit,
          { message: `Сотворено «${spell.name}»${first}: ${parts.join(', ') || 'без цены'}`, type: 'sanity' },
          { quiet: !!result.powCheck },
        );
        if (result.powCheck)
          present(
            { label: `Первое сотворение «${spell.name}»: МОЩ`, value: pow, kind: 'rule', difficulty: 'hard' },
            result.powCheck,
            {
              note: result.worked
                ? 'Заклинание действует.'
                : 'Заклинание не сработало — цена всё равно уплачена.',
              ...(outcome
                ? {
                    sanity: {
                      loss: outcome.loss,
                      needsIntRoll: outcome.needsIntRoll,
                      indefinite: outcome.indefinite,
                      permanent: outcome.permanent,
                      boutTriggered: outcome.boutTriggered,
                    },
                  }
                : {}),
            },
          );
        if (outcome) sanityLost(`«${spell.name}»`, outcome);
        setFirstCast(false);
        onCast?.();
      };

      return {
        eyebrow: 'Заклинание Мифов',
        title: spell.name,
        facts: [
          { label: 'Цена', value: spell.cost },
          { label: 'Время', value: spell.castingTime },
        ],
        body: (
          <div className="flex flex-col gap-3">
            {spell.description && <Prose>{spell.description}</Prose>}
            {cost.variable && (
              <NumberField
                label="Сколько ПМ вложить"
                value={chosen}
                min={0}
                max={99}
                onChange={setMp}
                className="w-24"
              />
            )}
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={firstCast}
                onChange={(e) => setFirstCast(e.target.checked)}
              />
              <span>
                Первое сотворение: трудный бросок МОЩ ({half(pow)}) решает, подействует ли заклинание. Цена
                платится в любом случае.
              </span>
            </label>
            <p className="text-xs text-ink-faint">Нехватка ПМ оплачивается хитами.</p>
            <Dialog
              open={casting}
              onClose={() => setCasting(false)}
              title={`Сотворить «${spell.name}»?`}
              width="sm"
              footer={
                <>
                  <Button variant="ghost" onClick={() => setCasting(false)}>
                    Отмена
                  </Button>
                  <Button variant={cost.pow > 0 ? 'danger' : 'primary'} onClick={cast}>
                    Сотворить
                  </Button>
                </>
              }
            >
              <ul className="flex list-disc flex-col gap-1 pl-5 text-[15px] text-ink-muted">
                {spend > 0 && (
                  <li>
                    {spend} ПМ (есть {coc.magicPoints})
                    {shortfall > 0 && <span className="text-danger">, нехватка {shortfall} — из хитов</span>}
                  </li>
                )}
                {cost.sanity && <li>Рассудок: −{cost.sanity}</li>}
                {cost.pow > 0 && (
                  <li className="text-danger">
                    МОЩ −{cost.pow} навсегда ({pow} → {pow - cost.pow})
                  </li>
                )}
                {spend === 0 && !cost.sanity && cost.pow === 0 && <li>Без цены: {spell.cost || '—'}</li>}
                {firstCast && <li>Первое сотворение: трудный бросок МОЩ.</li>}
              </ul>
            </Dialog>
          </div>
        ),
        actions: (
          <>
            <Button variant="primary" onClick={() => onTurn(() => setCasting(true))}>
              Сотворить
            </Button>
            <ConfirmButton
              title="Забыть заклинание?"
              message={
                <>
                  <span className="text-ink">«{spell.name}»</span> исчезнет из листа; выучить снова — по
                  решению Хранителя.
                </>
              }
              confirmLabel="Забыть"
              onConfirm={() => {
                update(forgetSpell(spell.id), {
                  message: `Забыто заклинание «${spell.name}»`,
                  type: 'other',
                });
                close();
              }}
            >
              Забыть
            </ConfirmButton>
          </>
        ),
      };
    }
    case 'item': {
      const item = character.inventory.find((i) => i.id === entry.id);
      if (!item) return null;
      return {
        eyebrow: 'Вещь',
        title: item.name,
        facts: item.quantity !== undefined ? [{ label: 'Количество', value: item.quantity }] : undefined,
        body: item.description ? (
          <Prose>{item.description}</Prose>
        ) : (
          <p className="text-sm text-ink-faint">Без описания.</p>
        ),
        actions: (
          <>
            {item.quantity !== undefined && (
              <>
                <Button onClick={() => update(changeItemCount(item.id, -1))} aria-label={`${item.name}: −1`}>
                  −1
                </Button>
                <Button onClick={() => update(changeItemCount(item.id, 1))} aria-label={`${item.name}: +1`}>
                  +1
                </Button>
              </>
            )}
            <ConfirmButton
              title="Убрать вещь?"
              message={
                <>
                  <span className="text-ink">{item.name}</span> исчезнет из листа.
                </>
              }
              confirmLabel="Убрать"
              onConfirm={() => {
                update(removeItem(item.id), { message: `Убрано: ${item.name}`, type: 'inventory' });
                close();
              }}
            >
              Убрать
            </ConfirmButton>
          </>
        ),
      };
    }
    case 'madness': {
      const m = coc.madness.find((x) => x.id === entry.id);
      if (!m) return null;
      return {
        eyebrow: m.kind === 'phobia' ? 'Фобия' : 'Мания',
        title: m.name,
        body: (
          <div className="flex flex-col gap-2">
            <Prose>{m.description}</Prose>
            <p className="text-xs text-ink-faint">
              {m.kind === 'phobia'
                ? 'При встрече с предметом страха — бросок рассудка или бегство; штрафная кость на действия рядом с ним.'
                : 'Во время приступа сыщик действует по своей мании; Хранитель может потребовать бросок, чтобы сдержаться.'}
            </p>
          </div>
        ),
        actions: (
          <ConfirmButton
            variant="secondary"
            danger={false}
            title="Излечено?"
            message={
              <>
                <span className="text-ink">{m.name}</span> уйдёт из листа: обычно после лечения, по решению
                Хранителя.
              </>
            }
            confirmLabel="Излечено"
            onConfirm={() => {
              update(removeMadness(m.id), { message: `Излечено: ${m.name}`, type: 'sanity' });
              close();
            }}
          >
            Излечено
          </ConfirmButton>
        ),
      };
    }
    case 'talent': {
      const trait = character.traits.find((t) => t.id === entry.id);
      if (!trait) return null;
      const talent = trait.grant?.startsWith('talent:')
        ? talentDef(trait.grant.slice('talent:'.length))
        : undefined;
      const category =
        talent &&
        { physical: 'физический', mental: 'ментальный', combat: 'боевой', misc: 'особый' }[talent.category];
      // Entries written by the build (Pulp talents) are rebuilt from it: only the player's own are edited.
      const own = !trait.grant;
      return {
        eyebrow: talent ? `Талант Pulp · ${category}` : 'Особенность',
        title: trait.name,
        body: own ? (
          <div className="flex flex-col gap-3">
            <TraitName
              key={trait.id}
              value={trait.name}
              onSave={(name) => update(editTrait(trait.id, { name }), { message: `Особенность: ${name}`, type: 'other' })}
            />
            <EditableText
              title="Описание"
              heading="label"
              value={trait.description}
              onSave={(description) => update(editTrait(trait.id, { description }))}
            />
          </div>
        ) : (
          <Prose>{trait.description || 'Без описания.'}</Prose>
        ),
        actions: own ? (
          <ConfirmButton
            title="Удалить особенность?"
            message={
              <>
                <span className="text-ink">{trait.name}</span> исчезнет из листа.
              </>
            }
            confirmLabel="Удалить"
            onConfirm={() => {
              update((doc) => ({ ...doc, traits: doc.traits.filter((t) => t.id !== trait.id) }), {
                message: `Удалена особенность: ${trait.name}`,
                type: 'other',
              });
              close();
            }}
          >
            Удалить
          </ConfirmButton>
        ) : undefined,
      };
    }
    case 'condition': {
      const condition = COC_CONDITIONS.find((c) => c.id === entry.id);
      if (!condition || !character.conditions.includes(condition.id)) return null;
      return {
        eyebrow: 'Состояние',
        title: condition.name,
        body: <Prose>{condition.description}</Prose>,
        actions: (
          <ConfirmButton
            variant="secondary"
            danger={false}
            title="Состояние прошло?"
            message={
              <>
                <span className="text-ink">{condition.name}</span> будет снято с листа.
              </>
            }
            confirmLabel="Прошло"
            onConfirm={() => {
              update(recoverFrom(condition.id), { message: `Прошло: ${condition.name}`, type: 'health' });
              close();
            }}
          >
            Прошло
          </ConfirmButton>
        ),
      };
    }
  }
}

const ROLLABLE: CocEntryKind[] = ['skill', 'characteristic', 'weapon'];

const CardBody: React.FC<{ entry: CocEntry; asDialog: boolean }> = ({ entry, asDialog }) => {
  const { close } = useCocSelection();
  const { mods, setMods } = useCoc();
  const card = useCard(entry);
  if (!card) return null;
  const body = (
    <div className="flex flex-col gap-4">
      {card.body}
      {ROLLABLE.includes(entry.kind) && <RollModsBar value={mods} onChange={setMods} />}
    </div>
  );
  if (asDialog)
    return (
      <Dialog open onClose={close} title={card.title} eyebrow={card.eyebrow} footer={card.actions} width="md">
        {card.facts && (
          <dl className="mb-4 grid grid-cols-2 gap-2 text-sm">
            {card.facts.map((f) => (
              <div key={f.label} className="flex justify-between gap-3 border-b border-line/60 py-1">
                <dt className="text-ink-muted">{f.label}</dt>
                <dd className="ui-numeric">{f.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {body}
      </Dialog>
    );
  return (
    <DetailsPane
      title={card.title}
      eyebrow={card.eyebrow}
      facts={card.facts}
      actions={card.actions}
      onClose={close}
      className="h-full"
    >
      {body}
    </DetailsPane>
  );
};

/** The chosen entry's card as a dialog, for a screen without a column for it (the fight). */
export const CocEntryDialog: React.FC = () => {
  const { selected } = useCocSelection();
  return selected ? <CardBody key={`${selected.kind}-${selected.id}`} entry={selected} asDialog /> : null;
};

/**
 * The chosen entry's card: a column beside the section on a wide screen (the list stays in view),
 * a dialog on a narrow one. The section's content sits in `children`.
 */
export const CocDetailsLayout: React.FC<{
  children: React.ReactNode;
  /** Its height: the section's full height by default; a narrow sheet lets it grow and scroll the page. */
  className?: string;
}> = ({ children, className = 'h-full min-h-0' }) => {
  const { selected } = useCocSelection();
  const wide = useWideSheet();
  return (
    <div className={cx('flex gap-8', className)}>
      <div className="min-w-0 flex-1">{children}</div>
      {selected && wide && (
        <div className="h-full w-[400px] shrink-0 pt-1">
          <CardBody key={`${selected.kind}-${selected.id}`} entry={selected} asDialog={false} />
        </div>
      )}
      {selected && !wide && <CardBody key={`${selected.kind}-${selected.id}`} entry={selected} asDialog />}
    </div>
  );
};
