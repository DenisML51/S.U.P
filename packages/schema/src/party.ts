import { z } from 'zod';
import { AssetIdSchema, EntityIdSchema, RULESETS, SettingSchema, type Setting } from './character';

/**
 * Parties: a master's table that players join with an invite code. Contracts of the party API and
 * the character summary the server keeps for party views (members never load each other's sheets).
 */

/** A classic table: the master and four players. */
export const PARTY_LIMITS = {
  /** Master included. */
  members: 5,
  /** Heroes a player brings; the master may run several of their own. */
  playerHeroes: 1,
  masterHeroes: 4,
  npcs: 100,
  /** Parties one account can run as master. */
  mastered: 50,
} as const;

// ---------------------------------------------------------------------------------------------
// Character summary
// ---------------------------------------------------------------------------------------------

/** What a party needs to know about a hero; derived from the sheet whenever it is saved. */
export interface CharacterSummary {
  setting?: Setting;
  race: string;
  subrace?: string;
  class: string;
  subclass: string;
  level: number;
  /** Asset id of the portrait (or the full art when there is no portrait). */
  portrait?: string;
  currentHP: number;
  maxHP: number;
  tempHP: number;
  armorClass: number;
  /** Initiative modifier (D&D), or DEX for an investigator (Call of Cthulhu acts in DEX order). */
  initiative: number;
  conditions: string[];
  /** An investigator's numbers (Call of Cthulhu). */
  coc?: InvestigatorVitals;
}

/** What the table knows of an investigator beyond hit points. */
export interface InvestigatorVitals {
  sanity: number;
  maxSanity: number;
  magicPoints: number;
  luck: number;
  dex: number;
  dodge: number;
}

// ---------------------------------------------------------------------------------------------
// Invite codes
// ---------------------------------------------------------------------------------------------

/** No 0/O, 1/I/L: a code read aloud or from a screenshot is typed right the first time. */
export const INVITE_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const INVITE_CODE_LENGTH = 8;

