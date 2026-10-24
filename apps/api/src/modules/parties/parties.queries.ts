import type {
  CharacterSummary,
  CombatantDto,
  CombatDto,
  InvitePreviewDto,
  PartyDto,
  PartyHeroDto,
  PartyListItemDto,
  PartyNpcDto,
  PartyRole,
  Setting,
} from '@itd/schema';
import { and, asc, count, desc, eq, isNull, sql } from 'drizzle-orm';
import type { Database, Transaction } from '../../db/client';
import {
  characters,
  parties,
  partyCombatants,
  partyCombats,
  partyHeroes,
  partyMembers,
  partyNpcs,
  users,
  type PartyNpcRow,
} from '../../db/schema';
import { sessionClosed } from '../../lib/errors';
import { CODE_WAITS, partyNotFound } from './partyAccess';
import { turnOrder, type TurnEntry } from './turnOrder';

type Executor = Database | Transaction;

/** Sheets saved before summaries existed read as this until the startup backfill reaches them. */
const EMPTY_SUMMARY: CharacterSummary = {
  race: '',
  class: '',
  subclass: '',
  level: 1,
  currentHP: 0,
  maxHP: 0,
  tempHP: 0,
  armorClass: 10,
  initiative: 0,
  conditions: [],
};

interface HeroRow {
  id: string;
  userId: string;
  characterId: string;
  name: string;
  hidden: boolean;
  summary: CharacterSummary | null;
}

/** A party hero whose character still exists, with what the party shows of it. */
const heroesOf = (db: Executor, partyId: string): Promise<HeroRow[]> =>
  db
    .select({
      id: partyHeroes.id,
      userId: partyHeroes.userId,
      characterId: partyHeroes.characterId,
      name: characters.name,
      hidden: partyHeroes.hidden,
      summary: characters.summary,
    })
    .from(partyHeroes)
    .innerJoin(
      characters,
      and(eq(characters.userId, partyHeroes.userId), eq(characters.id, partyHeroes.characterId)),
    )
    .where(and(eq(partyHeroes.partyId, partyId), isNull(characters.deletedAt)))
    .orderBy(asc(partyHeroes.addedAt));

export interface CombatantEntry extends TurnEntry {
  heroId: string | null;
  npcId: string | null;
  /** Owner of the hero; `null` for NPCs (the master's). */
  ownerId: string | null;
}

/** The fight's combatants with what orders them; used by the view and by turn changes. */
export async function combatantsOf(db: Executor, partyId: string): Promise<CombatantEntry[]> {
  const rows = await db
    .select({
      id: partyCombatants.id,
      heroId: partyCombatants.heroId,
      npcId: partyCombatants.npcId,
      initiative: partyCombatants.initiative,
      joinedAt: partyCombatants.joinedAt,
      ownerId: partyHeroes.userId,
      heroInitiative: sql<number | null>`(${characters.summary} ->> 'initiative')::int`,
      npcBonus: partyNpcs.initiativeBonus,
    })
    .from(partyCombatants)
    .leftJoin(partyHeroes, eq(partyHeroes.id, partyCombatants.heroId))
    .leftJoin(
      characters,
      and(eq(characters.userId, partyHeroes.userId), eq(characters.id, partyHeroes.characterId)),
    )
    .leftJoin(partyNpcs, eq(partyNpcs.id, partyCombatants.npcId))
    .where(eq(partyCombatants.partyId, partyId));
  return rows.map(({ heroInitiative, npcBonus, ...row }) => ({
    ...row,
    bonus: heroInitiative ?? npcBonus ?? 0,
  }));
}

const npcDto = (row: PartyNpcRow): PartyNpcDto => ({
  id: row.id,
  name: row.name,
  portraitAssetId: row.portraitAssetId,
  currentHP: row.currentHp,
  maxHP: row.maxHp,
  armorClass: row.armorClass,
  initiativeBonus: row.initiativeBonus,
  disposition: row.disposition,
});

/** Read side of parties: every view is tailored to who is looking. */
export class PartyQueries {
  constructor(private readonly db: Database) {}

