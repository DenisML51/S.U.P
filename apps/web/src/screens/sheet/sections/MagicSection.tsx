import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  SPELL_SCHOOLS,
  UNLIMITED_PREPARED,
  maxPrepared,
  preparationBlocker,
  preparedCount,
  setMaxPrepared,
  TOTAL_PREPARED,
  slotResourceFor,
  spellLevelName,
  toggleKnownSchool,
  togglePrepared,
} from '@itd/game-logic';
import type { Character, Spell } from '@itd/schema';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { ACTION_TYPES } from '../../../ui/actionTypes';
import { Ledger, LedgerBullet, LedgerGroup, LedgerRow, MetaLine, MetaValue } from '../../../ui/Ledger';
import { Select } from '../../../ui/forms';
import { Button, IconButton, Input, Panel, Tabs } from '../../../ui/primitives';
import { IconMinus, IconPlus } from '../../../ui/icons';
import { SectionNotes } from '../parts/EditableText';
import { SectionAside, SectionList } from '../SectionAside';
import { useSheetText } from '../useSheetText';
import { ConcentrationMark } from '../Concentration';
import { useActs } from '../useActs';
import { useSheetDialogs } from '../dialogs/context';
import { describeDamage, spellDamageParts } from '../parts/damage';
import { t } from '../../../i18n';

type LevelFilter = 'all' | number;

/**
 * Below this width the book would be squeezed by the column beside it: what it is cast with goes
 * under it instead. Above it the book gives up a little of its page width and the column stays.
 */
const NARROW = 960;

