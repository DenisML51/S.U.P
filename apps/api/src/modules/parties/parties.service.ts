import { randomInt } from 'node:crypto';
import {
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH,
  PARTY_LIMITS,
  type CreateNpcRequestSchema,
  type CreatePartyRequestSchema,
  type UpdateNpcRequestSchema,
  type UpdatePartyRequestSchema,
} from '@itd/schema';
import { and, count, eq, inArray, isNull } from 'drizzle-orm';
import type { z } from 'zod';
import type { Database, Transaction } from '../../db/client';
import { assets, characters, parties, partyHeroes, partyMembers, partyNpcs } from '../../db/schema';
import { conflictError, forbidden, notFound, validationError } from '../../lib/errors';
import { isUniqueViolation } from '../../lib/postgres';
import type { CharacterChangeListener } from '../characters/characters.service';
import type { CombatService } from './combat.service';
import { masterOnly, partyNotFound, type PartyAccess } from './partyAccess';

type CreateParty = z.output<typeof CreatePartyRequestSchema>;
type UpdateParty = z.output<typeof UpdatePartyRequestSchema>;
type CreateNpc = z.output<typeof CreateNpcRequestSchema>;
type UpdateNpc = z.output<typeof UpdateNpcRequestSchema>;

const INVITE_ATTEMPTS = 5;

const generateInviteCode = (): string =>
  Array.from({ length: INVITE_CODE_LENGTH }, () => INVITE_CODE_ALPHABET[randomInt(INVITE_CODE_ALPHABET.length)]).join('');

/** Retries a write that stores a fresh invite code until the code is unique. */
async function withFreshCode<T>(write: (code: string) => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await write(generateInviteCode());
    } catch (error) {
      if (!isUniqueViolation(error) || attempt >= INVITE_ATTEMPTS) throw error;
    }
  }
}

/** An uploaded picture may only be used by the account that uploaded it. */
async function assertOwnAsset(tx: Transaction, userId: string, assetId: string | null | undefined) {
  if (!assetId) return;
  const [asset] = await tx
    .select({ id: assets.id })
    .from(assets)
    .where(and(eq(assets.id, assetId), eq(assets.userId, userId)));
  if (!asset) throw validationError('Изображение не найдено');
}

/** Parties, their seats, heroes and NPCs. Fights are `CombatService`'s. */
export class PartiesService implements CharacterChangeListener {
  constructor(
    private readonly db: Database,
    private readonly access: PartyAccess,
    private readonly combat: CombatService,
    private readonly onError: (error: unknown) => void = () => {},
  ) {}

  // ------------------------------------------------------------------------------------------
  // Party
  // ------------------------------------------------------------------------------------------

  async create(userId: string, input: CreateParty): Promise<{ id: string }> {
    return this.db.transaction(async (tx) => {
      const [mastered] = await tx.select({ value: count() }).from(parties).where(eq(parties.masterId, userId));
      if ((mastered?.value ?? 0) >= PARTY_LIMITS.mastered) {
        throw conflictError(`Можно вести не больше ${PARTY_LIMITS.mastered} партий`);
      }
      await assertOwnAsset(tx, userId, input.coverAssetId);
      // A savepoint per attempt: a clashing code must not abort the whole transaction.
      const party = await withFreshCode((inviteCode) =>
        tx.transaction(async (attempt) => {
          const [row] = await attempt
            .insert(parties)
            .values({ ...input, masterId: userId, inviteCode })
            .returning({ id: parties.id });
          return row!;
        }),
      );
      await tx.insert(partyMembers).values({ partyId: party.id, userId, role: 'master' });
      return party;
    });
  }

  update(userId: string, partyId: string, input: UpdateParty): Promise<void> {
    return this.access.change(userId, partyId, 'master', async ({ tx }) => {
      await assertOwnAsset(tx, userId, input.coverAssetId);
      await tx.update(parties).set(input).where(eq(parties.id, partyId));
    });
  }

  remove(userId: string, partyId: string): Promise<void> {
    return this.access.change(userId, partyId, 'master', async ({ tx }) => {
      await tx.delete(parties).where(eq(parties.id, partyId));
    });
  }