/** Accepts any case and separators ("k7mq-2xpa", "K7MQ 2XPA"); yields the bare code. */
export const InviteCodeSchema = z
  .string()
  .max(32)
  .transform((value) => value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
  .pipe(
    z
      .string()
      .length(INVITE_CODE_LENGTH, 'Код состоит из 8 символов')
      .regex(new RegExp(`^[${INVITE_CODE_ALPHABET}]+$`), 'В коде есть недопустимые символы'),
  );

/** "K7MQ2XPA" → "K7MQ-2XPA". */
export const formatInviteCode = (code: string): string => `${code.slice(0, 4)}-${code.slice(4)}`;

// ---------------------------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------------------------

const PartyNameSchema = z.string().trim().min(1, 'Назовите партию').max(80, 'Название не длиннее 80 символов');
const DescriptionSchema = z.string().trim().max(2000, 'Описание не длиннее 2000 символов');
/** The party's chronicle: the long story in Markdown, read by everyone at the table. */
const LoreSchema = z.string().trim().max(50_000, 'Летопись не длиннее 50 000 символов');

/**
 * The rules a table plays by: a rules system, or the table's own (heroes without a preset build).
 * `null` on a table: any rules (tables made before the choice existed).
 */
export const PARTY_RULES = [...RULESETS, 'custom'] as const;
export const PartyRulesSchema = z.enum(PARTY_RULES);
export type PartyRules = z.infer<typeof PartyRulesSchema>;

/** The rules a hero is played by, in a table's terms. */
export const heroRules = (character: { build?: { ruleset: string } }): PartyRules =>
  (character.build?.ruleset as PartyRules | undefined) ?? 'custom';

export const CreatePartyRequestSchema = z.object({
  name: PartyNameSchema,
  description: DescriptionSchema.default(''),
  lore: LoreSchema.default(''),
  setting: SettingSchema,
  rules: PartyRulesSchema.nullable().default(null),
  coverAssetId: AssetIdSchema.nullable().default(null),
});
export type CreatePartyRequest = z.input<typeof CreatePartyRequestSchema>;

export const UpdatePartyRequestSchema = z
  .object({
    name: PartyNameSchema,
    description: DescriptionSchema,
    lore: LoreSchema,
    setting: SettingSchema,
    rules: PartyRulesSchema.nullable(),
    coverAssetId: AssetIdSchema.nullable(),
  })
  .partial();
export type UpdatePartyRequest = z.input<typeof UpdatePartyRequestSchema>;

export const PartyParamsSchema = z.object({ id: z.uuid() });
export const PartyMemberParamsSchema = z.object({ id: z.uuid(), userId: z.uuid() });
export const PartyHeroParamsSchema = z.object({ id: z.uuid(), heroId: z.uuid() });
export const PartyNpcParamsSchema = z.object({ id: z.uuid(), npcId: z.uuid() });
export const CombatantParamsSchema = z.object({ id: z.uuid(), combatantId: z.uuid() });
export const InviteParamsSchema = z.object({ code: InviteCodeSchema });

export const AddPartyHeroRequestSchema = z.object({ characterId: EntityIdSchema });
export type AddPartyHeroRequest = z.input<typeof AddPartyHeroRequestSchema>;

/** The master shows one of their own heroes to the players, or hides it again. */
export const UpdatePartyHeroRequestSchema = z.object({ hidden: z.boolean() });
export type UpdatePartyHeroRequest = z.input<typeof UpdatePartyHeroRequestSchema>;

const hp = z.number().int().min(-9999).max(9999);

/** Which side an NPC stands on: against the heroes, or with them. */
export const NPC_DISPOSITIONS = ['hostile', 'friendly'] as const;
export const NpcDispositionSchema = z.enum(NPC_DISPOSITIONS);
export type NpcDisposition = z.infer<typeof NpcDispositionSchema>;

const NpcFieldsSchema = z.object({
  name: z.string().trim().min(1, 'Назовите НПС').max(80),
  portraitAssetId: AssetIdSchema.nullable(),
  maxHP: z.number().int().min(1).max(9999),
  currentHP: hp,
  armorClass: z.number().int().min(0).max(99),
  /** Initiative modifier; at a Call of Cthulhu table the NPC's DEX (everyone acts in DEX order). */
  initiativeBonus: z.number().int().min(-20).max(200),
  disposition: NpcDispositionSchema,
});

/** A quick NPC; it starts unhurt unless current hit points are given. */
export const CreateNpcRequestSchema = NpcFieldsSchema.partial({ currentHP: true }).extend({
  portraitAssetId: AssetIdSchema.nullable().default(null),
  disposition: NpcDispositionSchema.default('hostile'),
});
export type CreateNpcRequest = z.input<typeof CreateNpcRequestSchema>;

export const UpdateNpcRequestSchema = NpcFieldsSchema.partial();
export type UpdateNpcRequest = z.input<typeof UpdateNpcRequestSchema>;

const ParticipantsSchema = z.object({
  heroIds: z.array(z.uuid()).max(PARTY_LIMITS.members * PARTY_LIMITS.masterHeroes).default([]),
  npcIds: z.array(z.uuid()).max(PARTY_LIMITS.npcs).default([]),
});

/** Who enters the fight; everyone rolls initiative before the first round. */
export const StartCombatRequestSchema = ParticipantsSchema.refine(
  (value) => value.heroIds.length + value.npcIds.length > 0,
  'В бою должен быть хотя бы один участник',
);
export type StartCombatRequest = z.input<typeof StartCombatRequestSchema>;

export const AddCombatantsRequestSchema = ParticipantsSchema;
export type AddCombatantsRequest = z.input<typeof AddCombatantsRequestSchema>;

export const InitiativeRequestSchema = z.object({ value: z.number().int().min(-50).max(99) });

/** `from` is the turn the caller saw: a second click (or a click from another device) is not a second turn. */
export const NextTurnRequestSchema = z.object({ from: z.uuid().nullable() });

// ---------------------------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------------------------

export type PartyRole = 'master' | 'player';

export interface PartyListItemDto {
  id: string;
  name: string;
  setting: Setting;
  rules: PartyRules | null;
  coverAssetId: string | null;
  role: PartyRole;
  masterName: string;
  memberCount: number;
  heroCount: number;
  inCombat: boolean;
  /** A session is running: players can sit down at the table. */
  inSession: boolean;
  /** The viewer's characters in the party. */
  myCharacterIds: string[];
  /** The same heroes as seats at the table, so a player can take one away while the table is closed. */
  myHeroes: { id: string; characterId: string }[];
  updatedAt: string;
}

export interface PartyMemberDto {
  userId: string;
  displayName: string;
  role: PartyRole;
  joinedAt: string;
  /** Has the app open right now (a live connection). */
  online: boolean;
}

/** Hit points and armour: shown to the master and to the hero's owner only. */
export interface HeroVitalsDto {
  currentHP: number;
  maxHP: number;
  tempHP: number;
  armorClass: number;
  initiative: number;
  conditions: string[];
  coc?: InvestigatorVitals;
}

export interface PartyHeroDto {
  id: string;
  ownerId: string;
  characterId: string;
  name: string;
  setting?: Setting;
  race: string;
  subrace?: string;
  class: string;
  subclass: string;
  level: number;
  portrait?: string;
  vitals: HeroVitalsDto | null;
  /**
   * A master's hero the players do not see yet (only the master gets hidden heroes; a fight shows
   * whoever is in it). Players' heroes are never hidden.
   */
  hidden: boolean;
}

/** Quick NPCs are the master's notes: never sent to players. */
export interface PartyNpcDto {
  id: string;
  name: string;
  portraitAssetId: string | null;
  currentHP: number;
  maxHP: number;
  armorClass: number;
  initiativeBonus: number;
  disposition: NpcDisposition;
}

export interface CombatantDto {
  id: string;
  kind: 'hero' | 'npc';
  /** Id of the party hero or the NPC. */
  refId: string;
  name: string;
  portrait: string | null;
  setting?: Setting;
  /** An NPC against the heroes; heroes and friendly NPCs are `false`. Everyone at the table sees the sides. */
  hostile: boolean;
  /** `null` until rolled. */
  initiative: number | null;
  /** The viewer acts for it: rolls its initiative, ends its turn. */
  controlled: boolean;
  /** Hit points and armour when the viewer may see them. */
  vitals: { currentHP: number; maxHP: number; tempHP: number; armorClass: number } | null;
}

export type CombatPhase = 'initiative' | 'active';

export interface CombatDto {
  phase: CombatPhase;
  round: number;
  currentCombatantId: string | null;
  /** In turn order: highest initiative first, those still to roll at the end. */
  combatants: CombatantDto[];
  startedAt: string;
}

/** A party as one member sees it. */
export interface PartyDto {
  id: string;
  name: string;
  description: string;
  /** Markdown. */
  lore: string;
  setting: Setting;
  rules: PartyRules | null;
  coverAssetId: string | null;
  role: PartyRole;
  masterId: string;
  /** Only the master sees the code. */
  inviteCode: string | null;
  members: PartyMemberDto[];
  heroes: PartyHeroDto[];
  /** `null` for players. */
  npcs: PartyNpcDto[] | null;
  combat: CombatDto | null;
  /** When the running session began; `null` between sessions (only the master sees the table then). */
  sessionStartedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvitePreviewDto {
  partyId: string;
  name: string;
  description: string;
  setting: Setting;
  rules: PartyRules | null;
  coverAssetId: string | null;
  masterName: string;
  memberCount: number;
  /** A session is running; the code opens the table only then. */
  inSession: boolean;
  /** The viewer is already at this table. */
  member: boolean;
}

// ---------------------------------------------------------------------------------------------
// Table talk
// ---------------------------------------------------------------------------------------------

export const PARTY_MESSAGES = {
  /** Characters in one message; keeps a realtime notification well under Postgres' NOTIFY limit. */
  length: 2000,
  /** Messages a party keeps; older ones are dropped as new ones come. */
  kept: 500,
  page: 50,
} as const;

/**
 * A message to the whole table, or a private one: the master writes to one player, a player can
 * write only to the master.
 */
export const SendMessageRequestSchema = z.object({
  body: z.string().trim().min(1, 'Пустое сообщение').max(PARTY_MESSAGES.length, 'Сообщение слишком длинное'),
  recipientId: z.uuid().nullable().default(null),
});
export type SendMessageRequest = z.input<typeof SendMessageRequestSchema>;

/** Older messages than the one given (by id), newest page first when absent. */
export const MessagesQuerySchema = z.object({
  before: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(PARTY_MESSAGES.page),
});

export interface PartyMessageDto {
  id: string;
  authorId: string;
  authorName: string;
  /** Set for a private message. */
  recipientId: string | null;
  recipientName: string | null;
  body: string;
  createdAt: string;
}

export interface PartyMessagesDto {
  /** Oldest first. */
  items: PartyMessageDto[];
  /** There are older messages to load. */
  hasMore: boolean;
}