/** Whether the element is narrower than `width`, kept up as it resizes. */
function useNarrow<T extends HTMLElement>(width: number) {
  const ref = useRef<T>(null);
  const [narrow, setNarrow] = useState(false);
  useLayoutEffect(() => {
    const box = ref.current;
    if (!box) return;
    const measure = () => setNarrow(box.clientWidth < width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, [width]);
  return { ref, narrow };
}

/**
 * The circles as tabs while they all fit in a row, a dropdown once they don't. The tabs stay laid
 * out (unseen) to be measured at their full width.
 */
const LevelPicker: React.FC<{ levels: number[]; value: LevelFilter; onChange: (value: LevelFilter) => void }> = ({
  levels,
  value,
  onChange,
}) => {
  const box = useRef<HTMLDivElement>(null);
  const tabs = useRef<HTMLDivElement>(null);
  const [fits, setFits] = useState(true);
  useLayoutEffect(() => {
    const outer = box.current;
    const inner = tabs.current;
    if (!outer || !inner) return;
    const measure = () => setFits(inner.scrollWidth <= outer.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, [levels.length]);
  const options = (['all', ...levels] as LevelFilter[]).map((option) => ({
    value: String(option),
    label: option === 'all' ? 'Все круги' : option === 0 ? 'Заговоры' : `${option} круг`,
  }));
  const pick = (id: string) => onChange(id === 'all' ? 'all' : Number(id));
  return (
    <div ref={box} className="relative min-w-0">
      <div ref={tabs} className={fits ? 'w-max' : 'invisible absolute left-0 top-0 w-max'} aria-hidden={!fits || undefined}>
        <Tabs label="Круг заклинаний" value={String(value)} onChange={pick} items={options.map((o) => ({ id: o.value, label: o.label }))} />
      </div>
      {!fits && <Select value={String(value)} options={options} onChange={pick} className="!h-9 !w-48" />}
    </div>
  );
};

/** The ledger bullet of a spell doubles as its preparation switch: filled means prepared. */
const PrepareMark: React.FC<{ spell: Spell; blocker: string | null; onToggle: () => void }> = ({
  spell,
  blocker,
  onToggle,
}) => (
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
  // A class that prepares N spells of any level (paladin) sets one limit for all circles.
  const classLimit = level > 0 && character.maxPreparedSpells[TOTAL_PREPARED] !== undefined;
  // A preset caster who knows their spells (bard, warlock) never prepares them: no counter.
  const known = !!character.build && character.spells.filter((s) => s.level === level).every((s) => s.alwaysPrepared);
  return (
    <span className="flex items-center gap-4">
      {classLimit && (
        <span title="Сколько заклинаний всех кругов можно подготовить; задаётся классом и уровнем">
          подготовлено <span className="tabular-nums">{preparedCount(character, level)}</span> из{' '}
          <span className="tabular-nums">{limit}</span>
        </span>
      )}
      {level > 0 && !classLimit && !known && (
        <span className="flex items-center gap-1" title="Сколько заклинаний этого круга можно подготовить">
          подготовлено <span className="tabular-nums">{preparedCount(character, level)}</span> из
          <IconButton
            label="Уменьшить лимит"
            size={20}
            onClick={() => onLimit(unlimited ? preparedCount(character, level) : limit - 1)}
          >
            <IconMinus width={12} height={12} />
          </IconButton>
          <span className="tabular-nums">{unlimited ? '∞' : limit}</span>
          <IconButton
            label="Увеличить лимит"
            size={20}
            disabled={unlimited}
            onClick={() => onLimit(limit + 1)}
          >
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
const DifficultyEditor: React.FC<{
  name: string;
  value: number;
  onSave: (name: string, value: number) => void;
}> = ({ name, value, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [draftValue, setDraftValue] = useState(String(value));
  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="group block w-full text-left"
        title="Изменить"
      >
        <span className="ui-display ui-numeric text-4xl leading-none text-ink group-hover:text-frame-bright">
          {value}
        </span>
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
        <Input
          value={draftValue}
          onChange={(e) => setDraftValue(e.target.value)}
          inputMode="numeric"
          aria-label="Значение"
        />
        <Button type="submit" size="sm" variant="primary">
          Готово
        </Button>
      </div>
    </form>
  );
};

/** What the book is cast with: the difficulty, the studied schools, notes. `below` lays it out under the book. */
const CastingInfo: React.FC<{ character: Character; below?: boolean }> = ({ character, below }) => {
  const saveText = useSheetText();
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  const difficulty = (
    <Panel className="px-5 py-4">
      <DifficultyEditor
        name={character.spellcastingDifficultyName ?? 'СЛ заклинаний'}
        value={character.spellcastingDifficultyValue ?? 10}
        onSave={(spellcastingDifficultyName, spellcastingDifficultyValue) =>
          updateCharacter((doc) => ({ ...doc, spellcastingDifficultyName, spellcastingDifficultyValue }))
        }
      />
    </Panel>
  );
  // Studied schools are a homebrew limit; preset heroes prepare by their class rules.
  const schools = !character.build && (
    <section className="min-w-0">
      <div className="ui-label">Изучаемые школы</div>
      <div className="flex flex-wrap gap-1.5">
        {SPELL_SCHOOLS.map((school) => (
          <button
            key={school}
            type="button"
            className="ui-chip"
            aria-pressed={character.knownSchools.includes(school)}
            onClick={() => updateCharacter((doc) => toggleKnownSchool(doc, school))}
          >
            {school}
          </button>
        ))}
      </div>
      {character.knownSchools.length === 0 && (
        <p className="mt-2 text-xs text-ink-faint">Школы не отмечены — можно готовить любые заклинания.</p>
      )}
    </section>
  );
  const notes = <SectionNotes value={character.spellsNotes} onSave={saveText('spellsNotes')} />;
  if (below) {
    return (
      <div className="mt-4 flex shrink-0 flex-col gap-4">
        <div className="flex items-start gap-5">
          <div className="w-44 shrink-0">{difficulty}</div>
          {schools}
        </div>
        {notes}
      </div>
    );
  }
  return (
    <>
      {difficulty}
      {schools}
      <div className="mt-auto">{notes}</div>
    </>
  );
};

/** Spells: the whole spellbook, preparation for the day and casting, in one place. */
export const MagicSection: React.FC<{ character: Character }> = ({ character }) => {
  const updateCharacter = useCharacterStore((s) => s.updateCharacter);
  const acts = useActs();
  const { cast } = acts;
  const dialogs = useSheetDialogs();
  const [level, setLevel] = useState<LevelFilter>('all');
  const [preparedOnly, setPreparedOnly] = useState(false);
  const [query, setQuery] = useState('');
  const { ref, narrow } = useNarrow<HTMLDivElement>(NARROW);

  const levels = useMemo(
    () => [...new Set(character.spells.map((s) => s.level))].sort((a, b) => a - b),
    [character.spells],
  );
  const visible = character.spells.filter(
    (spell) =>
      (level === 'all' || spell.level === level) &&
      (!preparedOnly || spell.prepared) &&
      (!query.trim() || t(spell.name).toLowerCase().includes(query.trim().toLowerCase())),
  );
  const groups = levels
    .map((lvl) => ({ level: lvl, spells: visible.filter((s) => s.level === lvl) }))
    .filter((group) => group.spells.length > 0);

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
    <div ref={ref} className="flex h-full gap-8 max-lg:flex-col">
      <SectionList>
        <LevelPicker levels={levels} value={level} onChange={setLevel} />

        <Ledger
          title="Книга заклинаний"
          aside={
            <>
              {/* Only the prepared: the mark a prepared spell carries in the book. */}
              <button
                type="button"
                className="ui-chip ui-chip--icon"
                aria-pressed={preparedOnly}
                aria-label="Только подготовленные"
                title="Только подготовленные"
                onClick={() => setPreparedOnly(!preparedOnly)}
              >
                <LedgerBullet filled={preparedOnly} />
              </button>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск"
                className="!h-8 !w-36 text-sm"
              />
            </>
          }
          className="min-h-0"
          addLabel="Добавить заклинание"
          onAdd={() => dialogs.open({ kind: 'spell' })}
        >
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
                const parts = spellDamageParts(character, spell);
                return (
                  <LedgerRow
                    key={spell.id}
                    dim={!spell.prepared}
                    active={spell.prepared}
                    leading={
                      <PrepareMark
                        spell={spell}
                        blocker={preparationBlocker(character, spell)}
                        onToggle={() => updateCharacter((doc) => togglePrepared(doc, spell.id))}
                      />
                    }
                    title={
                      <>
                        {spell.name}
                        {spell.concentration && <ConcentrationMark />}
                      </>
                    }
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
                    selected={dialogs.isSelected('spell', spell.id)}
                    onOpen={() => dialogs.openEntry('spell', spell.id)}
                    action={
                      (spell.prepared || (spell.ritual && character.ritualsFromBook)) && (
                        <span className="flex gap-1.5">
                          {/* A ritual takes no slot; a Wizard's comes straight from the book. */}
                          {spell.ritual && (
                            <Button size="row" variant="ghost" onClick={() => acts.ritual(spell)} title="Без ячейки, на 10 минут дольше">
                              Ритуал
                            </Button>
                          )}
                          {spell.prepared && (
                            <Button size="row" variant="secondary" onClick={() => cast(spell)}>
                              Сотворить
                            </Button>
                          )}
                        </span>
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
        {narrow && <CastingInfo character={character} below />}
      </SectionList>

      {/* What the book is cast with sits beside it, or under it when the room is narrow. */}
      <SectionAside width={narrow ? 0 : 270}>{!narrow && <CastingInfo character={character} />}</SectionAside>
    </div>
  );
};
