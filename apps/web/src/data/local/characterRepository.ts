import {
  CharacterSchema,
  mergeCharacters,
  migrateCharacter,
  type Character,
  type CharacterRecordDto,
} from '@itd/schema';
import { upgradeCharacter } from '@itd/game-logic';
import type { CharacterDatabase, StoredCharacter } from './database';

export type ChangeSource = 'local' | 'remote' | 'other-tab';

export interface RepositoryChange {
  ids: string[];
  source: ChangeSource;
}

type Listener = (change: RepositoryChange) => void;

/**
 * Stored documents were valid when written, but the schema and the rules may have moved on since
 * (a retired setting, a new default, a value the rules now bound). Reads and edits pass them through
 * both, so the UI and every edit see the current shape; a document that no longer parses is shown
 * as stored rather than hidden.
 */
export const normalizeCharacter = (doc: Character): Character => {
  const parsed = CharacterSchema.safeParse(doc);
  return parsed.success ? upgradeCharacter(parsed.data) : doc;
};

/**
 * The device's copy of the player's characters. All reads of the UI and all writes go through here;
 * the sync engine reconciles it with the server in the background.
 *
 * Changes are announced to subscribers in this tab and, through a BroadcastChannel, to other tabs
 * of the same account, which share the database.
 */
export class CharacterRepository {
  private readonly listeners = new Set<Listener>();
  private readonly channel: BroadcastChannel | null;

