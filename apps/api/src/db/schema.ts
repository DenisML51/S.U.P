import { sql } from 'drizzle-orm';
import type { CharacterSummary, NpcCocStats } from '@itd/schema';
import {
  type AnyPgColumn,
  bigint,
  boolean,
  check,
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

/**
 * Who has the app open: a user is online while one of their realtime sockets is (renewed on every
 * ping, so a crashed API process lets it lapse). Kept apart from `users`, whose row is the lock of
 * character writes.
 */
export const userPresence = pgTable('user_presence', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  onlineUntil: timestamp('online_until', { withTimezone: true }).notNull(),
});

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
    /** Derived from `data` on every write (see `summarizeCharacter`): what party views read instead of whole sheets. */
    summary: jsonb('summary').$type<CharacterSummary>(),
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

// ---------------------------------------------------------------------------------------------
// Parties
// ---------------------------------------------------------------------------------------------

/**
 * A master's table. Every change to a party, its heroes, NPCs or fight runs while holding this row's
 * lock, so concurrent clicks from several devices apply one after another.
 */
export const parties = pgTable(
  'parties',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    masterId: uuid('master_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    /** The party's chronicle, Markdown. */
    lore: text('lore').notNull().default(''),
    setting: text('setting').notNull(),
    /** `dnd2024`, `coc7` or `custom`; `null`: any rules (tables made before the choice). */
    rules: text('rules'),
    coverAssetId: uuid('cover_asset_id').references(() => assets.id, { onDelete: 'set null' }),
    inviteCode: text('invite_code').notNull(),
    /** The running session's start; `null` between sessions, when the table is closed to players. */
    sessionStartedAt: timestamp('session_started_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('parties_invite_code_key').on(t.inviteCode), index('parties_master_id_idx').on(t.masterId)],
);

export const partyMembers = pgTable(
  'party_members',
  {
    partyId: uuid('party_id')
      .notNull()
      .references(() => parties.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['master', 'player'] }).notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.partyId, t.userId] }), index('party_members_user_id_idx').on(t.userId)],
);

/** A member's character at the table. A character sits at one table at a time. */
export const partyHeroes = pgTable(
  'party_heroes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    partyId: uuid('party_id').notNull(),
    userId: uuid('user_id').notNull(),
    characterId: text('character_id').notNull(),
    /** A master's hero kept from the players until the master shows it. */
    hidden: boolean('hidden').notNull().default(false),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('party_heroes_character_key').on(t.userId, t.characterId),
    index('party_heroes_party_id_idx').on(t.partyId),
    // Leaving the table takes the member's heroes with them; so does deleting the character for good.
    foreignKey({
      name: 'party_heroes_member_fk',
      columns: [t.partyId, t.userId],
      foreignColumns: [partyMembers.partyId, partyMembers.userId],
    }).onDelete('cascade'),
    foreignKey({
      name: 'party_heroes_character_fk',
      columns: [t.userId, t.characterId],
      foreignColumns: [characters.userId, characters.id],
    }).onDelete('cascade'),
  ],
);

export const partyNpcs = pgTable(
  'party_npcs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    partyId: uuid('party_id')
      .notNull()
      .references(() => parties.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    portraitAssetId: uuid('portrait_asset_id').references(() => assets.id, { onDelete: 'set null' }),
    maxHp: integer('max_hp').notNull(),
    currentHp: integer('current_hp').notNull(),
    armorClass: integer('armor_class').notNull(),
    initiativeBonus: integer('initiative_bonus').notNull(),
    disposition: text('disposition', { enum: ['hostile', 'friendly'] }).notNull().default('hostile'),
    /** Call of Cthulhu numbers (armour, build, attacks…); `null` for other NPCs. */
    coc: jsonb('coc').$type<NpcCocStats>(),
    createdAt: createdAt(),
  },
  (t) => [index('party_npcs_party_id_idx').on(t.partyId)],
);

/** The party's fight, while one goes on. */
export const partyCombats = pgTable('party_combats', {
  partyId: uuid('party_id')
    .primaryKey()
    .references(() => parties.id, { onDelete: 'cascade' }),
  phase: text('phase', { enum: ['initiative', 'active'] }).notNull(),
  round: integer('round').notNull().default(0),
  currentCombatantId: uuid('current_combatant_id').references((): AnyPgColumn => partyCombatants.id, {
    onDelete: 'set null',
  }),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  /**
   * The rules the fight goes by, fixed when it starts (`PartyDto.combatRules`; `d20` for `null`), so a
   * hero seated mid-fight does not change them. `null`: a fight started before they were kept.
   */
  rules: text('rules'),
});

/** One side of the fight: a party hero or an NPC, gone with them. */
export const partyCombatants = pgTable(
  'party_combatants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    partyId: uuid('party_id')
      .notNull()
      .references(() => partyCombats.partyId, { onDelete: 'cascade' }),
    heroId: uuid('hero_id').references(() => partyHeroes.id, { onDelete: 'cascade' }),
    npcId: uuid('npc_id').references(() => partyNpcs.id, { onDelete: 'cascade' }),
    initiative: integer('initiative'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('party_combatants_party_id_idx').on(t.partyId),
    uniqueIndex('party_combatants_hero_key').on(t.heroId),
    uniqueIndex('party_combatants_npc_key').on(t.npcId),
    check('party_combatants_one_side', sql`(${t.heroId} IS NULL) <> (${t.npcId} IS NULL)`),
  ],
);

/** Table talk: to everyone (`recipient_id` null) or private between the master and one player. */
export const partyMessages = pgTable(
  'party_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    partyId: uuid('party_id')
      .notNull()
      .references(() => parties.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    recipientId: uuid('recipient_id').references(() => users.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('party_messages_party_created_idx').on(t.partyId, t.createdAt, t.id)],
);

export type UserRow = typeof users.$inferSelect;
export type RefreshTokenRow = typeof refreshTokens.$inferSelect;
export type CharacterRow = typeof characters.$inferSelect;
export type PartyRow = typeof parties.$inferSelect;
export type PartyNpcRow = typeof partyNpcs.$inferSelect;
