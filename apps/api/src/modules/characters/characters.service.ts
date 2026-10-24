import {
  CHARACTER_SCHEMA_VERSION,
  CharacterSchema,
  ErrorCode,
  type Character,
  type CharacterRecordDto,
  type CharacterRevisionDto,
  type CharacterRevisionSummaryDto,
  type DeletedCharacterDto,
  type SyncResponse,
} from '@itd/schema';
import { summarizeCharacter } from '@itd/game-logic';
import { and, asc, desc, eq, gt, isNotNull, isNull, sql } from 'drizzle-orm';
import type { Database, Transaction } from '../../db/client';
import { characterRevisions, characters, users, type CharacterRow } from '../../db/schema';
import { AppError, notFound, unauthorized, validationError } from '../../lib/errors';
import type { ChangeNotifier } from '../realtime/hub';

const SYNC_PAGE_SIZE = 200;
/** A restore point is kept at most this often per character... */
const SNAPSHOT_INTERVAL_MS = 10 * 60 * 1000;
/** ...and this many of the latest restore points survive. */
const SNAPSHOTS_KEPT = 50;
const BACKFILL_BATCH = 100;

/** Told about a character's change once it is committed (parties refresh their views). */
export interface CharacterChangeListener {
  characterChanged(userId: string, characterId: string, change: 'saved' | 'deleted' | 'restored'): void;
}

const toRecordDto = (row: CharacterRow): CharacterRecordDto => ({
  id: row.id,
  revision: row.revision,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
  deletedAt: row.deletedAt?.toISOString() ?? null,
  data: row.deletedAt ? null : row.data,
});

const conflict = (current: CharacterRow) =>
  new AppError(409, ErrorCode.conflict, 'Персонаж был изменён на другом устройстве', {
    current: toRecordDto(current),
  });

/** Validates a document sent by a client; the server never stores a sheet that fails the schema. */
function parseDocument(id: string, data: unknown): Character {
  const declared = (data as { schemaVersion?: unknown } | null)?.schemaVersion;
  if (declared !== CHARACTER_SCHEMA_VERSION) {
    throw validationError(
      `Неподдерживаемая версия схемы персонажа: ${String(declared)}. Сервер ожидает v${CHARACTER_SCHEMA_VERSION}.`,
    );
  }
  const result = CharacterSchema.safeParse(data);
  if (!result.success) {
    throw validationError('Лист персонажа не прошёл проверку', {
      details: result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    });
  }
  if (result.data.id !== id) throw validationError('Идентификатор в документе не совпадает с адресом');
  return result.data;
}

export class CharactersService {
  constructor(
    private readonly db: Database,
    private readonly notifier: ChangeNotifier,
    private readonly listeners: readonly CharacterChangeListener[] = [],
  ) {}

  /** Every change (including deletions) after `since`, oldest first. */
  async pull(userId: string, since: bigint): Promise<SyncResponse> {
    const rows = await this.db
      .select()
      .from(characters)
      .where(and(eq(characters.userId, userId), gt(characters.changeSeq, since)))
      .orderBy(asc(characters.changeSeq))
      .limit(SYNC_PAGE_SIZE);

    const last = rows.at(-1);
    return {
      items: rows.map(toRecordDto),
      cursor: (last?.changeSeq ?? since).toString(),
      hasMore: rows.length === SYNC_PAGE_SIZE,
    };
  }

  async get(userId: string, id: string): Promise<CharacterRecordDto> {
    return toRecordDto(await this.findOrThrow(userId, id));
  }

