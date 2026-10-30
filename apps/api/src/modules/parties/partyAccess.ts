import type { PartyRole } from '@itd/schema';
import { eq } from 'drizzle-orm';
import type { Database, Transaction } from '../../db/client';
import { parties, partyMembers, type PartyRow } from '../../db/schema';
import { forbidden, notFound, sessionClosed } from '../../lib/errors';
import type { ChangeNotifier } from '../realtime/hub';

export interface PartyContext {
  tx: Transaction;
  party: PartyRow;
  /** The acting user. */
  userId: string;
  role: PartyRole;
  members: { userId: string; role: PartyRole }[];
}

export const partyNotFound = () => notFound('Партия не найдена');
export const masterOnly = () => forbidden('Это может только мастер');

/**
 * Runs a change to a party: locks the party row (changes to one party apply one at a time), checks
 * the actor's seat, and after commit tells every member's devices — including members the change
 * removed — to fetch the party again.
 */
export class PartyAccess {
  constructor(
    private readonly db: Database,
    private readonly notifier: ChangeNotifier,
  ) {}

  /**
   * `openTable`: between sessions players may not do this (only leave, or take their hero away);
   * the master always may.
   */
  async change<T>(
    userId: string,
    partyId: string,
    need: 'member' | 'master',
    run: (context: PartyContext) => Promise<T>,
    { openTable = true }: { openTable?: boolean } = {},
  ): Promise<T> {
    const { result, audience } = await this.db.transaction(async (tx) => {
      const [party] = await tx.select().from(parties).where(eq(parties.id, partyId)).for('update');
      if (!party) throw partyNotFound();
      const members = await tx
        .select({ userId: partyMembers.userId, role: partyMembers.role })
        .from(partyMembers)
        .where(eq(partyMembers.partyId, partyId));
      const seat = members.find((member) => member.userId === userId);
      // A stranger learns nothing, not even that the party exists.
      if (!seat) throw partyNotFound();
      if (need === 'master' && seat.role !== 'master') throw masterOnly();
      if (openTable && seat.role !== 'master' && !party.sessionStartedAt) throw sessionClosed();

      const result = await run({ tx, party, userId, role: seat.role, members });
      await tx.update(parties).set({ updatedAt: new Date() }).where(eq(parties.id, partyId));
      return { result, audience: members.map((member) => member.userId) };
    });
    this.announce(partyId, audience);
    return result;
  }

  announce(partyId: string, userIds: readonly string[]): void {
    this.notifier.publish([...new Set(userIds)], { type: 'party.changed', partyId });
  }

  /** Tells the members of a party that it changed without changing it (a hero's sheet was saved). */
  async announceToMembers(partyId: string): Promise<void> {
    const members = await this.db
      .select({ userId: partyMembers.userId })
      .from(partyMembers)
      .where(eq(partyMembers.partyId, partyId));
    this.announce(
      partyId,
      members.map((member) => member.userId),
    );
  }
}