  /** A new code; the old one stops working at once. */
  regenerateInvite(userId: string, partyId: string): Promise<void> {
    return this.access.change(userId, partyId, 'master', ({ tx }) =>
      withFreshCode((inviteCode) =>
        tx.transaction(async (attempt) => {
          await attempt.update(parties).set({ inviteCode }).where(eq(parties.id, partyId));
        }),
      ),
    );
  }

  // ------------------------------------------------------------------------------------------
  // Seats
  // ------------------------------------------------------------------------------------------

  /** Takes a player's seat at the table the code opens; joining twice is harmless. */
  async join(userId: string, code: string): Promise<{ partyId: string }> {
    const [party] = await this.db.select({ id: parties.id }).from(parties).where(eq(parties.inviteCode, code));
    if (!party) throw partyNotFound();

    const { joined, audience } = await this.db.transaction(async (tx) => {
      // Same lock as every other change of the party: seats are counted race-free.
      const [locked] = await tx
        .select({ id: parties.id, inviteCode: parties.inviteCode })
        .from(parties)
        .where(eq(parties.id, party.id))
        .for('update');
      if (!locked || locked.inviteCode !== code) throw partyNotFound();

      const members = await tx
        .select({ userId: partyMembers.userId })
        .from(partyMembers)
        .where(eq(partyMembers.partyId, party.id));
      if (members.some((member) => member.userId === userId)) return { joined: false, audience: [] };
      if (members.length >= PARTY_LIMITS.members) throw conflictError('За столом нет свободных мест');

      await tx.insert(partyMembers).values({ partyId: party.id, userId, role: 'player' });
      await tx.update(parties).set({ updatedAt: new Date() }).where(eq(parties.id, party.id));
      return { joined: true, audience: [...members.map((member) => member.userId), userId] };
    });
    if (joined) this.access.announce(party.id, audience);
    return { partyId: party.id };
  }

  /** A player leaves (their own seat) or the master asks them to; the master's seat goes with the party. */
  removeMember(userId: string, partyId: string, memberId: string): Promise<void> {
    return this.access.change(userId, partyId, 'member', async (context) => {
      const target = context.members.find((member) => member.userId === memberId);
      if (!target) throw notFound('Участник не найден');
      if (target.role === 'master') throw forbidden('Мастер не может покинуть свою партию — её можно удалить');
      if (memberId !== userId && context.role !== 'master') throw masterOnly();

      const heroIds = await this.heroIdsOf(context.tx, partyId, eq(partyHeroes.userId, memberId));
      await this.combat.releaseTurns(context.tx, partyId, { heroIds });
      await context.tx
        .delete(partyMembers)
        .where(and(eq(partyMembers.partyId, partyId), eq(partyMembers.userId, memberId)));
    });
  }

  // ------------------------------------------------------------------------------------------
  // Heroes
  // ------------------------------------------------------------------------------------------

  /** Brings one of the actor's own characters to the table. */
  addHero(userId: string, partyId: string, characterId: string): Promise<{ id: string }> {
    return this.access.change(userId, partyId, 'member', async ({ tx, role }) => {
      const [character] = await tx
        .select({ id: characters.id })
        .from(characters)
        .where(and(eq(characters.userId, userId), eq(characters.id, characterId), isNull(characters.deletedAt)));
      if (!character) throw notFound('Персонаж не найден');

      const limit = role === 'master' ? PARTY_LIMITS.masterHeroes : PARTY_LIMITS.playerHeroes;
      const [brought] = await tx
        .select({ value: count() })
        .from(partyHeroes)
        .where(and(eq(partyHeroes.partyId, partyId), eq(partyHeroes.userId, userId)));
      if ((brought?.value ?? 0) >= limit) {
        throw conflictError(limit === 1 ? 'Игрок приводит в партию одного героя' : `Не больше ${limit} героев`);
      }

      try {
        const [hero] = await tx.transaction((attempt) =>
          attempt.insert(partyHeroes).values({ partyId, userId, characterId }).returning({ id: partyHeroes.id }),
        );
        return hero!;
      } catch (error) {
        if (isUniqueViolation(error)) throw conflictError('Этот герой уже состоит в партии');
        throw error;
      }
    });
  }

  /** The hero's owner takes them away, or the master sends them off. */
  removeHero(userId: string, partyId: string, heroId: string): Promise<void> {
    return this.access.change(userId, partyId, 'member', async ({ tx, role }) => {
      const [hero] = await tx
        .select({ userId: partyHeroes.userId })
        .from(partyHeroes)
        .where(and(eq(partyHeroes.id, heroId), eq(partyHeroes.partyId, partyId)));
      if (!hero) throw notFound('Герой не найден');
      if (hero.userId !== userId && role !== 'master') throw masterOnly();
      await this.dropHeroes(tx, partyId, [heroId]);
    });
  }

