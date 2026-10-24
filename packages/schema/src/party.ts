import { z } from 'zod';
import { AssetIdSchema, EntityIdSchema, SettingSchema, type Setting } from './character';

/**
 * Parties: a master's table that players join with an invite code. Contracts of the party API and
 * the character summary the server keeps for party views (members never load each other's sheets).
 */

export const PARTY_LIMITS = {
  /** Master included. */
  members: 12,
  /** Heroes a player brings; the master may run several. */
  playerHeroes: 1,
  masterHeroes: 12,
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
  /** Initiative modifier. */
  initiative: number;
  conditions: string[];
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

export const CreatePartyRequestSchema = z.object({
  name: PartyNameSchema,
  description: DescriptionSchema.default(''),
  lore: LoreSchema.default(''),
  setting: SettingSchema,
  coverAssetId: AssetIdSchema.nullable().default(null),
});
export type CreatePartyRequest = z.input<typeof CreatePartyRequestSchema>;

export const UpdatePartyRequestSchema = z
  .object({
    name: PartyNameSchema,
    description: DescriptionSchema,
    lore: LoreSchema,
    setting: SettingSchema,
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
  initiativeBonus: z.number().int().min(-20).max(30),
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
  coverAssetId: string | null;
  role: PartyRole;
  masterName: string;
  memberCount: number;
  heroCount: number;
  inCombat: boolean;
  /** The viewer's characters in the party. */
  myCharacterIds: string[];
  updatedAt: string;
}

export interface PartyMemberDto {
  userId: string;
  displayName: string;
  role: PartyRole;
  joinedAt: string;
}

/** Hit points and armour: shown to the master and to the hero's owner only. */
export interface HeroVitalsDto {
  currentHP: number;
  maxHP: number;
  tempHP: number;
  armorClass: number;
  initiative: number;
  conditions: string[];
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
  createdAt: string;
  updatedAt: string;
}

export interface InvitePreviewDto {
  partyId: string;
  name: string;
  description: string;
  setting: Setting;
  coverAssetId: string | null;
  masterName: string;
  memberCount: number;
  /** The viewer is already at this table. */
  member: boolean;
}