  /**
   * Creates or updates a character. `baseRevision` must match the stored revision; otherwise the
   * request is rejected with 409 and the current record so the client can merge and retry. Writing
   * over a deleted character restores it: an edit wins over a deletion made elsewhere.
   */
  async put(
    userId: string,
    id: string,
    input: { baseRevision: number | null; data: unknown },
    originSessionId: string | null,
  ): Promise<CharacterRecordDto> {
    const document = parseDocument(id, input.data);

    const { row, cursor } = await this.db.transaction(async (tx) => {
      const cursor = await this.nextChangeSeq(tx, userId);
      const [current] = await tx
        .select()
        .from(characters)
        .where(and(eq(characters.userId, userId), eq(characters.id, id)))
        .for('update');

      if (current && input.baseRevision !== current.revision) throw conflict(current);

      const values = {
        revision: (current?.revision ?? 0) + 1,
        changeSeq: cursor,
        name: document.name,
        level: document.level,
        data: document,
        summary: summarizeCharacter(document),
        updatedAt: new Date(),
        deletedAt: null,
      };
      const [row] = current
        ? await tx
            .update(characters)
            .set(values)
            .where(and(eq(characters.userId, userId), eq(characters.id, id)))
            .returning()
        : await tx.insert(characters).values({ userId, id, ...values }).returning();

      await this.snapshot(tx, row!);
      return { row: row!, cursor };
    });

    this.notifier.publish([userId], { type: 'characters.changed', cursor: cursor.toString(), originSessionId });
    this.announce(userId, id, 'saved');
    return toRecordDto(row);
  }

  async remove(
    userId: string,
    id: string,
    baseRevision: number,
    originSessionId: string | null,
  ): Promise<CharacterRecordDto> {
    return this.changeDeletion(userId, id, originSessionId, 'deleted', (current) => {
      if (current.deletedAt) return null;
      if (current.revision !== baseRevision) throw conflict(current);
      return new Date();
    });
  }

  /** Brings a deleted character back from the trash. */
  async restore(userId: string, id: string, originSessionId: string | null): Promise<CharacterRecordDto> {
    return this.changeDeletion(userId, id, originSessionId, 'restored', (current) =>
      current.deletedAt ? undefined : null,
    );
  }

  async listDeleted(userId: string): Promise<DeletedCharacterDto[]> {
    const rows = await this.db
      .select({
        id: characters.id,
        name: characters.name,
        level: characters.level,
        revision: characters.revision,
        deletedAt: characters.deletedAt,
      })
      .from(characters)
      .where(and(eq(characters.userId, userId), isNotNull(characters.deletedAt)))
      .orderBy(desc(characters.deletedAt));
    return rows.map((row) => ({ ...row, deletedAt: row.deletedAt!.toISOString() }));
  }

  async listRevisions(userId: string, id: string): Promise<CharacterRevisionSummaryDto[]> {
    await this.findOrThrow(userId, id);
    const rows = await this.db
      .select({
        revision: characterRevisions.revision,
        savedAt: characterRevisions.savedAt,
        name: characterRevisions.name,
        level: characterRevisions.level,
      })
      .from(characterRevisions)
      .where(and(eq(characterRevisions.userId, userId), eq(characterRevisions.characterId, id)))
      .orderBy(desc(characterRevisions.revision));
    return rows.map((row) => ({ ...row, savedAt: row.savedAt.toISOString() }));
  }

  async getRevision(userId: string, id: string, revision: number): Promise<CharacterRevisionDto> {
    const [row] = await this.db
      .select()
      .from(characterRevisions)
      .where(
        and(
          eq(characterRevisions.userId, userId),
          eq(characterRevisions.characterId, id),
          eq(characterRevisions.revision, revision),
        ),
      );
    if (!row) throw notFound('Версия персонажа не найдена');
    return { revision: row.revision, savedAt: row.savedAt.toISOString(), data: row.data };
  }

  /**
   * Fills `summary` for rows saved before it existed. Idempotent; run at startup. Rows whose document
   * no longer passes the schema keep an empty summary and are skipped.
   */
  async backfillSummaries(): Promise<number> {
    let filled = 0;
    let after: { userId: string; id: string } | null = null;
    for (;;) {
      const rows: { userId: string; id: string; data: unknown }[] = await this.db
        .select({ userId: characters.userId, id: characters.id, data: characters.data })
        .from(characters)
        .where(
          and(
            isNull(characters.summary),
            after ? sql`(${characters.userId}, ${characters.id}) > (${after.userId}, ${after.id})` : undefined,
          ),
        )
        .orderBy(asc(characters.userId), asc(characters.id))
        .limit(BACKFILL_BATCH);
      for (const row of rows) {
        const parsed = CharacterSchema.safeParse(row.data);
        if (!parsed.success) continue;
        await this.db
          .update(characters)
          .set({ summary: summarizeCharacter(parsed.data) })
          .where(and(eq(characters.userId, row.userId), eq(characters.id, row.id)));
        filled += 1;
      }
      if (rows.length < BACKFILL_BATCH) return filled;
      after = rows.at(-1)!;
    }
  }