  constructor(
    private readonly db: CharacterDatabase,
    channelName: string,
  ) {
    this.channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(channelName);
    if (this.channel) {
      this.channel.onmessage = (event: MessageEvent<{ ids: string[] }>) =>
        this.notify({ ids: event.data.ids, source: 'other-tab' });
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  close(): void {
    this.channel?.close();
    this.listeners.clear();
    this.db.close();
  }

  // ------------------------------------------------------------------------------------------
  // Reads
  // ------------------------------------------------------------------------------------------

  /** Characters that are not deleted, oldest first (the order they were created in). */
  async list(): Promise<Character[]> {
    const rows = await this.db.characters.orderBy('createdAt').toArray();
    return rows.filter((row) => !row.deleted).map((row) => normalizeCharacter(row.doc));
  }

  async get(id: string): Promise<Character | undefined> {
    const row = await this.db.characters.get(id);
    return row && !row.deleted ? normalizeCharacter(row.doc) : undefined;
  }

  async has(id: string): Promise<boolean> {
    return (await this.db.characters.get(id)) !== undefined;
  }

  // ------------------------------------------------------------------------------------------
  // Local edits
  // ------------------------------------------------------------------------------------------

  async create(doc: Character): Promise<void> {
    const now = Date.now();
    await this.db.characters.add({
      id: doc.id,
      doc,
      base: null,
      revision: null,
      dirty: 1,
      deleted: 0,
      localVersion: 1,
      syncError: null,
      createdAt: now,
      updatedAt: now,
    });
    this.emit([doc.id], 'local');
  }

  /**
   * Applies an edit to the latest stored version inside one transaction, so an edit never
   * overwrites a remote change merged in since the UI last read the character. Returns the stored
   * result, or `undefined` if the character no longer exists.
   */
  async update(id: string, edit: (doc: Character) => Character): Promise<Character | undefined> {
    const result = await this.db.transaction('rw', this.db.characters, async () => {
      const row = await this.db.characters.get(id);
      if (!row || row.deleted) return undefined;
      const doc = CharacterSchema.parse(edit(normalizeCharacter(row.doc)));
      await this.db.characters.update(id, {
        doc,
        dirty: 1,
        localVersion: row.localVersion + 1,
        syncError: null,
        updatedAt: Date.now(),
      });
      return doc;
    });
    if (result) this.emit([id], 'local');
    return result;
  }

  async save(doc: Character): Promise<void> {
    await this.db.transaction('rw', this.db.characters, async () => {
      const row = await this.db.characters.get(doc.id);
      if (!row) {
        const now = Date.now();
        await this.db.characters.add({
          id: doc.id,
          doc,
          base: null,
          revision: null,
          dirty: 1,
          deleted: 0,
          localVersion: 1,
          syncError: null,
          createdAt: now,
          updatedAt: now,
        });
        return;
      }
      await this.db.characters.update(doc.id, {
        doc,
        dirty: 1,
        deleted: 0,
        localVersion: row.localVersion + 1,
        syncError: null,
        updatedAt: Date.now(),
      });
    });
    this.emit([doc.id], 'local');
  }

  /** Deletes a character. One the server never saw is simply dropped; otherwise the deletion is queued. */
  async remove(id: string): Promise<void> {
    await this.db.transaction('rw', this.db.characters, async () => {
      const row = await this.db.characters.get(id);
      if (!row) return;
      if (row.revision === null) {
        await this.db.characters.delete(id);
        return;
      }
      await this.db.characters.update(id, {
        deleted: 1,
        dirty: 1,
        localVersion: row.localVersion + 1,
        syncError: null,
        updatedAt: Date.now(),
      });
    });
    this.emit([id], 'local');
  }

  // ------------------------------------------------------------------------------------------
  // Sync support
  // ------------------------------------------------------------------------------------------

  /** Records waiting to be sent, excluding those the server rejected until they are edited again. */
  async pending(): Promise<StoredCharacter[]> {
    const rows = await this.db.characters.where('dirty').equals(1).toArray();
    return rows.filter((row) => row.syncError === null);
  }

  async pendingCount(): Promise<number> {
    return this.db.characters.where('dirty').equals(1).count();
  }

  async rejected(): Promise<StoredCharacter[]> {
    return (await this.db.characters.where('dirty').equals(1).toArray()).filter((row) => row.syncError !== null);
  }

  async getStored(id: string): Promise<StoredCharacter | undefined> {
    return this.db.characters.get(id);
  }

  /**
   * The server accepted an upload of version `sentVersion`. The row is clean unless the player
   * edited it again while the request was in flight.
   */
  async acknowledgeUpload(id: string, sentVersion: number, record: CharacterRecordDto): Promise<void> {
    let changed = false;
    await this.db.transaction('rw', this.db.characters, async () => {
      const row = await this.db.characters.get(id);
      if (!row) return;
      if (record.deletedAt) {
        if (row.localVersion === sentVersion) {
          await this.db.characters.delete(id);
        } else {
          await this.db.characters.update(id, { revision: record.revision });
        }
        return;
      }
      const serverDoc = migrateCharacter(record.data);
      if (row.localVersion === sentVersion) {
        changed = JSON.stringify(row.doc) !== JSON.stringify(serverDoc);
        await this.db.characters.update(id, { doc: serverDoc, base: serverDoc, revision: record.revision, dirty: 0 });
      } else {
        await this.db.characters.update(id, { base: serverDoc, revision: record.revision });
      }
    });
    if (changed) this.emit([id], 'remote');
  }

  /** The server refused the document (validation). Keep it locally and stop retrying until it changes. */
  async rejectUpload(id: string, sentVersion: number, reason: string): Promise<void> {
    await this.db.transaction('rw', this.db.characters, async () => {
      const row = await this.db.characters.get(id);
      if (row && row.localVersion === sentVersion) await this.db.characters.update(id, { syncError: reason });
    });
  }

  /**
   * Folds a server record into the local copy:
   * - nothing local → take it;
   * - local copy clean → overwrite;
   * - local edits pending → three-way merge, keep the result pending so it is uploaded;
   * - remote deletion → drop the local copy, unless it has edits (an edit outlives a deletion);
   * - local deletion pending and a remote edit → the edit wins, the deletion is cancelled.
   */
  async applyRemote(records: CharacterRecordDto[]): Promise<string[]> {
    const changedIds: string[] = [];

    await this.db.transaction('rw', this.db.characters, async () => {
      for (const record of records) {
        const row = await this.db.characters.get(record.id);

        if (record.deletedAt) {
          if (!row) continue;
          if (row.dirty && !row.deleted) {
            // Re-upload over the tombstone resurrects the character on the server.
            await this.db.characters.update(row.id, { revision: record.revision });
          } else {
            await this.db.characters.delete(row.id);
            changedIds.push(row.id);
          }
          continue;
        }

        const remote = migrateCharacter(record.data);
        const createdAt = Date.parse(record.createdAt) || Date.now();

        if (!row) {
          await this.db.characters.add({
            id: record.id,
            doc: remote,
            base: remote,
            revision: record.revision,
            dirty: 0,
            deleted: 0,
            localVersion: 1,
            syncError: null,
            createdAt,
            updatedAt: Date.now(),
          });
          changedIds.push(record.id);
          continue;
        }

        if (row.revision !== null && record.revision <= row.revision) continue;

        if (!row.dirty || row.deleted) {
          await this.db.characters.update(row.id, {
            doc: remote,
            base: remote,
            revision: record.revision,
            dirty: 0,
            deleted: 0,
            syncError: null,
          });
        } else {
          const { merged } = mergeCharacters(row.base, row.doc, remote);
          await this.db.characters.update(row.id, {
            doc: merged,
            base: remote,
            revision: record.revision,
            localVersion: row.localVersion + 1,
            syncError: null,
          });
        }
        changedIds.push(row.id);
      }
    });

    if (changedIds.length > 0) this.emit(changedIds, 'remote');
    return changedIds;
  }

  /**
   * Resolves a rejected write (409) against the server's current record by merging, so the next
   * upload is based on the server's revision.
   */
  async resolveConflict(current: CharacterRecordDto): Promise<void> {
    await this.applyRemote([current]);
  }

  async getCursor(): Promise<string> {
    return (await this.db.getMeta('cursor')) ?? '0';
  }

  async setCursor(cursor: string): Promise<void> {
    await this.db.setMeta('cursor', cursor);
  }

  private emit(ids: string[], source: 'local' | 'remote'): void {
    this.notify({ ids, source });
    this.channel?.postMessage({ ids });
  }

  private notify(change: RepositoryChange): void {
    for (const listener of this.listeners) listener(change);
  }
}