  // ------------------------------------------------------------------------------------------
  // NPCs
  // ------------------------------------------------------------------------------------------

  createNpc(userId: string, partyId: string, input: CreateNpc): Promise<{ id: string }> {
    return this.access.change(userId, partyId, 'master', async ({ tx }) => {
      const [existing] = await tx.select({ value: count() }).from(partyNpcs).where(eq(partyNpcs.partyId, partyId));
      if ((existing?.value ?? 0) >= PARTY_LIMITS.npcs) throw conflictError(`Не больше ${PARTY_LIMITS.npcs} НПС`);
      await assertOwnAsset(tx, userId, input.portraitAssetId);
      const [npc] = await tx
        .insert(partyNpcs)
        .values({
          partyId,
          name: input.name,
          portraitAssetId: input.portraitAssetId,
          maxHp: input.maxHP,
          currentHp: input.currentHP ?? input.maxHP,
          armorClass: input.armorClass,
          initiativeBonus: input.initiativeBonus,
        })
        .returning({ id: partyNpcs.id });
      return npc!;
    });
  }

  updateNpc(userId: string, partyId: string, npcId: string, input: UpdateNpc): Promise<void> {
    return this.access.change(userId, partyId, 'master', async ({ tx }) => {
      await assertOwnAsset(tx, userId, input.portraitAssetId);
      const updated = await tx
        .update(partyNpcs)
        .set({
          name: input.name,
          portraitAssetId: input.portraitAssetId,
          maxHp: input.maxHP,
          currentHp: input.currentHP,
          armorClass: input.armorClass,
          initiativeBonus: input.initiativeBonus,
        })
        .where(and(eq(partyNpcs.id, npcId), eq(partyNpcs.partyId, partyId)))
        .returning({ id: partyNpcs.id });
      if (updated.length === 0) throw notFound('НПС не найден');
    });
  }

  removeNpc(userId: string, partyId: string, npcId: string): Promise<void> {
    return this.access.change(userId, partyId, 'master', async ({ tx }) => {
      await this.combat.releaseTurns(tx, partyId, { npcIds: [npcId] });
      const removed = await tx
        .delete(partyNpcs)
        .where(and(eq(partyNpcs.id, npcId), eq(partyNpcs.partyId, partyId)))
        .returning({ id: partyNpcs.id });
      if (removed.length === 0) throw notFound('НПС не найден');
    });
  }

  // ------------------------------------------------------------------------------------------
  // Characters
  // ------------------------------------------------------------------------------------------

  /** A hero's sheet changed: the table sees new hit points; a deleted hero leaves it. */
  characterChanged(userId: string, characterId: string, change: 'saved' | 'deleted' | 'restored'): void {
    void this.onCharacterChanged(userId, characterId, change).catch(this.onError);
  }

  private async onCharacterChanged(userId: string, characterId: string, change: 'saved' | 'deleted' | 'restored') {
    const [hero] = await this.db
      .select({ id: partyHeroes.id, partyId: partyHeroes.partyId })
      .from(partyHeroes)
      .where(and(eq(partyHeroes.userId, userId), eq(partyHeroes.characterId, characterId)));
    if (!hero) return;
    if (change !== 'deleted') return this.access.announceToMembers(hero.partyId);
    await this.access.change(userId, hero.partyId, 'member', ({ tx }) => this.dropHeroes(tx, hero.partyId, [hero.id]));
  }

  private async dropHeroes(tx: Transaction, partyId: string, heroIds: string[]) {
    await this.combat.releaseTurns(tx, partyId, { heroIds });
    await tx.delete(partyHeroes).where(and(eq(partyHeroes.partyId, partyId), inArray(partyHeroes.id, heroIds)));
  }

  private async heroIdsOf(tx: Transaction, partyId: string, where: ReturnType<typeof eq>): Promise<string[]> {
    const rows = await tx
      .select({ id: partyHeroes.id })
      .from(partyHeroes)
      .where(and(eq(partyHeroes.partyId, partyId), where));
    return rows.map((row) => row.id);
  }
}
