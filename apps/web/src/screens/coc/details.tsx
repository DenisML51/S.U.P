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
import { DetailsPane, type DetailsFact } from '../../ui/DetailsPane';
import { Dialog } from '../../ui/Dialog';
import { NumberField } from '../../ui/forms';
import { Button } from '../../ui/primitives';
import { Prose } from '../../ui/Prose';
import { useWideSheet } from '../sheet/dialogs/context';
import { useCoc } from './context';
import { RollModsBar, modsToRoll, type RollMods } from './parts';

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
}

const SelectionContext = createContext<Selection | null>(null);

export const useCocSelection = (): Selection => {
  const value = useContext(SelectionContext);
  if (!value) throw new Error('useCocSelection outside CocSelectionProvider');
  return value;
};

export const CocSelectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selected, setSelected] = useState<CocEntry | null>(null);
  const open = useCallback((kind: CocEntryKind, id: string) => setSelected({ kind, id }), []);
  const close = useCallback(() => setSelected(null), []);
  const value = useMemo(
    () => ({
      selected,
      open,
      close,
      isOpen: (kind: CocEntryKind, id: string) => selected?.kind === kind && selected.id === id,
    }),
    [selected, open, close],
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

/** What the card of each kind of entry shows and lets do; null when the entry is gone. */
function useCard(
  entry: CocEntry,
  mods: { roll: (label: string, value: number, extra?: object) => void },
): CardContent | null {
  const { character, update, roll } = useCoc();
  const { close } = useCocSelection();
  const coc = character.coc!;
  const [mp, setMp] = useState<number | null>(null);

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
          { label: 'Экстрим', value: fifth(skill.value) },
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
            <Button
              variant="primary"
              onClick={() => mods.roll(name, skill.value, { kind: 'skill', id: entry.id })}
            >
              Бросить
            </Button>
            {!def.skill.noImprovement && (
              <Button onClick={() => update(toggleSkillCheck(entry.id))}>
                {skill.check ? 'Снять отметку' : 'Отметить'}
              </Button>
            )}
            {(def.speciality || def.skill.uncommon) && (
              <Button
                variant="ghost"
                onClick={() => {
                  update(removeSkill(entry.id), { message: `Убран навык: ${name}`, type: 'other' });
                  close();
                }}
              >
                Убрать
              </Button>
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
        eyebrow: `Характеристика · ${def.short}`,
        title: def.name,
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
          <Button variant="primary" onClick={() => mods.roll(def.name, value, { kind: 'characteristic' })}>
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
            {weapon.description && <Prose>{weapon.description}</Prose>}
            {weapon.impale && <p>Пронзающее: экстремальный успех — максимум урона и ещё один бросок.</p>}
            {weapon.damage.includes('DB') && <p>К урону прибавляется бонус урона сыщика.</p>}
          </div>
        ),
        actions: (
          <>
            <Button
              variant="primary"
              disabled={empty}
              onClick={() => {
                mods.roll(weapon.name, value, {
                  kind: 'attack',
                  id: weapon.id,
                  skill: weapon.skill,
                  malfunction: weapon.malfunction,
                });
                if (weapon.ammo !== undefined) update(fireWeapon(weapon.id));
              }}
            >
              {empty ? 'Нет патронов' : 'Атаковать'}
            </Button>
            {weapon.magazine !== undefined && (
              <Button
                onClick={() =>
                  update(reloadWeapon(weapon.id), {
                    message: `${weapon.name}: перезаряжено`,
                    type: 'inventory',
                  })
                }
              >
                Перезарядить
              </Button>
            )}
            {weapon.id !== 'coc-unarmed' && (
              <Button
                variant="ghost"
                onClick={() => {
                  update(removeWeapon(weapon.id), {
                    message: `Убрано оружие: ${weapon.name}`,
                    type: 'inventory',
                  });
                  close();
                }}
              >
                Убрать
              </Button>
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
            <p className="text-xs text-ink-faint">
              Нехватка ПМ оплачивается хитами. Первое сотворение — трудный бросок МОЩ (по решению Хранителя).
            </p>
          </div>
        ),
        actions: (
          <>
            <Button
              variant="primary"
              onClick={() => {
                const result = castSpell(character, spell.cost, cost.variable ? chosen : undefined);
                const parts = [
                  result.mp && `${result.mp} ПМ`,
                  result.shortfall && `${result.shortfall} из хитов`,
                  result.sanityLoss && `${result.sanityLoss} рассудка`,
                  result.pow && `${result.pow} МОЩ`,
                ].filter(Boolean);
                update(result.edit, {
                  message: `Сотворено «${spell.name}»: ${parts.join(', ') || 'без цены'}`,
                  type: 'sanity',
                });
              }}
            >
              Сотворить
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                roll({
                  label: 'Мощь (трудный)',
                  value: cocCharacteristics(character).pow,
                  kind: 'characteristic',
                  difficulty: 'hard',
                })
              }
            >
              Бросок МОЩ
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                update(forgetSpell(spell.id), {
                  message: `Забыто заклинание «${spell.name}»`,
                  type: 'other',
                });
                close();
              }}
            >
              Забыть
            </Button>
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
                <Button onClick={() => update(changeItemCount(item.id, -1))}>−1</Button>
                <Button onClick={() => update(changeItemCount(item.id, 1))}>+1</Button>
              </>
            )}
            <Button
              variant="ghost"
              onClick={() => {
                update(removeItem(item.id), { message: `Убрано: ${item.name}`, type: 'inventory' });
                close();
              }}
            >
              Убрать
            </Button>
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
          <Button
            onClick={() => {
              update(removeMadness(m.id), { message: `Излечено: ${m.name}`, type: 'sanity' });
              close();
            }}
          >
            Излечено
          </Button>
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
      return {
        eyebrow: talent ? `Талант Pulp · ${category}` : 'Особенность',
        title: trait.name,
        body: <Prose>{trait.description || 'Без описания.'}</Prose>,
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
          <Button
            onClick={() => {
              update(recoverFrom(condition.id), { message: `Прошло: ${condition.name}`, type: 'health' });
              close();
            }}
          >
            Прошло
          </Button>
        ),
      };
    }
  }
}

const ROLLABLE: CocEntryKind[] = ['skill', 'characteristic', 'weapon'];

const CardBody: React.FC<{ entry: CocEntry; asDialog: boolean }> = ({ entry, asDialog }) => {
  const { roll } = useCoc();
  const { close } = useCocSelection();
  const [mods, setMods] = useState<RollMods>({ difficulty: 'regular', dice: 0 });
  const card = useCard(entry, {
    roll: (label, value, extra = {}) => roll({ label, value, kind: 'skill', ...modsToRoll(mods), ...extra }),
  });
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

/**
 * The chosen entry's card: a column beside the section on a wide screen (the list stays in view),
 * a dialog on a narrow one. The section's content sits in `children`.
 */
export const CocDetailsLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { selected } = useCocSelection();
  const wide = useWideSheet();
  return (
    <div className="flex h-full min-h-0 gap-8">
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
