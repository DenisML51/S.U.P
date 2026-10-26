import React, { useMemo, useState } from 'react';
import { ATTRIBUTES_LIST } from '@itd/game-logic';
import { choiceOptions, setPicks, type OpenChoice, type OptionView } from '@itd/game-logic/dnd';
import type { DndBuild } from '@itd/schema';
import { Dialog } from '../../ui/Dialog';
import { GameIcon, tileStyle, type IconKind } from '../../ui/GameIcon';
import { Prose } from '../../ui/Prose';
import { Section } from '../../ui/Section';
import { Button, IconButton, cx } from '../../ui/primitives';
import { IconClose, IconMinus, IconPlus } from '../../ui/icons';

/** Choices whose options are many or long to read open in a picker; the page shows the picks. */
const PICKER_SOURCES = new Set(['feats', 'spells', 'maneuvers', 'weapons', 'tools', 'catalog', 'forget']);
/** Inline options (lineages, ancestries) move to the picker past this many. */
const INLINE_OPTIONS = 6;

/** The picture a pick of each source shows when its content has none. */
const ICON_KIND: Record<string, IconKind> = {
  feats: 'ability',
  maneuvers: 'ability',
  catalog: 'ability',
  spells: 'spell',
  weapons: 'attack',
  tools: 'item',
  languages: 'item',
  options: 'ability',
};

const stripCount = (label: string) => label.replace(/\s*\(\d+\)$/, '');

const OptionIcon: React.FC<{ option: OptionView; kind: IconKind; size?: 'sm' | 'lg' }> = ({ option, kind, size = 'sm' }) => (
  <span
    className={cx('ui-hud-slot ui-hud-slot--tile shrink-0', size === 'lg' ? 'ui-hud-slot--large' : '!h-10 !w-10')}
    data-kind={kind === 'attack' ? 'attack' : kind === 'spell' ? 'spell' : kind === 'item' ? 'item' : 'ability'}
    style={tileStyle(option.color)}
  >
    <GameIcon name={option.iconName} kind={kind} size={size === 'lg' ? 40 : 26} className="ui-hud-slot__icon" />
  </span>
);

/** Cards of a choice: as many columns as fit, every card of a row as tall as the tallest. */
const CARD_GRID = 'grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-2';

/**
 * One choice of a level: the player picks `count` of its options. Short lists are picked in place;
 * long ones (feats, spells, weapons, tools) open a picker and the page shows the picks as cards.
 */
