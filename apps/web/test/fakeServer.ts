import {
  CharacterSchema,
  ErrorCode,
  type CharacterRecordDto,
  type SyncResponse,
} from '@itd/schema';
import { ApiError, NetworkError, type api } from '../src/data/api/client';

interface Row {
  record: CharacterRecordDto;
  seq: number;
}

/**
 * In-memory stand-in for the characters API with the same contract: revisions, 409 with the current
 * record, tombstones, a change cursor. `offline` makes every call fail like a dropped connection.
 */
export class FakeServer {
  private rows = new Map<string, Row>();
  private seq = 0;
  offline = false;
  /** Called before a PUT resolves; lets a test change local state while the request is in flight. */
  beforePutResponse: (() => Promise<void>) | null = null;

  readonly characters: typeof api.characters = {
    pull: async (since) => {
      this.guard();
      const items = [...this.rows.values()]
        .filter((row) => row.seq > Number(since))
        .sort((a, b) => a.seq - b.seq);
      const response: SyncResponse = {
        items: items.map((row) => structuredClone(row.record)),
        cursor: String(items.at(-1)?.seq ?? since),
        hasMore: false,
      };
      return response;
    },
    get: async (id) => {
      this.guard();
      return structuredClone(this.require(id).record);
    },
    put: async (id, baseRevision, data) => {
      this.guard();
      const parsed = CharacterSchema.safeParse(data);
      if (!parsed.success) {
        throw new ApiError(400, ErrorCode.validation, 'invalid', { error: ErrorCode.validation, message: 'invalid' });
      }
      const current = this.rows.get(id);
      if (current && current.record.revision !== baseRevision) this.conflict(current);
      const now = new Date().toISOString();
      const record: CharacterRecordDto = {
        id,
        revision: (current?.record.revision ?? 0) + 1,
        createdAt: current?.record.createdAt ?? now,
        updatedAt: now,
        deletedAt: null,
        data: parsed.data,
      };
      this.rows.set(id, { record, seq: ++this.seq });
      await this.beforePutResponse?.();
      return structuredClone(record);
    },
    remove: async (id, baseRevision) => {
      this.guard();
      const current = this.require(id);
      if (current.record.deletedAt) return structuredClone(current.record);
      if (current.record.revision !== baseRevision) this.conflict(current);
      const record = {
        ...current.record,
        revision: current.record.revision + 1,
        deletedAt: new Date().toISOString(),
        data: null,
      };
      this.rows.set(id, { record, seq: ++this.seq });
      return structuredClone(record);
    },
    restore: async () => {
      throw new Error('not used');
    },
    deleted: async () => [],
    revisions: async () => [],
    revision: async () => {
      throw new Error('not used');
    },
  };

  stored(id: string): CharacterRecordDto | undefined {
    return this.rows.get(id)?.record;
  }

  private guard() {
    if (this.offline) throw new NetworkError(new Error('offline'));
  }

  private require(id: string): Row {
    const row = this.rows.get(id);
    if (!row) throw new ApiError(404, ErrorCode.notFound, 'not found', { error: ErrorCode.notFound, message: 'not found' });
    return row;
  }

  private conflict(current: Row): never {
    throw new ApiError(409, ErrorCode.conflict, 'conflict', {
      error: ErrorCode.conflict,
      message: 'conflict',
      current: structuredClone(current.record),
    });
  }
}