  async list(userId: string): Promise<PartyListItemDto[]> {
    const memberCount = this.db
      .select({ value: count() })
      .from(partyMembers)
      .where(eq(partyMembers.partyId, parties.id));
    const heroCount = this.db
      .select({ value: count() })
      .from(partyHeroes)
      .innerJoin(
        characters,
        and(eq(characters.userId, partyHeroes.userId), eq(characters.id, partyHeroes.characterId)),
      )
      .where(
        and(
          eq(partyHeroes.partyId, parties.id),
          isNull(characters.deletedAt),
          // Players count only the heroes they can see.
          sql`(not ${partyHeroes.hidden} or ${partyMembers.role} = 'master')`,
        ),
      );

    const rows = await this.db
      .select({
        id: parties.id,
        name: parties.name,
        setting: parties.setting,
        coverAssetId: parties.coverAssetId,
        updatedAt: parties.updatedAt,
        role: partyMembers.role,
        masterName: users.displayName,
        memberCount: sql<number>`(${memberCount})::int`,
        heroCount: sql<number>`(${heroCount})::int`,
        inCombat: sql<boolean>`exists (select 1 from ${partyCombats} where ${partyCombats.partyId} = ${parties.id})`,
        sessionStartedAt: parties.sessionStartedAt,
        myCharacterIds: sql<string[]>`coalesce((
          select array_agg(${partyHeroes.characterId}) from ${partyHeroes}
          where ${partyHeroes.partyId} = ${parties.id} and ${partyHeroes.userId} = ${userId}
        ), '{}')`,
      })
      .from(partyMembers)
      .innerJoin(parties, eq(parties.id, partyMembers.partyId))
      .innerJoin(users, eq(users.id, parties.masterId))
      .where(eq(partyMembers.userId, userId))
      .orderBy(desc(parties.updatedAt));

    return rows.map(({ sessionStartedAt, ...row }) => ({
      ...row,
      setting: row.setting as Setting,
      inSession: sessionStartedAt !== null,
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  /** The party as `userId` sees it, read from one snapshot so its parts agree with each other. */
  view(userId: string, partyId: string): Promise<PartyDto> {
    return this.db.transaction(
      async (tx) => {
        const [seat] = await tx
          .select({ party: parties, role: partyMembers.role })
          .from(partyMembers)
          .innerJoin(parties, eq(parties.id, partyMembers.partyId))
          .where(and(eq(partyMembers.partyId, partyId), eq(partyMembers.userId, userId)));
        if (!seat) throw partyNotFound();
        // Between sessions the table is the master's alone.
        if (seat.role !== 'master' && !seat.party.sessionStartedAt) throw sessionClosed();

        const [members, heroes, npcs, [combat], combatants] = await Promise.all([
          tx
            .select({
              userId: partyMembers.userId,
              displayName: users.displayName,
              role: partyMembers.role,
              joinedAt: partyMembers.joinedAt,
            })
            .from(partyMembers)
            .innerJoin(users, eq(users.id, partyMembers.userId))
            .where(eq(partyMembers.partyId, partyId))
            .orderBy(desc(sql`${partyMembers.role} = 'master'`), asc(partyMembers.joinedAt)),
          heroesOf(tx, partyId),
          tx.select().from(partyNpcs).where(eq(partyNpcs.partyId, partyId)).orderBy(asc(partyNpcs.createdAt)),
          tx.select().from(partyCombats).where(eq(partyCombats.partyId, partyId)),
          combatantsOf(tx, partyId),
        ]);

        const { party, role } = seat;
        const isMaster = role === 'master';
        const canSee = (ownerId: string) => isMaster || ownerId === userId;
        // The master's unseen heroes stay off the players' table; in a fight they show as combatants.
        const heroDtos = heroes
          .filter((hero) => isMaster || !hero.hidden)
          .map((hero) => heroDto(hero, canSee(hero.userId)));

        let combatDto: CombatDto | null = null;
        if (combat) {
          const heroesById = new Map(heroes.map((hero) => [hero.id, hero]));
          const npcsById = new Map(npcs.map((npc) => [npc.id, npc]));
          combatDto = {
            phase: combat.phase,
            round: combat.round,
            currentCombatantId: combat.currentCombatantId,
            startedAt: combat.startedAt.toISOString(),
            combatants: turnOrder(combatants).flatMap((entry) => {
              const dto = combatantDto(entry, role, userId, heroesById, npcsById);
              return dto ? [dto] : [];
            }),
          };
        }

        return {
          id: party.id,
          name: party.name,
          description: party.description,
          lore: party.lore,
          setting: party.setting as Setting,
          coverAssetId: party.coverAssetId,
          role,
          masterId: party.masterId,
          inviteCode: isMaster ? party.inviteCode : null,
          members: members.map((member) => ({ ...member, joinedAt: member.joinedAt.toISOString() })),
          heroes: heroDtos,
          npcs: isMaster ? npcs.map(npcDto) : null,
          combat: combatDto,
          sessionStartedAt: party.sessionStartedAt?.toISOString() ?? null,
          createdAt: party.createdAt.toISOString(),
          updatedAt: party.updatedAt.toISOString(),
        };
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }

  async invitePreview(userId: string, code: string): Promise<InvitePreviewDto> {
    const memberCount = this.db
      .select({ value: count() })
      .from(partyMembers)
      .where(eq(partyMembers.partyId, parties.id));
    const [row] = await this.db
      .select({
        partyId: parties.id,
        name: parties.name,
        description: parties.description,
        setting: parties.setting,
        coverAssetId: parties.coverAssetId,
        sessionStartedAt: parties.sessionStartedAt,
        masterName: users.displayName,
        memberCount: sql<number>`(${memberCount})::int`,
        member: sql<boolean>`exists (
          select 1 from ${partyMembers}
          where ${partyMembers.partyId} = ${parties.id} and ${partyMembers.userId} = ${userId}
        )`,
      })
      .from(parties)
      .innerJoin(users, eq(users.id, parties.masterId))
      .where(eq(parties.inviteCode, code));
    if (!row) throw partyNotFound();
    const { sessionStartedAt, ...preview } = row;
    if (!sessionStartedAt && !preview.member) throw sessionClosed(CODE_WAITS);
    return { ...preview, setting: row.setting as Setting, inSession: sessionStartedAt !== null };
  }
}

function heroDto(hero: HeroRow, visible: boolean): PartyHeroDto {
  const summary = hero.summary ?? EMPTY_SUMMARY;
  return {
    id: hero.id,
    ownerId: hero.userId,
    characterId: hero.characterId,
    name: hero.name,
    setting: summary.setting,
    race: summary.race,
    subrace: summary.subrace,
    class: summary.class,
    subclass: summary.subclass,
    level: summary.level,
    portrait: summary.portrait,
    hidden: hero.hidden,
    vitals: visible
      ? {
          currentHP: summary.currentHP,
          maxHP: summary.maxHP,
          tempHP: summary.tempHP,
          armorClass: summary.armorClass,
          initiative: summary.initiative,
          conditions: summary.conditions,
        }
      : null,
  };
}

function combatantDto(
  entry: CombatantEntry,
  role: PartyRole,
  userId: string,
  heroes: Map<string, HeroRow>,
  npcs: Map<string, PartyNpcRow>,
): CombatantDto | null {
  const isMaster = role === 'master';
  if (entry.heroId) {
    const hero = heroes.get(entry.heroId);
    if (!hero) return null;
    const summary = hero.summary ?? EMPTY_SUMMARY;
    const own = hero.userId === userId;
    return {
      id: entry.id,
      kind: 'hero',
      refId: hero.id,
      name: hero.name,
      portrait: summary.portrait ?? null,
      setting: summary.setting,
      hostile: false,
      initiative: entry.initiative,
      controlled: isMaster || own,
      vitals:
        isMaster || own
          ? {
              currentHP: summary.currentHP,
              maxHP: summary.maxHP,
              tempHP: summary.tempHP,
              armorClass: summary.armorClass,
            }
          : null,
    };
  }
  const npc = entry.npcId ? npcs.get(entry.npcId) : undefined;
  if (!npc) return null;
  return {
    id: entry.id,
    kind: 'npc',
    refId: npc.id,
    name: npc.name,
    portrait: npc.portraitAssetId,
    hostile: npc.disposition === 'hostile',
    initiative: entry.initiative,
    controlled: isMaster,
    vitals: isMaster
      ? { currentHP: npc.currentHp, maxHP: npc.maxHp, tempHP: 0, armorClass: npc.armorClass }
      : null,
  };
}
