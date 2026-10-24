import React, { useMemo, useState } from 'react';
import type { Character, HistoryEntry, HistoryEntryType } from '@itd/schema';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { Ledger, LedgerGroup } from '../../../ui/Ledger';
import { cx } from '../../../ui/primitives';
import { foldRepeats } from '../parts/history';

type Filter = 'all' | HistoryEntryType;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Всё' },
  { id: 'health', label: 'Здоровье' },
  { id: 'sanity', label: 'Рассудок' },
  { id: 'resource', label: 'Ресурсы' },
  { id: 'inventory', label: 'Вещи' },
  { id: 'exp', label: 'Опыт' },
  { id: 'other', label: 'Броски и прочее' },
];

const TONE: Record<HistoryEntryType, string> = {
  health: 'var(--c-hp)',
  sanity: 'var(--c-sanity)',
  resource: 'var(--c-accent)',
  inventory: 'var(--c-warning)',
  exp: 'var(--c-xp)',
  other: 'var(--c-paper-muted)',
};

const dayKey = (timestamp: number) => new Date(timestamp).toDateString();

const dayTitle = (timestamp: number) => {
  const day = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86_400_000);
  if (day.toDateString() === today.toDateString()) return 'Сегодня';
  if (day.toDateString() === yesterday.toDateString()) return 'Вчера';
  return day.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: day.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
};

/** Entries grouped by day, newest first, with repeats folded. */
const byDay = (entries: HistoryEntry[]) => {
  const groups: { key: string; title: string; entries: HistoryEntry[] }[] = [];
  for (const entry of [...entries].sort((a, b) => b.timestamp - a.timestamp)) {
    const key = dayKey(entry.timestamp);
    const last = groups[groups.length - 1];
    if (last?.key === key) last.entries.push(entry);
    else groups.push({ key, title: dayTitle(entry.timestamp), entries: [entry] });
  }
  return groups.map((group) => ({ ...group, lines: foldRepeats(group.entries) }));
};

/** The hero's chronicle: every roll, wound and find, as it happened at the table. */
export const JournalSection: React.FC<{ character: Character }> = ({ character }) => {
  const [filter, setFilter] = useState<Filter>('all');
  const undo = useCharacterStore((s) => s.undo);
  const undoIds = useCharacterStore((s) => s.undoable);
  const undoable = useMemo(() => new Set(undoIds), [undoIds]);
  const entries = character.history.filter((e) => filter === 'all' || e.type === filter);
  const groups = byDay(entries);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <nav className="flex gap-4" aria-label="Тип записей">
        {FILTERS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setFilter(option.id)}
            aria-current={filter === option.id}
            className={cx(
              'border-b pb-0.5 text-sm transition-colors',
              filter === option.id ? 'border-frame-bright text-ink' : 'border-transparent text-ink-faint hover:text-ink-muted',
            )}
          >
            {option.label}
          </button>
        ))}
      </nav>
      <Ledger log title="Журнал" aside={<span>{`записей: ${entries.length}`}</span>}>
        {groups.map((group) => (
          <React.Fragment key={group.key}>
            <LedgerGroup>{group.title}</LedgerGroup>
            {group.lines.map(({ entry, last, count }) => (
              <li key={entry.id} className="ui-ledger__row group flex items-baseline gap-4 py-2 text-sm">
                <span className="w-11 shrink-0 tabular-nums opacity-60">
                  {new Date(entry.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="mt-[0.45em] h-1.5 w-1.5 shrink-0 rotate-45" style={{ background: `rgb(${TONE[entry.type]})` }} aria-hidden />
                <span className="min-w-0 flex-1">
                  {entry.message}
                  {count > 1 && <span className="ml-2 tabular-nums opacity-60">×{count}</span>}
                </span>
                {undoable.has(last.id) && (
                  <button
                    type="button"
                    onClick={() => undo(last.id)}
                    title="Отменить эту запись и всё, что было после неё"
                    className="shrink-0 text-xs opacity-0 transition-opacity hover:underline focus-visible:opacity-100 group-hover:opacity-70"
                  >
                    отменить до сюда
                  </button>
                )}
              </li>
            ))}
          </React.Fragment>
        ))}
        {groups.length === 0 && <li className="py-6 text-sm opacity-60">Записей пока нет: броски, раны и находки появятся здесь сами.</li>}
      </Ledger>
    </div>
  );
};