export const ChoiceField: React.FC<{
  build: DndBuild;
  level: number;
  open: OpenChoice;
  onChange: (build: DndBuild) => void;
}> = ({ build, level, open, onChange }) => {
  const options = useMemo(() => choiceOptions(build, level, open), [build, level, open]);
  const source = open.choice.options;
  const picks = open.picked;
  const set = (next: string[]) => onChange(setPicks(build, open.key, next));
  const toggle = (id: string) => {
    if (picks.includes(id)) set(picks.filter((p) => p !== id));
    else if (open.count === 1) set([id]);
    else if (picks.length < open.count) set([...picks, id]);
  };

  const label = stripCount(open.choice.label);
  // Where the choice comes from ("Высший эльф", "Посвящённый в магию"), unless the label says it already.
  const owner = open.owner.feature.name;
  const origin = owner.toLowerCase().includes(label.toLowerCase()) ? undefined : owner;
  const section = (children: React.ReactNode) => (
    <Section
      title={label}
      origin={origin}
      count={{ picked: picks.length, total: open.count, optional: open.choice.optional }}
      hint={open.choice.hint}
    >
      {children}
    </Section>
  );

  // Ability increases that may stack on one score: a stepper per score.
  if (source.from === 'attributes' && !source.distinct) {
    const allowed = source.list ?? ATTRIBUTES_LIST.map((a) => a.id);
    return section(
      <div className="grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-2">
        {ATTRIBUTES_LIST.filter((a) => allowed.includes(a.id)).map((attribute) => {
          const option = options.find((o) => o.id === attribute.id);
          const added = picks.filter((p) => p === attribute.id).length;
          return (
            <div key={attribute.id} className="ui-option items-center gap-1 py-3 text-center" aria-pressed={added > 0}>
              <span className="text-xs text-ink-muted">{attribute.name}</span>
              <span className="ui-display ui-numeric text-xl leading-none">{added > 0 ? `+${added * source.amount}` : '—'}</span>
              {option?.description && <span className="ui-option__meta">{option.description}</span>}
              <span className="mt-1 flex gap-1">
                <IconButton
                  label="Убрать"
                  size={26}
                  disabled={added === 0}
                  onClick={() => {
                    const index = picks.lastIndexOf(attribute.id);
                    set(picks.filter((_, i) => i !== index));
                  }}
                >
                  <IconMinus width={12} height={12} />
                </IconButton>
                <IconButton label="Добавить" size={26} disabled={picks.length >= open.count || !!option?.disabled} onClick={() => set([...picks, attribute.id])}>
                  <IconPlus width={12} height={12} />
                </IconButton>
              </span>
            </div>
          );
        })}
      </div>,
    );
  }

  const usesPicker = PICKER_SOURCES.has(source.from) || (source.from === 'options' && options.length > INLINE_OPTIONS);

  // Few options worth reading (a lineage, a style of the paladin): cards with their text.
  if (!usesPicker && source.from === 'options') {
    return section(
      <div className={CARD_GRID}>
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className="ui-option gap-1 px-4 py-3"
            aria-pressed={picks.includes(option.id)}
            disabled={!!option.disabled && !picks.includes(option.id)}
            title={option.disabled}
            onClick={() => toggle(option.id)}
          >
            <span className="text-sm font-medium">{option.name}</span>
            {option.description && <Prose className="text-[13px] leading-snug text-ink-muted">{option.description}</Prose>}
          </button>
        ))}
      </div>,
    );
  }

  // Short names (skills, languages, expertise): chips of one height.
  if (!usesPicker) {
    return section(
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className="ui-option ui-option--chip"
            aria-pressed={picks.includes(option.id)}
            disabled={!!option.disabled && !picks.includes(option.id)}
            title={option.disabled ?? option.description}
            onClick={() => toggle(option.id)}
          >
            {option.name}
          </button>
        ))}
      </div>,
    );
  }

  // Long lists: the picks as cards and one place to add more, the picker on demand.
  // Given-up picks of known spells look like spells; invocations and the like like abilities.
  const kind = source.from === 'forget' ? (source.pool.startsWith('known-') ? 'spell' : 'ability') : (ICON_KIND[source.from] ?? 'ability');
  return section(
    <PickList
      title={label}
      origin={origin}
      hint={open.choice.hint}
      options={options}
      picks={picks}
      count={open.count}
      kind={kind}
      onToggle={toggle}
    />,
  );
};

/**
 * Picks out of a long list: the picks as cards and one place to add more, the list itself in a
 * picker. A count of Infinity takes as many as the player likes (a Call of Cthulhu investigator's guns).
 */
export const PickList: React.FC<{
  title: string;
  origin?: string;
  hint?: string;
  options: OptionView[];
  picks: string[];
  count: number;
  kind: IconKind;
  onToggle: (id: string) => void;
  /** The cards tell what each pick does (two lines of its text), not just its name. */
  detailed?: boolean;
}> = ({ title, origin, hint, options, picks, count, kind, onToggle, detailed }) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const picked = picks.map((id) => options.find((o) => o.id === id) ?? { id, name: id, description: '' });
  const left = Math.max(0, count - picks.length);
  const add = !Number.isFinite(count)
    ? picks.length === 0 ? 'Выбрать' : 'Добавить ещё'
    : picks.length === 0
      ? count === 1 ? 'Выбрать' : `Выбрать ${count}`
      : `Выбрать ещё ${left}`;
  return (
    <>
      <div className={CARD_GRID}>
        {picked.map((option) => (
          <div key={option.id} className="ui-option flex-row items-center gap-3" aria-pressed>
            <OptionIcon option={option} kind={kind} />
            <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setPickerOpen(true)}>
              <span className="block truncate text-sm font-medium" title={option.name}>
                {option.name}
              </span>
              {detailed && option.description ? (
                <span className="mt-0.5 line-clamp-2 text-xs leading-snug text-ink-muted">{option.description}</span>
              ) : (
                option.meta && <span className="ui-option__meta block truncate">{option.meta}</span>
              )}
            </button>
            <IconButton label={`Убрать: ${option.name}`} size={26} onClick={() => onToggle(option.id)}>
              <IconClose width={14} height={14} />
            </IconButton>
          </div>
        ))}
        {left > 0 && (
          <button type="button" className="ui-option ui-option--empty flex-row items-center gap-3" onClick={() => setPickerOpen(true)}>
            <span className="grid h-10 w-10 shrink-0 place-items-center border border-dashed border-line text-ink-faint">
              <IconPlus width={16} height={16} />
            </span>
            <span className="text-sm text-ink-muted">{add}</span>
          </button>
        )}
      </div>
      <OptionPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={title}
        origin={origin}
        hint={hint}
        options={options}
        picks={picks}
        count={count}
        kind={kind}
        onToggle={onToggle}
      />
    </>
  );
};

