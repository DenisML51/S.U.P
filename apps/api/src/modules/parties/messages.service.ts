import { PARTY_MESSAGES, type PartyMessageDto, type PartyMessagesDto } from '@itd/schema';
import { aliasedTable, and, desc, eq, isNull, or, sql } from 'drizzle-orm';
import type { Database, Transaction } from '../../db/client';
import { parties, partyMembers, partyMessages, users } from '../../db/schema';
import { forbidden, sessionClosed, validationError } from '../../lib/errors';
import type { ChangeNotifier } from '../realtime/hub';
import { partyNotFound } from './partyAccess';

const recipients = aliasedTable(users, 'recipient');

/**
 * Talk at a party's table. A message goes to everyone, or privately between the master and one
 * player; each one reaches only the devices of those who may read it, the moment it is written.
 */
export class MessagesService {
  constructor(
    private readonly db: Database,
    private readonly notifier: ChangeNotifier,
  ) {}

  /** The latest messages the user may read, or the page before `before`; oldest first. */
  async list(
    userId: string,
    partyId: string,
    before: string | undefined,
    limit: number,
  ): Promise<PartyMessagesDto> {
    const seat = await this.seatOf(userId, partyId);
    if (seat.role !== 'master' && !seat.inSession) throw sessionClosed();
    const readable = or(
      isNull(partyMessages.recipientId),
      eq(partyMessages.recipientId, userId),
      eq(partyMessages.authorId, userId),
    );
    const older = before
      ? sql`(${partyMessages.createdAt}, ${partyMessages.id}) < (select m.created_at, m.id from ${partyMessages} m where m.id = ${before})`
      : undefined;
    const rows = await this.select()
      .where(and(eq(partyMessages.partyId, partyId), readable, older))
      .orderBy(desc(partyMessages.createdAt), desc(partyMessages.id))
      .limit(limit + 1);
    return { items: rows.slice(0, limit).reverse().map(toDto), hasMore: rows.length > limit };
  }

  async send(
    userId: string,
    partyId: string,
    input: { body: string; recipientId: string | null },
  ): Promise<PartyMessageDto> {
    const members = await this.db
      .select({ userId: partyMembers.userId, role: partyMembers.role })
      .from(partyMembers)
      .where(eq(partyMembers.partyId, partyId));
    const author = members.find((member) => member.userId === userId);
    if (!author) throw partyNotFound();
    const [party] = await this.db
      .select({ sessionStartedAt: parties.sessionStartedAt })
      .from(parties)
      .where(eq(parties.id, partyId));
    // The table talks while it is open.
    if (!party?.sessionStartedAt) throw sessionClosed('Сессия не идёт — сообщения ждут следующей');

    if (input.recipientId) {
      const recipient = members.find((member) => member.userId === input.recipientId);
      if (!recipient || recipient.userId === userId)
        throw validationError('Нет такого собеседника за столом');
      // Private talk is the master's: they write to a player, a player answers them.
      if (author.role !== 'master' && recipient.role !== 'master')
        throw forbidden('Лично игрок может написать только мастеру');
    }

    const message = await this.db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(partyMessages)
        .values({ partyId, authorId: userId, recipientId: input.recipientId, body: input.body })
        .returning({ id: partyMessages.id });
      // The party keeps its latest messages only.
      await tx.execute(sql`
        DELETE FROM ${partyMessages}
        WHERE ${partyMessages.partyId} = ${partyId} AND ${partyMessages.id} NOT IN (
          SELECT id FROM ${partyMessages} WHERE ${partyMessages.partyId} = ${partyId}
          ORDER BY ${partyMessages.createdAt} DESC, ${partyMessages.id} DESC
          LIMIT ${PARTY_MESSAGES.kept}
        )
      `);
      const [row] = await this.select(tx).where(eq(partyMessages.id, inserted!.id));
      return toDto(row!);
    });

    const audience = input.recipientId ? [userId, input.recipientId] : members.map((member) => member.userId);
    this.notifier.publish(audience, { type: 'party.message', partyId, message });
    return message;
  }

  private select(db: Database | Transaction = this.db) {
    return db
      .select({
        id: partyMessages.id,
        authorId: partyMessages.authorId,
        authorName: users.displayName,
        recipientId: partyMessages.recipientId,
        recipientName: recipients.displayName,
        body: partyMessages.body,
        createdAt: partyMessages.createdAt,
      })
      .from(partyMessages)
      .innerJoin(users, eq(users.id, partyMessages.authorId))
      .leftJoin(recipients, eq(recipients.id, partyMessages.recipientId))
      .$dynamic();
  }

  private async seatOf(userId: string, partyId: string) {
    const [seat] = await this.db
      .select({ role: partyMembers.role, inSession: sql<boolean>`${parties.sessionStartedAt} is not null` })
      .from(partyMembers)
      .innerJoin(parties, eq(parties.id, partyMembers.partyId))
      .where(and(eq(partyMembers.partyId, partyId), eq(partyMembers.userId, userId)));
    if (!seat) throw partyNotFound();
    return seat;
  }
}

type MessageRow = Omit<PartyMessageDto, 'createdAt'> & { createdAt: Date };

const toDto = (row: MessageRow): PartyMessageDto => ({ ...row, createdAt: row.createdAt.toISOString() });