  private announce(userId: string, id: string, change: 'saved' | 'deleted' | 'restored') {
    for (const listener of this.listeners) listener.characterChanged(userId, id, change);
  }

  private async findOrThrow(userId: string, id: string): Promise<CharacterRow> {
    const [row] = await this.db
      .select()
      .from(characters)
      .where(and(eq(characters.userId, userId), eq(characters.id, id)));
    if (!row) throw notFound('Персонаж не найден');
    return row;
  }

  /**
   * Shared path of delete and restore. `decide` returns the new `deletedAt` (a date or `undefined`
   * for "not deleted"), or `null` when the record is already in the requested state.
   */
  private async changeDeletion(
    userId: string,
    id: string,
    originSessionId: string | null,
    change: 'deleted' | 'restored',
    decide: (current: CharacterRow) => Date | undefined | null,
  ): Promise<CharacterRecordDto> {
    const outcome = await this.db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(characters)
        .where(and(eq(characters.userId, userId), eq(characters.id, id)))
        .for('update');
      if (!current) throw notFound('Персонаж не найден');

      const deletedAt = decide(current);
      if (deletedAt === null) return { row: current, cursor: null };

      const cursor = await this.nextChangeSeq(tx, userId);
      const [row] = await tx
        .update(characters)
        .set({ revision: current.revision + 1, changeSeq: cursor, deletedAt: deletedAt ?? null, updatedAt: new Date() })
        .where(and(eq(characters.userId, userId), eq(characters.id, id)))
        .returning();
      return { row: row!, cursor };
    });

    if (outcome.cursor !== null) {
      this.notifier.publish([userId], {
        type: 'characters.changed',
        cursor: outcome.cursor.toString(),
        originSessionId,
      });
      this.announce(userId, id, change);
    }
    return toRecordDto(outcome.row);
  }

  /**
   * Takes the next value of the user's change counter. The UPDATE locks the user row until commit,
   * which serialises this user's writes and makes sequence numbers commit in increasing order.
   */
  private async nextChangeSeq(tx: Transaction, userId: string) {
    const [row] = await tx
      .update(users)
      .set({ changeCounter: sql`${users.changeCounter} + 1` })
      .where(eq(users.id, userId))
      .returning({ changeCounter: users.changeCounter });
    if (!row) throw unauthorized();
    return row.changeCounter;
  }

  /** Keeps a restore point at most every `SNAPSHOT_INTERVAL_MS`, pruning the oldest ones. */
  private async snapshot(tx: Transaction, row: CharacterRow) {
    const where = and(eq(characterRevisions.userId, row.userId), eq(characterRevisions.characterId, row.id));
    const [latest] = await tx
      .select({ savedAt: characterRevisions.savedAt })
      .from(characterRevisions)
      .where(where)
      .orderBy(desc(characterRevisions.revision))
      .limit(1);
    if (latest && Date.now() - latest.savedAt.getTime() < SNAPSHOT_INTERVAL_MS) return;

    await tx.insert(characterRevisions).values({
      userId: row.userId,
      characterId: row.id,
      revision: row.revision,
      name: row.name,
      level: row.level,
      data: row.data,
    });
    await tx.execute(sql`
      DELETE FROM ${characterRevisions}
      WHERE ${where} AND ${characterRevisions.revision} NOT IN (
        SELECT ${characterRevisions.revision} FROM ${characterRevisions}
        WHERE ${where}
        ORDER BY ${characterRevisions.revision} DESC
        LIMIT ${SNAPSHOTS_KEPT}
      )
    `);
  }
}
