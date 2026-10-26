import { TABLE_ROLLS_KEPT, type TableDie, type TableRollDto, type TableRollsDto } from '@itd/schema';
import { and, asc, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import type { Database } from '../../db/client';
import { characters, parties, partyHeroes, partyMembers, partyRolls, users } from '../../db/schema';
import { forbidden, sessionClosed, validationError } from '../../lib/errors';
import type { ChangeNotifier } from '../realtime/hub';
import { masterOnly, partyNotFound } from './partyAccess';

type RollRow = typeof partyRolls.$inferSelect & { authorName: string };

/**
 * Dice thrown at a party's table: shown on the table's screens for a moment and written into its
 * dice log. A player's throw is everyone's to see; so is the master's own, unless it was meant for
 * some heroes only (then their owners and the master see it), or thrown by a master's hero the
 * players have not been shown yet (the master alone).
 */
export class RollsService {
  constructor(
    private readonly db: Database,
    private readonly notifier: ChangeNotifier,
  ) {}

  async announce(
    userId: string,
    partyId: string,
    input: { characterId: string | null; dice: TableDie[]; heroIds?: string[]; label?: string },
  ): Promise<void> {
    const members = await this.membersOf(partyId);
    const seat = members.find((member) => member.userId === userId);
    if (!seat) throw partyNotFound();
    const [party] = await this.db
      .select({ sessionStartedAt: parties.sessionStartedAt })
      .from(parties)
      .where(eq(parties.id, partyId));
    if (!party?.sessionStartedAt) throw sessionClosed('Сессия не идёт — бросок некому показать');

    const master = members.find((member) => member.role === 'master')!.userId;
    const heroes = await this.db
      .select({
        id: partyHeroes.id,
        userId: partyHeroes.userId,
        characterId: partyHeroes.characterId,
        hidden: partyHeroes.hidden,
        name: characters.name,
      })
      .from(partyHeroes)
      .innerJoin(
        characters,
        and(eq(characters.userId, partyHeroes.userId), eq(characters.id, partyHeroes.characterId)),
      )
      .where(eq(partyHeroes.partyId, partyId));

    let hero: (typeof heroes)[number] | undefined;
    // `null`: everyone at the table.
    let audience: string[] | null = null;
    if (input.characterId) {
      hero = heroes.find(
        (h) => h.characterId === input.characterId && (h.userId === userId || seat.role === 'master'),
      );
      if (!hero) throw forbidden('Этот герой не сидит за столом');
      if (hero.hidden) audience = [master];
    } else {
      if (seat.role !== 'master') throw masterOnly();
      if (input.heroIds) {
        const chosen = heroes.filter((h) => input.heroIds!.includes(h.id));
        if (chosen.length !== new Set(input.heroIds).size)
          throw validationError('Нет такого героя за столом');
        audience = [...new Set([master, ...chosen.map((h) => h.userId)])];
      }
    }

    const roll = await this.db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(partyRolls)
        .values({
          partyId,
          authorId: userId,
          heroId: hero?.id ?? null,
          heroName: hero?.name ?? null,
          audience,
          dice: input.dice,
          label: input.label ?? '',
        })
        .returning();
      // The log keeps its latest throws only.
      await tx.execute(sql`
        DELETE FROM ${partyRolls}
        WHERE ${partyRolls.partyId} = ${partyId} AND ${partyRolls.id} NOT IN (
          SELECT id FROM ${partyRolls} WHERE ${partyRolls.partyId} = ${partyId}
          ORDER BY ${partyRolls.createdAt} DESC, ${partyRolls.id} DESC
          LIMIT ${TABLE_ROLLS_KEPT}
        )
      `);
      return inserted!;
    });

    const names = await this.namesOf(members.map((member) => member.userId));
    const dto = toDto({ ...roll, authorName: names.get(userId) ?? '' }, audienceNames(heroes, names));
    this.notifier.publish(audience ?? members.map((member) => member.userId), {
      type: 'party.roll',
      partyId,
      roll: dto,
    });
  }

  /** The dice log as the viewer may read it, oldest first. */
  async list(userId: string, partyId: string): Promise<TableRollsDto> {
    const members = await this.membersOf(partyId);
    const seat = members.find((member) => member.userId === userId);
    if (!seat) throw partyNotFound();
    const [party] = await this.db
      .select({ sessionStartedAt: parties.sessionStartedAt })
      .from(parties)
      .where(eq(parties.id, partyId));
    if (seat.role !== 'master' && !party?.sessionStartedAt) throw sessionClosed();
    const rows = await this.db
      .select({ roll: partyRolls, authorName: users.displayName })
      .from(partyRolls)
      .innerJoin(users, eq(users.id, partyRolls.authorId))
      .where(
        and(
          eq(partyRolls.partyId, partyId),
          or(isNull(partyRolls.audience), sql`${userId}::uuid = ANY(${partyRolls.audience})`),
        ),
      )
      .orderBy(desc(partyRolls.createdAt), desc(partyRolls.id))
      .limit(TABLE_ROLLS_KEPT);
    const names = await this.namesOf(members.map((member) => member.userId));
    const heroes = await this.db
      .select({ userId: partyHeroes.userId, name: characters.name })
      .from(partyHeroes)
      .innerJoin(
        characters,
        and(eq(characters.userId, partyHeroes.userId), eq(characters.id, partyHeroes.characterId)),
      )
      .where(eq(partyHeroes.partyId, partyId));
    const audience = audienceNames(heroes, names);
    return {
      items: rows.reverse().map((row) => toDto({ ...row.roll, authorName: row.authorName }, audience)),
    };
  }

  private membersOf(partyId: string) {
    return this.db
      .select({ userId: partyMembers.userId, role: partyMembers.role })
      .from(partyMembers)
      .where(eq(partyMembers.partyId, partyId))
      .orderBy(asc(partyMembers.joinedAt));
  }

  private async namesOf(userIds: string[]): Promise<Map<string, string>> {
    if (userIds.length === 0) return new Map();
    const rows = await this.db
      .select({ id: users.id, name: users.displayName })
      .from(users)
      .where(inArray(users.id, userIds));
    return new Map(rows.map((row) => [row.id, row.name]));
  }
}

/** Who a throw was for, as the table knows them: a player by their hero at this table, else by name. */
const audienceNames = (heroes: { userId: string; name: string }[], names: Map<string, string>) => {
  const byUser = new Map(names);
  for (const hero of heroes) byUser.set(hero.userId, hero.name);
  return byUser;
};

const toDto = (row: RollRow, names: Map<string, string>): TableRollDto => ({
  id: row.id,
  kind: row.heroName === null ? 'master' : 'hero',
  heroId: row.heroId,
  heroName: row.heroName,
  authorId: row.authorId,
  authorName: row.authorName,
  dice: row.dice,
  label: row.label,
  // The master is in every audience; the others are who the throw was for.
  audienceNames: row.audience
    ? row.audience.filter((id) => id !== row.authorId).map((id) => names.get(id) ?? '—')
    : null,
  createdAt: row.createdAt.toISOString(),
});
