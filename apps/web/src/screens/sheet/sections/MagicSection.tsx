import React, { useMemo, useState } from 'react';
import {
  SPELL_SCHOOLS,
  UNLIMITED_PREPARED,
  maxPrepared,
  preparationBlocker,
  preparedCount,
  setMaxPrepared,
  slotResourceFor,
  spellLevelName,
  toggleKnownSchool,
  togglePrepared,
} from '@itd/game-logic';
import type { Character, Spell } from '@itd/schema';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { ACTION_TYPES } from '../../../ui/actionTypes';
import { Ledger, LedgerBullet, LedgerGroup, LedgerRow, MetaLine, MetaValue } from '../../../ui/Ledger';
import { Button, IconButton, Input, Panel, cx } from '../../../ui/primitives';
import { IconMinus, IconPlus } from '../../../ui/icons';
import { SectionNotes } from '../parts/SectionNotes';
import type { SheetLogic } from '../sheetLogic';
import { useRolls } from '../useRolls';
import { damageParts, describeDamage } from '../parts/damage';

type LevelFilter = 'all' | number;

/** The ledger bullet of a spell doubles as its preparation switch: filled means prepared. */
const PrepareMark: React.FC<{ spell: Spell; blocker: string | null; onToggle: () => void }> = ({ spell, blocker, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    disabled={!spell.prepared && blocker !== null}
    title={spell.prepared ? 'Подготовлено — нажмите, чтобы убрать' : (blocker ?? 'Подготовить')}
    aria-label={`${spell.name}: ${spell.prepared ? 'подготовлено' : 'не подготовлено'}`}
    aria-pressed={spell.prepared}
    className="grid h-6 w-6 shrink-0 place-items-center transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-40"
  >
    <LedgerBullet filled={spell.prepared} />
  </button>
);

const LevelSummary: React.FC<{ character: Character; level: number; onLimit: (value: number) => void }> = ({
  character,
  level,
  onLimit,
}) => {
  const limit = maxPrepared(character, level);
  const unlimited = limit >= UNLIMITED_PREPARED;
  const slots = slotResourceFor(character, level);
  return (
    <span className="flex items-center gap-4">
      {level > 0 && (
        <span className="flex items-center gap-1" title="Сколько заклинаний этого круга можно подготовить">
          подготовлено <span className="tabular-nums">{preparedCount(character, level)}</span> из
          <IconButton label="Уменьшить лимит" size={20} onClick={() => onLimit(unlimited ? preparedCount(character, level) : limit - 1)}>
            <IconMinus width={12} height={12} />
          </IconButton>
          <span className="tabular-nums">{unlimited ? '∞' : limit}</span>
          <IconButton label="Увеличить лимит" size={20} disabled={unlimited} onClick={() => onLimit(limit + 1)}>
            <IconPlus width={12} height={12} />
          </IconButton>
        </span>
      )}
      {slots && (
        <span>
          ячейки <span className="tabular-nums">{slots.current}</span> / {slots.max}
        </span>
      )}
    </span>
  );
};

/** Spellcasting difficulty: its name and value, edited in place. */
const DifficultyEditor: React.FC<{ name: string; value: number; onSave: (name: string, value: number) => void }> = ({
  name,
  value,
  onSave,
}) => {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [draftValue, setDraftValue] = useState(String(value));
  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="group block w-full text-left" title="Изменить">
        <span className="ui-display ui-numeric text-4xl leading-none text-ink group-hover:text-frame-bright">{value}</span>
        <span className="mt-1 block text-xs text-ink-faint">{name}</span>
      </button>
    );
  }
  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = Number(draftValue);
        onSave(draftName.trim() || name, Number.isFinite(parsed) ? parsed : value);
        setEditing(false);
      }}
    >
      <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} aria-label="Название" />
      <div className="flex gap-2">
        <Input value={draftValue} onChange={(e) => setDraftValue(e.target.value)} inputMode="numeric" aria-label="Значение" />
        <Button type="submit" size="sm" variant="primary">
          Готово
        </Button>
      </div>
    </form>
  );
};

