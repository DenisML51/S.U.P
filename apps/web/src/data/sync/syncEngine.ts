import { ErrorCode, type CharacterRecordDto, type ConflictResponse } from '@itd/schema';
import { ApiError, NetworkError, isUnauthorized, type api as apiEndpoints } from '../api/client';
import type { CharacterRepository } from '../local/characterRepository';
import type { StoredCharacter } from '../local/database';

export type SyncState = 'idle' | 'syncing' | 'offline' | 'error' | 'unauthorized';

export interface SyncStatus {
  state: SyncState;
  /** Local changes not yet accepted by the server. */
  pending: number;
  /** Characters the server refused to store; they stay local until edited. */
  rejected: { id: string; name: string; reason: string }[];
  lastSyncedAt: number | null;
  lastError: string | null;
}

type CharactersApi = typeof apiEndpoints.characters;

const PUSH_DEBOUNCE_MS = 800;
const MAX_CONFLICT_RETRIES = 3;
const RETRY_DELAYS_MS = [2_000, 5_000, 15_000, 30_000, 60_000];

/**
 * Reconciles the local repository with the server: uploads pending edits and deletions, pulls
 * changes since the last cursor, resolves conflicts by three-way merge.
 *
 * Runs are serialised within a tab and, via the Web Locks API, across tabs of the same account
 * (they share one IndexedDB database).
 */
export class SyncEngine {
  private status: SyncStatus = { state: 'idle', pending: 0, rejected: [], lastSyncedAt: null, lastError: null };
  private readonly listeners = new Set<(status: SyncStatus) => void>();
  private running: Promise<void> | null = null;
  private rerunRequested = false;
  private pushTimer: ReturnType<typeof setTimeout> | undefined;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private retryAttempt = 0;
  private stopped = false;

  constructor(
    private readonly repository: CharacterRepository,
    private readonly characters: CharactersApi,
    private readonly lockName: string,
  ) {}

  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => this.listeners.delete(listener);
  }

  getStatus(): SyncStatus {
    return this.status;
  }

  stop(): void {
    this.stopped = true;
    clearTimeout(this.pushTimer);
    clearTimeout(this.retryTimer);
    this.listeners.clear();
  }

  /** Upload soon: called after every local edit, coalescing bursts of edits into one request. */
  schedulePush(): void {
    if (this.stopped) return;
    void this.refreshPendingCount();
    clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => void this.sync(), PUSH_DEBOUNCE_MS);
  }

  /** Runs a full sync now, or once more after the current run finishes. */
  sync(): Promise<void> {
    if (this.stopped) return Promise.resolve();
    clearTimeout(this.pushTimer);
    if (this.running) {
      this.rerunRequested = true;
      return this.running;
    }
    this.running = this.runExclusive().finally(() => {
      this.running = null;
      if (this.rerunRequested && !this.stopped) {
        this.rerunRequested = false;
        void this.sync();
      }
    });
    return this.running;
  }

  private async runExclusive(): Promise<void> {
    const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
    if (locks) await locks.request(this.lockName, () => this.run());
    else await this.run();
  }

  private async run(): Promise<void> {
    this.update({ state: 'syncing' });
    try {
      await this.push();
      await this.pull();
      // Pulled changes may have been merged into pending edits: send the merge results.
      if ((await this.repository.pending()).length > 0) await this.push();

      this.retryAttempt = 0;
      clearTimeout(this.retryTimer);
      this.update({ state: 'idle', lastSyncedAt: Date.now(), lastError: null });
    } catch (error) {
      this.handleFailure(error);
    } finally {
      await this.refreshPendingCount();
    }
  }

  private async push(): Promise<void> {
    for (const row of await this.repository.pending()) {
      if (this.stopped) return;
      await this.pushOne(row);
    }
  }

  private async pushOne(initial: StoredCharacter): Promise<void> {
    let row: StoredCharacter | undefined = initial;
    for (let attempt = 0; row && row.dirty && row.syncError === null; attempt++) {
      try {
        const record = await this.upload(row);
        await this.repository.acknowledgeUpload(row.id, row.localVersion, record);
        return;
      } catch (error) {
        const conflict = conflictOf(error);
        if (conflict && attempt < MAX_CONFLICT_RETRIES) {
          await this.repository.resolveConflict(conflict.current);
          row = await this.repository.getStored(row.id);
          continue;
        }
        if (error instanceof ApiError && error.status === 404 && row.deleted) {
          // Deleting something the server no longer has: nothing left to do.
          await this.repository.acknowledgeUpload(row.id, row.localVersion, tombstoneOf(row));
          return;
        }
        if (error instanceof ApiError && error.status >= 400 && error.status < 500 && !isUnauthorized(error)) {
          await this.repository.rejectUpload(row.id, row.localVersion, error.message);
          return;
        }
        throw error;
      }
    }
  }

  private upload(row: StoredCharacter): Promise<CharacterRecordDto> {
    if (row.deleted) {
      // revision is non-null here: never-synced characters are dropped locally instead of queued.
      return this.characters.remove(row.id, row.revision!);
    }
    return this.characters.put(row.id, row.revision, row.doc);
  }

  private async pull(): Promise<void> {
    let cursor = await this.repository.getCursor();
    for (;;) {
      const page = await this.characters.pull(cursor);
      await this.repository.applyRemote(page.items);
      cursor = page.cursor;
      await this.repository.setCursor(cursor);
      if (!page.hasMore || this.stopped) return;
    }
  }

  private handleFailure(error: unknown): void {
    if (isUnauthorized(error)) {
      this.update({ state: 'unauthorized', lastError: 'Сессия истекла' });
      return;
    }
    const offline = error instanceof NetworkError;
    this.update({
      state: offline ? 'offline' : 'error',
      lastError: offline ? 'Нет связи с сервером' : error instanceof Error ? error.message : String(error),
    });
    const delay = RETRY_DELAYS_MS[Math.min(this.retryAttempt, RETRY_DELAYS_MS.length - 1)]!;
    this.retryAttempt += 1;
    clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => void this.sync(), delay);
  }

  private async refreshPendingCount(): Promise<void> {
    if (this.stopped) return;
    const [pending, rejected] = await Promise.all([this.repository.pendingCount(), this.repository.rejected()]);
    this.update({
      pending,
      rejected: rejected.map((row) => ({ id: row.id, name: row.doc.name, reason: row.syncError ?? '' })),
    });
  }

  private update(patch: Partial<SyncStatus>): void {
    this.status = { ...this.status, ...patch };
    for (const listener of this.listeners) listener(this.status);
  }
}

const conflictOf = (error: unknown): ConflictResponse | null =>
  error instanceof ApiError && error.status === 409 && error.code === ErrorCode.conflict
    ? (error.body as unknown as ConflictResponse)
    : null;

const tombstoneOf = (row: StoredCharacter): CharacterRecordDto => ({
  id: row.id,
  revision: row.revision ?? 0,
  createdAt: new Date(row.createdAt).toISOString(),
  updatedAt: new Date().toISOString(),
  deletedAt: new Date().toISOString(),
  data: null,
});