/**
 * A picker for a long list: search and group filter over a list of options, the description of
 * the option in focus beside it. Picks apply at once; "Готово" only closes it.
 */
const OptionPicker: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  origin?: string;
  hint?: string;
  options: OptionView[];
  picks: string[];
  count: number;
  kind: IconKind;
  onToggle: (id: string) => void;
}> = ({ open, onClose, title, origin, hint, options, picks, count, kind, onToggle }) => {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(picks[0] ?? null);
  const groups = [...new Set(options.map((o) => o.group).filter((g): g is string => !!g))];
  const needle = query.trim().toLowerCase();
  const shown = options.filter((o) => (!group || o.group === group) && (!needle || o.name.toLowerCase().includes(needle)));
  const focused = options.find((o) => o.id === focus) ?? shown[0];
  const full = picks.length >= count;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      width="xl"
      title={title}
      eyebrow={[origin, Number.isFinite(count) ? `выбрано ${picks.length} из ${count}` : `выбрано ${picks.length}`].filter(Boolean).join(' · ')}
      subtitle={hint}
      footer={
        <Button variant="primary" onClick={onClose}>
          Готово
        </Button>
      }
    >
      <div className="grid h-[58vh] grid-cols-[minmax(0,24rem)_minmax(0,1fr)] gap-6">
        <div className="flex min-h-0 flex-col">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск" aria-label="Поиск" className="ui-input mb-2 h-9 text-sm" data-autofocus />
          {groups.length > 1 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {[null, ...groups].map((g) => (
                <button key={g ?? 'all'} type="button" className="ui-option px-2.5 py-1 text-xs" aria-pressed={group === g} onClick={() => setGroup(g)}>
                  {g ?? 'Все'}
                </button>
              ))}
            </div>
          )}
          <div className="ui-scroll min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
            {shown.map((option) => {
              const selected = picks.includes(option.id);
              const blocked = !selected && (!!option.disabled || (full && count > 1));
              return (
                <button
                  key={option.id}
                  type="button"
                  className="ui-option w-full flex-row items-center gap-3"
                  aria-pressed={selected}
                  data-focus={focused?.id === option.id || undefined}
                  disabled={!!option.disabled && !selected}
                  onClick={() => {
                    setFocus(option.id);
                    if (!blocked || count === 1) onToggle(option.id);
                  }}
                  onMouseEnter={() => setFocus(option.id)}
                >
                  <OptionIcon option={option} kind={kind} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{option.name}</span>
                    {(option.disabled || option.meta) && <span className="ui-option__meta block truncate">{option.disabled ?? option.meta}</span>}
                  </span>
                </button>
              );
            })}
            {shown.length === 0 && <p className="py-6 text-center text-sm text-ink-faint">Ничего не найдено</p>}
          </div>
        </div>
        <div className="ui-scroll min-h-0 overflow-y-auto border-l border-line/60 pl-6">
          {focused && (
            <>
              <div className="flex items-center gap-4">
                <OptionIcon option={focused} kind={kind} size="lg" />
                <div className="min-w-0">
                  <div className="ui-display text-2xl leading-tight text-ink">{focused.name}</div>
                  {focused.meta && <div className="mt-0.5 text-sm text-ink-faint">{focused.meta}</div>}
                </div>
              </div>
              <Prose className="mt-4 text-[15px] text-ink-muted">{focused.description || 'Без описания.'}</Prose>
              <div className="mt-5">
                {picks.includes(focused.id) ? (
                  <Button variant="secondary" onClick={() => onToggle(focused.id)}>
                    Убрать
                  </Button>
                ) : focused.disabled ? (
                  <span className="text-sm text-warning">{focused.disabled}</span>
                ) : (
                  <Button variant="primary" disabled={full && count > 1} onClick={() => onToggle(focused.id)}>
                    Выбрать
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Dialog>
  );
};
