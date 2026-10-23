import type { Character } from '@itd/schema';
import Dexie, { type EntityTable } from 'dexie';

/**
 * A character as this device holds it.
 *
 * `doc` is what the player sees and edits. `base`/`revision` are the last server version this device
 * knows: the common ancestor for a three-way merge and the revision a write is based on.
 */
export interface StoredCharacter {
  id: string;
  doc: Character;
  base: Character | null;
  /** Server revision of `base`; `null` until the character has been saved to the server once. */
  revision: number | null;
  /** 1 while `doc` (or a deletion) has not been accepted by the server. Numeric so it can be indexed. */
  dirty: 0 | 1;
  /** 1 when deleted on this device and the deletion is still waiting to be sent. */
  deleted: 0 | 1;
  /** Bumped on every local write; lets a finished upload tell whether newer edits arrived meanwhile. */
  localVersion: number;
  /** Server validation error of the last upload attempt; such a record is not retried until edited. */
  syncError: string | null;
  createdAt: number;
  updatedAt: number;
}

interface MetaEntry {
  key: string;
  value: string;
}

export class CharacterDatabase extends Dexie {
  characters!: EntityTable<StoredCharacter, 'id'>;
  meta!: EntityTable<MetaEntry, 'key'>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      characters: 'id, dirty, deleted, createdAt',
      meta: 'key',
    });
  }

  async getMeta(key: string): Promise<string | undefined> {
    return (await this.meta.get(key))?.value;
  }

  async setMeta(key: string, value: string): Promise<void> {
    await this.meta.put({ key, value });
  }
}

/** Each account gets its own database, so signing in as someone else never mixes data. */
export const databaseNameFor = (userId: string): string => `itd-user-${userId}`;

export const openCharacterDatabase = (userId: string): CharacterDatabase => new CharacterDatabase(databaseNameFor(userId));
