import type { HistoryEntry } from '@itd/schema';

/** A log line; the same message repeated in a row ("Получено: стрела (+1)" five times) is one line. */
export interface LogLine {
  /** The run's first entry in the order given. */
  entry: HistoryEntry;
  /** The run's last entry in the order given (the oldest one in a newest-first log). */
  last: HistoryEntry;
  count: number;
}

/** Folds runs of identical messages, keeping the order given. */
export function foldRepeats(entries: HistoryEntry[]): LogLine[] {
  const lines: LogLine[] = [];
  for (const entry of entries) {
    const previous = lines[lines.length - 1];
    if (previous && previous.entry.message === entry.message && previous.entry.type === entry.type) {
      previous.count += 1;
      previous.last = entry;
    } else {
      lines.push({ entry, last: entry, count: 1 });
    }
  }
  return lines;
}
