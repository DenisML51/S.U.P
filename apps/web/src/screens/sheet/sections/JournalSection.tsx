import React, { useState } from 'react';
import type { Character, HistoryEntry, HistoryEntryType } from '@itd/schema';
import { Ledger, LedgerGroup } from '../../../ui/Ledger';
import { cx } from '../../../ui/primitives';

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

interface Line {
  entry: HistoryEntry;
  /** The same message repeated in a row ("Получено: стрела (+1)" clicked five times) reads as one line. */
  count: number;
}

/** Entries grouped by day, newest first, with repeats folded. */
const byDay = (entries: HistoryEntry[]) => {
  const groups: { key: string; title: string; lines: Line[] }[] = [];
  for (const entry of [...entries].sort((a, b) => b.timestamp - a.timestamp)) {
    const key = dayKey(entry.timestamp);
    let group = groups[groups.length - 1];
    if (group?.key !== key) {
      group = { key, title: dayTitle(entry.timestamp), lines: [] };
      groups.push(group);
    }
    const previous = group.lines[group.lines.length - 1];
    if (previous && previous.entry.message === entry.message && previous.entry.type === entry.type) previous.count += 1;
    else group.lines.push({ entry, count: 1 });
  }
  return groups;
};

/** The hero's chronicle: every roll, wound and find, as it happened at the table. */
export const JournalSection: React.FC<{ character: Character }> = ({ character }) => {
  const [filter, setFilter] = useState<Filter>('all');
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
            {group.lines.map(({ entry, count }) => (
              <li key={entry.id} className="ui-ledger__row flex items-baseline gap-4 py-2 text-sm">
                <span className="w-11 shrink-0 tabular-nums opacity-60">
                  {new Date(entry.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="mt-[0.45em] h-1.5 w-1.5 shrink-0 rotate-45" style={{ background: `rgb(${TONE[entry.type]})` }} aria-hidden />
                <span className="min-w-0">
                  {entry.message}
                  {count > 1 && <span className="ml-2 tabular-nums opacity-60">×{count}</span>}
                </span>
              </li>
            ))}
          </React.Fragment>
        ))}
        {groups.length === 0 && <li className="py-6 text-sm opacity-60">Записей пока нет: броски, раны и находки появятся здесь сами.</li>}
      </Ledger>
    </div>
  );
};
