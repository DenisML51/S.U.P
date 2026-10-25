import { eq, inArray, sql } from 'drizzle-orm';
import type { Database } from '../../db/client';
import { partyMembers, userPresence } from '../../db/schema';
import type { ChangeNotifier } from './hub';

/** Clients ping every ~25 s and the server drops a socket silent for 70 s: past that, nobody is there. */
export const PRESENCE_TTL_SECONDS = 75;
/**
 * A user whose last socket closed is marked offline only if they are not back this soon: a reload, a
 * network blip or a browser waking a background tab reconnects within a second or two, and the table
 * should neither see them flicker nor fetch the party for it.
 */
const OFFLINE_GRACE_MS = 5_000;

/**
 * Who is online, for the seats at the party tables. A user is online while a realtime socket of
 * theirs is open: the mark is renewed on every ping and lapses on its own if the process holding the
 * socket dies. Coming online or going offline tells the members of the user's parties to look again.
 */
export class PresenceService {
  /** Writes per user run in order, so a quick reconnect never ends with the "offline" write last. */
  private readonly queues = new Map<string, Promise<unknown>>();
  /** Offline marks waiting out the grace period. */
  private readonly leaving = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly db: Database,
    private readonly notifier: ChangeNotifier,
  ) {}

  /** The user's first socket on this process opened. */
  connected(userId: string): Promise<void> {
    const returning = this.leaving.get(userId);
    if (returning) {
      // Back within the grace period: the table never saw them leave.
      clearTimeout(returning);
      this.leaving.delete(userId);
      return this.renew(userId);
    }
    return this.inOrder(userId, async () => {
      await this.mark(userId);
      await this.announce(userId);
    });
  }

  /** A ping on an open socket. */
  renew(userId: string): Promise<void> {
    return this.inOrder(userId, () => this.mark(userId));
  }

  /**
   * The user's last socket on this process closed. A socket of theirs on another API process puts the
   * mark back with its next ping.
   */
  disconnected(userId: string, onError: (error: unknown) => void): void {
    clearTimeout(this.leaving.get(userId));
    const timer = setTimeout(() => {
      this.leaving.delete(userId);
      this.inOrder(userId, async () => {
        await this.db.update(userPresence).set({ onlineUntil: sql`now()` }).where(eq(userPresence.userId, userId));
        await this.announce(userId);
      }).catch(onError);
    }, OFFLINE_GRACE_MS);
    timer.unref();
    this.leaving.set(userId, timer);
  }

  /** Drops the pending offline marks (the process is stopping; the marks lapse on their own). */
  dispose(): void {
    for (const timer of this.leaving.values()) clearTimeout(timer);
    this.leaving.clear();
  }

  private inOrder(userId: string, task: () => Promise<unknown>): Promise<void> {
    const run = (this.queues.get(userId) ?? Promise.resolve()).then(task);
    // The queue only orders writes; the caller hears about a failure through `run`.
    const settled: Promise<void> = run
      .then(
        () => {},
        () => {},
      )
      .finally(() => {
        if (this.queues.get(userId) === settled) this.queues.delete(userId);
      });
    this.queues.set(userId, settled);
    return run.then(() => {});
  }

  private mark(userId: string): Promise<unknown> {
    return this.db
      .insert(userPresence)
      .values({ userId, onlineUntil: sql`now() + make_interval(secs => ${PRESENCE_TTL_SECONDS})` })
      .onConflictDoUpdate({ target: userPresence.userId, set: { onlineUntil: sql`excluded.online_until` } });
  }

  private async announce(userId: string): Promise<void> {
    const seats = this.db
      .select({ partyId: partyMembers.partyId })
      .from(partyMembers)
      .where(eq(partyMembers.userId, userId));
    const rows = await this.db
      .select({ partyId: partyMembers.partyId, userId: partyMembers.userId })
      .from(partyMembers)
      .where(inArray(partyMembers.partyId, seats));
    const byParty = new Map<string, string[]>();
    for (const row of rows) byParty.set(row.partyId, [...(byParty.get(row.partyId) ?? []), row.userId]);
    for (const [partyId, userIds] of byParty) this.notifier.publish(userIds, { type: 'party.changed', partyId });
  }
}

/** SQL for "this user is online now", for the party views. */
export const isOnline = sql<boolean>`coalesce(${userPresence.onlineUntil} > now(), false)`;
