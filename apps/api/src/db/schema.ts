import { sql } from 'drizzle-orm';
import {
  bigint,
  customType,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Stored lower-cased; uniqueness is case-insensitive by construction. */
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    displayName: text('display_name').notNull(),
    /**
     * Per-user change counter. Every character write increments it while holding the user row lock,
     * so change sequence numbers are committed in order and a sync cursor never skips a change.
     */
    changeCounter: bigint('change_counter', { mode: 'bigint' }).notNull().default(sql`0`),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('users_email_key').on(t.email)],
);

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** All tokens issued by rotation from one login share a family; reuse revokes the family. */
    familyId: uuid('family_id').notNull(),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revokedReason: text('revoked_reason', { enum: ['rotated', 'logout', 'reuse', 'password_change'] }),
    userAgent: text('user_agent'),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('refresh_tokens_token_hash_key').on(t.tokenHash),
    index('refresh_tokens_user_id_idx').on(t.userId),
    index('refresh_tokens_family_id_idx').on(t.familyId),
  ],
);

export const characters = pgTable(
  'characters',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    id: text('id').notNull(),
    revision: integer('revision').notNull(),
    changeSeq: bigint('change_seq', { mode: 'bigint' }).notNull(),
    /** Denormalised from `data` for listings that should not load whole documents. */
    name: text('name').notNull(),
    level: integer('level').notNull(),
    data: jsonb('data').notNull(),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    /** Soft delete: the row stays as a tombstone so other devices learn about the deletion. */
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.id] }), index('characters_user_change_seq_idx').on(t.userId, t.changeSeq)],
);

export const characterRevisions = pgTable(
  'character_revisions',
  {
    userId: uuid('user_id').notNull(),
    characterId: text('character_id').notNull(),
    revision: integer('revision').notNull(),
    name: text('name').notNull(),
    level: integer('level').notNull(),
    data: jsonb('data').notNull(),
    savedAt: timestamp('saved_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.characterId, t.revision] }),
    foreignKey({
      name: 'character_revisions_character_fk',
      columns: [t.userId, t.characterId],
      foreignColumns: [characters.userId, characters.id],
    }).onDelete('cascade'),
  ],
);

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => 'bytea' });

/**
 * Uploaded images (character art). Stored in Postgres so one backup covers everything; served by id
 * with immutable caching. Unreferenced assets are collected by `AssetsService.collectGarbage`.
 */
export const assets = pgTable(
  'assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    contentType: text('content_type').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    size: integer('size').notNull(),
    bytes: bytea('bytes').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('assets_user_id_idx').on(t.userId)],
);

export type UserRow = typeof users.$inferSelect;
export type RefreshTokenRow = typeof refreshTokens.$inferSelect;
export type CharacterRow = typeof characters.$inferSelect;