/** Spells: the whole spellbook, preparation for the day and casting, in one place. */
export const MagicSection: React.FC<{ logic: SheetLogic }> = ({ logic }) => {
  const { character } = logic;
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  const performAction = useCharacterStore((s) => s.performAction);
  const roll = useRolls();
  const [level, setLevel] = useState<LevelFilter>('all');
  const [preparedOnly, setPreparedOnly] = useState(false);
  const [query, setQuery] = useState('');

  const levels = useMemo(() => [...new Set(character.spells.map((s) => s.level))].sort((a, b) => a - b), [character.spells]);
  const visible = character.spells.filter(
    (spell) =>
      (level === 'all' || spell.level === level) &&
      (!preparedOnly || spell.prepared) &&
      (!query.trim() || spell.name.toLowerCase().includes(query.trim().toLowerCase())),
  );
  const groups = levels
    .map((lvl) => ({ level: lvl, spells: visible.filter((s) => s.level === lvl) }))
    .filter((group) => group.spells.length > 0);

  const cast = (spell: Spell) => {
    if (!performAction({ kind: 'spell', id: spell.id })?.ok) return;
    roll.damage(spell.name, damageParts(spell));
  };

  const cost = (spell: Spell) => {
    if (!spell.resourceId) return null;
    const resource = character.resources.find((r) => r.id === spell.resourceId);
    return (
      <>
        <MetaValue>{spell.resourceCost ?? 1}</MetaValue> {resource?.name ?? 'ресурс'}
      </>
    );
  };

  return (
    <div className="grid h-full grid-cols-[1fr_270px] gap-8">
      <div className="flex min-h-0 min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <nav className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Круг заклинаний">
            {(['all', ...levels] as LevelFilter[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setLevel(option)}
                aria-current={level === option}
                className={cx(
                  'border-b pb-0.5 text-sm transition-colors',
                  level === option ? 'border-frame-bright text-ink' : 'border-transparent text-ink-faint hover:text-ink-muted',
                )}
              >
                {option === 'all' ? 'Все круги' : option === 0 ? 'Заговоры' : option}
              </button>
            ))}
          </nav>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-muted">
            <input
              type="checkbox"
              checked={preparedOnly}
              onChange={(e) => setPreparedOnly(e.target.checked)}
              className="accent-[rgb(var(--c-frame-bright))]"
            />
            только подготовленные
          </label>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск" className="ml-auto !w-48 !py-1.5" />
        </div>

        <Ledger title="Книга заклинаний" addLabel="Добавить заклинание" onAdd={() => logic.openSpellModal()}>
          {groups.map((group) => (
            <React.Fragment key={group.level}>
              <LedgerGroup
                aside={
                  <LevelSummary
                    character={character}
                    level={group.level}
                    onLimit={(value) => updateCharacter((doc) => setMaxPrepared(doc, group.level, value))}
                  />
                }
              >
                {spellLevelName(group.level)}
              </LedgerGroup>
              {group.spells.map((spell) => {
                const parts = damageParts(spell);
                return (
                  <LedgerRow
                    key={spell.id}
                    dim={!spell.prepared}
                    leading={
                      <PrepareMark
                        spell={spell}
                        blocker={preparationBlocker(character, spell)}
                        onToggle={() => updateCharacter((doc) => togglePrepared(doc, spell.id))}
                      />
                    }
                    title={spell.name}
                    meta={
                      <MetaLine
                        parts={[
                          spell.school,
                          spell.castingTime || ACTION_TYPES[spell.actionType].short,
                          spell.range,
                          cost(spell),
                          parts.length > 0 && <MetaValue>{describeDamage(parts)}</MetaValue>,
                        ]}
                      />
                    }
                    onOpen={() => logic.openSpellView(spell)}
                    action={
                      spell.prepared && (
                        <Button size="row" variant="secondary" onClick={() => cast(spell)}>
                          Сотворить
                        </Button>
                      )
                    }
                  />
                );
              })}
            </React.Fragment>
          ))}
          {groups.length === 0 && (
            <li className="py-6 text-sm opacity-60">
              {character.spells.length === 0 ? 'Книга заклинаний пуста' : 'Ничего не найдено'}
            </li>
          )}
        </Ledger>
      </div>

      <aside className="flex min-h-0 min-w-0 flex-col gap-5">
        <Panel className="px-5 py-4">
          <DifficultyEditor
            name={character.spellcastingDifficultyName ?? 'СЛ заклинаний'}
            value={character.spellcastingDifficultyValue ?? 10}
            onSave={logic.updateSpellcastingDifficulty}
          />
        </Panel>

        <section>
          <h3 className="mb-2 text-xs uppercase tracking-[0.16em] text-ink-muted">Изучаемые школы</h3>
          <ul className="grid gap-1">
            {SPELL_SCHOOLS.map((school) => (
              <li key={school}>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-muted hover:text-ink">
                  <input
                    type="checkbox"
                    checked={character.knownSchools.includes(school)}
                    onChange={() => updateCharacter((doc) => toggleKnownSchool(doc, school))}
                    className="accent-[rgb(var(--c-frame-bright))]"
                  />
                  {school}
                </label>
              </li>
            ))}
          </ul>
          {character.knownSchools.length === 0 && (
            <p className="mt-2 text-xs text-ink-faint">Школы не отмечены — можно готовить любые заклинания.</p>
          )}
        </section>

        <div className="mt-auto">
          <SectionNotes value={character.spellsNotes} onSave={logic.updateSpellsNotes} />
        </div>
      </aside>
    </div>
  );
};
