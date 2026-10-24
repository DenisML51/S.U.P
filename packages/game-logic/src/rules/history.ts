import { HISTORY_LIMIT, type Character, type HistoryEntry, type HistoryEntryType } from '@itd/schema';
import { createEntityId } from './collections';

export interface HistoryEvent {
  message: string;
  type?: HistoryEntryType;
}

/**
 * Prepends an entry to the character's event log, keeping the newest `HISTORY_LIMIT` entries. An edit
 * applied more than once (on screen, then to the stored copy) passes the same `id` and `now` each time.
 */
export function appendHistory(
  character: Character,
  event: HistoryEvent,
  now: number = Date.now(),
  id: string = createEntityId('log'),
): Character {
  const entry: HistoryEntry = {
    id,
    timestamp: now,
    message: event.message,
    type: event.type ?? 'other',
  };
  return { ...character, history: [entry, ...character.history].slice(0, HISTORY_LIMIT) };
}
