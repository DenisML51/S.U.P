import { randomInt } from 'node:crypto';
import { npcDexOrder } from '@itd/schema';
import { and, eq, inArray } from 'drizzle-orm';
import type { Transaction } from '../../db/client';
import { partyCombatants, partyCombats, partyHeroes, partyNpcs } from '../../db/schema';
import { conflictError, notFound, sessionClosed, validationError } from '../../lib/errors';
import { masterOnly, type PartyAccess, type PartyContext } from './partyAccess';
import { combatantsOf, combatRulesOf, D20_FIGHT, type CombatantEntry } from './parties.queries';
import { nextTurn } from './turnOrder';

interface Participants {
  heroIds: string[];
  npcIds: string[];
}

const noFight = () => conflictError('Бой не идёт');

/** NPCs at 0 hit points: still in the fight's list (the master may heal them), but their turns are passed over. */
const downOf = (combatants: readonly CombatantEntry[]): Set<string> =>
  new Set(combatants.filter((entry) => entry.down).map((entry) => entry.id));

/**
 * A party's fight: the master starts it, everyone rolls initiative, then turns go round in order.
 * Every change runs under the party lock (see `PartyAccess`).
 */
export class CombatService {
  constructor(private readonly access: PartyAccess) {}

  start(userId: string, partyId: string, participants: Participants): Promise<void> {
    return this.access.change(userId, partyId, 'master', async ({ tx, party }) => {
      if (!party.sessionStartedAt) throw sessionClosed('Сначала начните сессию');
      const [existing] = await tx
        .select({ partyId: partyCombats.partyId })
        .from(partyCombats)
        .where(eq(partyCombats.partyId, partyId));
      if (existing) throw conflictError('Бой уже идёт');
      // The fight keeps the rules it starts with: a hero seated later does not change them.
      const rules = (await combatRulesOf(tx, partyId)) ?? D20_FIGHT;
      await tx.insert(partyCombats).values({ partyId, phase: 'initiative', rules });
      await this.enlist(tx, partyId, participants);
    });
  }

  /** Brings more heroes or NPCs into a fight under way; they roll initiative like everyone else. */
  add(userId: string, partyId: string, participants: Participants): Promise<void> {
    return this.access.change(userId, partyId, 'master', async ({ tx }) => {
      await this.requireCombat(tx, partyId);
      await this.enlist(tx, partyId, participants);
    });
  }

  remove(userId: string, partyId: string, combatantId: string): Promise<void> {
    return this.access.change(userId, partyId, 'master', async ({ tx }) => {
      await this.requireCombat(tx, partyId);
      await this.releaseTurns(tx, partyId, { combatantIds: [combatantId] });
      const removed = await tx
        .delete(partyCombatants)
        .where(and(eq(partyCombatants.id, combatantId), eq(partyCombatants.partyId, partyId)))
        .returning({ id: partyCombatants.id });
      if (removed.length === 0) throw notFound('Участник боя не найден');
    });
  }

  /**
   * The hero's owner enters their roll (or the master does it for anyone). A player rolls while
   * initiative is being rolled, or once for a hero brought into a fight already under way; the order
   * of a running round is the master's to change. An investigator's order is their DEX, or DEX + 50
   * with a firearm ready: nothing else is taken from a player.
   */
  setInitiative(userId: string, partyId: string, combatantId: string, value: number): Promise<void> {
    return this.access.change(userId, partyId, 'member', async (context) => {
      const combat = await this.requireCombat(context.tx, partyId);
      const combatant = (await combatantsOf(context.tx, partyId)).find((entry) => entry.id === combatantId);
      if (!combatant) throw notFound('Участник боя не найден');
      if (!this.controls(context, combatant.ownerId)) throw masterOnly();
      if (context.role !== 'master') {
        if (combat.phase !== 'initiative' && combatant.initiative !== null) {
          throw conflictError('Раунд уже идёт: порядок хода меняет мастер');
        }
        const dex = combatant.heroDex;
        if (dex !== null && value !== dex && value !== dex + 50) {
          throw validationError(`Порядок сыщика — его ЛВК (${dex}) или ЛВК + 50 с оружием наготове (${dex + 50})`);
        }
      }
      await context.tx
        .update(partyCombatants)
        .set({ initiative: value })
        .where(eq(partyCombatants.id, combatantId));
    });
  }

  /**
   * Initiative for every NPC still waiting: d20 + modifier, or in a Call of Cthulhu fight the NPC's
   * DEX (kept in the modifier's place), +50 with a firearm ready, since there everyone acts in DEX
   * order (see `combatRulesFor` for a table of any rules; a fight keeps the rules it started with).
   * Ties of DEX go to the higher attack skill (`turnOrder`).
   */
  rollForNpcs(userId: string, partyId: string): Promise<void> {
    return this.access.change(userId, partyId, 'master', async ({ tx }) => {
      await this.requireCombat(tx, partyId);
      const byDex = (await combatRulesOf(tx, partyId)) === 'coc7';
      const waiting = (await combatantsOf(tx, partyId)).filter(
        (entry) => entry.npcId && entry.initiative === null,
      );
      for (const npc of waiting) {
        await tx
          .update(partyCombatants)
          .set({ initiative: byDex ? npcDexOrder(npc.bonus, npc.npcCoc) : randomInt(1, 21) + npc.bonus })
          .where(eq(partyCombatants.id, npc.id));
      }
    });
  }

  /** Ends the initiative roll: the first round starts with the highest initiative. */
  begin(userId: string, partyId: string): Promise<void> {
    return this.access.change(userId, partyId, 'master', async ({ tx }) => {
      const combat = await this.requireCombat(tx, partyId);
      if (combat.phase === 'active') return;
      const combatants = await combatantsOf(tx, partyId);
      const first = nextTurn(combatants, null, downOf(combatants));
      if (!first) throw validationError('В бою никого нет');
      await tx
        .update(partyCombats)
        .set({ phase: 'active', round: 1, currentCombatantId: first.next.id })
        .where(eq(partyCombats.partyId, partyId));
    });
  }

  /**
   * Passes the turn on. `from` is the turn the caller saw ending; if the turn has moved on since
   * (a double click, the master and a player at once), nothing happens.
   */
  next(userId: string, partyId: string, from: string | null): Promise<void> {
    return this.access.change(userId, partyId, 'member', async (context) => {
      const combat = await this.requireCombat(context.tx, partyId);
      if (combat.phase !== 'active') throw conflictError('Сначала все бросают инициативу');
      if (combat.currentCombatantId !== from) return;

      const combatants = await combatantsOf(context.tx, partyId);
      const current = combatants.find((entry) => entry.id === from);
      if (!this.controls(context, current ? current.ownerId : null)) throw masterOnly();

      const turn = nextTurn(combatants, from, downOf(combatants));
      await context.tx
        .update(partyCombats)
        .set({ currentCombatantId: turn?.next.id ?? null, round: combat.round + (turn?.wrapped ? 1 : 0) })
        .where(eq(partyCombats.partyId, partyId));
    });
  }

  end(userId: string, partyId: string): Promise<void> {
    return this.access.change(userId, partyId, 'master', async ({ tx }) => {
      await this.requireCombat(tx, partyId);
      await tx.delete(partyCombats).where(eq(partyCombats.partyId, partyId));
    });
  }

  /**
   * Before combatants leave the fight (their hero or NPC is removed), the turn moves past them so the
   * round goes on from where it was. Runs inside the caller's party change.
   */
  async releaseTurns(
    tx: Transaction,
    partyId: string,
    leaving: { heroIds?: string[]; npcIds?: string[]; combatantIds?: string[] },
  ): Promise<void> {
    const [combat] = await tx.select().from(partyCombats).where(eq(partyCombats.partyId, partyId));
    if (!combat?.currentCombatantId) return;
    const combatants = await combatantsOf(tx, partyId);
    const gone = new Set(
      combatants
        .filter(
          (entry) =>
            (entry.heroId && leaving.heroIds?.includes(entry.heroId)) ||
            (entry.npcId && leaving.npcIds?.includes(entry.npcId)) ||
            leaving.combatantIds?.includes(entry.id),
        )
        .map((entry) => entry.id),
    );
    if (!gone.has(combat.currentCombatantId)) return;
    const turn = nextTurn(combatants, combat.currentCombatantId, new Set([...gone, ...downOf(combatants)]));
    await tx
      .update(partyCombats)
      .set({ currentCombatantId: turn?.next.id ?? null, round: combat.round + (turn?.wrapped ? 1 : 0) })
      .where(eq(partyCombats.partyId, partyId));
  }

  /** The master acts for everyone; a player for their own heroes. NPCs (`ownerId` null) are the master's. */
  private controls(context: PartyContext, ownerId: string | null): boolean {
    return context.role === 'master' || (ownerId !== null && ownerId === context.userId);
  }

  private async requireCombat(tx: Transaction, partyId: string) {
    const [combat] = await tx.select().from(partyCombats).where(eq(partyCombats.partyId, partyId));
    if (!combat) throw noFight();
    return combat;
  }

  /** Adds the party's heroes and NPCs to the fight; ones already in it are skipped. */
  private async enlist(tx: Transaction, partyId: string, { heroIds, npcIds }: Participants) {
    const [heroes, npcs] = await Promise.all([
      heroIds.length
        ? tx
            .select({ id: partyHeroes.id })
            .from(partyHeroes)
            .where(and(eq(partyHeroes.partyId, partyId), inArray(partyHeroes.id, heroIds)))
        : [],
      npcIds.length
        ? tx
            .select({ id: partyNpcs.id })
            .from(partyNpcs)
            .where(and(eq(partyNpcs.partyId, partyId), inArray(partyNpcs.id, npcIds)))
        : [],
    ]);
    if (heroes.length !== new Set(heroIds).size || npcs.length !== new Set(npcIds).size) {
      throw validationError('Участник не из этой партии');
    }
    const rows = [
      ...heroes.map((hero) => ({ partyId, heroId: hero.id })),
      ...npcs.map((npc) => ({ partyId, npcId: npc.id })),
    ];
    if (rows.length > 0) await tx.insert(partyCombatants).values(rows).onConflictDoNothing();
  }
}
