import { TABLE_ROLLS_KEPT, TABLE_ROLL_SHOWN_MS, type TableDie, type TableRollDto } from '@itd/schema';
import { create } from 'zustand';
import { api } from '../data/api/client';
import type { Workspace } from '../data/workspace';
import { usePartyStore } from './usePartyStore';

/** A throw on screen: its dice, until `TABLE_ROLL_SHOWN_MS` after it arrived. */
export interface ShownRoll {
  id: string;
  dice: TableDie[];
}

/** The table's latest throw of anyone, for the middle of the screen. */
export interface CentreRoll extends ShownRoll {
  kind: TableRollDto['kind'];
  authorId: string;
}

/**
 * Dice thrown at the party tables, as they arrive over the socket: the latest throw of each hero
 * (shown on its portrait) and the master's latest own throw (shown over the screen), each for a few
 * seconds; and each table's dice log, fetched once and appended to as throws come.
 */
interface TableRollState {
  /** By party, then by party hero id. */
  heroes: Record<string, Record<string, ShownRoll>>;
  /** The master's latest own throw at each party, for the middle of the screen. */
  centre: Record<string, CentreRoll>;
  /** The dice log by party, oldest first; absent until loaded. */
  logs: Record<string, TableRollDto[]>;
  loadLog(partyId: string): Promise<void>;
  attach(workspace: Workspace | null): void;
}

let detach: (() => void) | null = null;
const timers = new Map<string, number>();

export const useTableRollStore = create<TableRollState>((set, get) => {
  const show = (partyId: string, roll: TableRollDto) => {
    const shown: ShownRoll = { id: roll.id, dice: roll.dice };
    const heroId = roll.kind === 'hero' ? roll.heroId : null;
    if (heroId)
      set({ heroes: { ...get().heroes, [partyId]: { ...get().heroes[partyId], [heroId]: shown } } });
    if (roll.kind === 'master')
      set({ centre: { ...get().centre, [partyId]: { ...shown, kind: roll.kind, authorId: roll.authorId } } });
    // Each place lets its throw go a few seconds after it came, unless a newer one took its place.
    const later = (slot: string, clear: () => void) => {
      window.clearTimeout(timers.get(slot));
      timers.set(
        slot,
        window.setTimeout(() => {
          timers.delete(slot);
          clear();
        }, TABLE_ROLL_SHOWN_MS),
      );
    };
    if (heroId)
      later(`${partyId}:${heroId}`, () => {
        const { [heroId]: gone, ...rest } = get().heroes[partyId] ?? {};
        if (gone?.id === roll.id) set({ heroes: { ...get().heroes, [partyId]: rest } });
      });
    if (roll.kind === 'master')
      later(`${partyId}:centre`, () => {
        if (get().centre[partyId]?.id !== roll.id) return;
        const { [partyId]: _, ...rest } = get().centre;
        set({ centre: rest });
      });
  };

  const receive = (partyId: string, roll: TableRollDto) => {
    show(partyId, roll);
    const log = get().logs[partyId];
    if (log && !log.some((r) => r.id === roll.id))
      set({ logs: { ...get().logs, [partyId]: [...log, roll].slice(-TABLE_ROLLS_KEPT) } });
  };

  return {
    heroes: {},
    centre: {},
    logs: {},
    loadLog: async (partyId) => {
      try {
        const { items } = await api.rolls.list(partyId);
        // Throws that came while the log was fetched stay.
        const later = (get().logs[partyId] ?? []).filter((r) => !items.some((i) => i.id === r.id));
        set({ logs: { ...get().logs, [partyId]: [...items, ...later].slice(-TABLE_ROLLS_KEPT) } });
      } catch {
        // Offline or the table closed: the log waits for the next look.
      }
    },
    attach: (workspace) => {
      detach?.();
      detach = null;
      for (const timer of timers.values()) window.clearTimeout(timer);
      timers.clear();
      set({ heroes: {}, centre: {}, logs: {} });
      if (!workspace) return;
      detach = workspace.onPartyEvent((event) => {
        if (event.type === 'roll') receive(event.partyId, event.roll);
        // Back online: throws made meanwhile are fetched for the logs being kept.
        else if (event.type === 'changed' && event.partyId === null)
          for (const partyId of Object.keys(get().logs)) void get().loadLog(partyId);
      });
    },
  };
});

/**
 * Shows a hero's throw at the tables where the hero sits while a session runs (on its portrait, and
 * in the dice log with `label`); elsewhere it stays the player's own. Fire and forget: the throw has
 * already happened, the table only sees it.
 */
export function announceRoll(characterId: string | undefined, dice: TableDie[], label = ''): void {
  if (!characterId || tableDice(dice).length === 0) return;
  const tables = (usePartyStore.getState().list ?? []).filter(
    (party) => party.inSession && party.myCharacterIds.includes(characterId),
  );
  for (const party of tables)
    void api.rolls
      .send(party.id, { characterId, dice: tableDice(dice), label: label.slice(0, 120) })
      .catch(() => {});
}

/** The master's own throw, for everyone at the table or only for the owners of `heroIds`. */
export async function announceMasterRoll(
  partyId: string,
  dice: TableDie[],
  label: string,
  heroIds?: string[],
): Promise<void> {
  await api.rolls.send(partyId, {
    characterId: null,
    dice: tableDice(dice),
    label: label.slice(0, 120),
    ...(heroIds ? { heroIds } : {}),
  });
}

/** The dice a table can show (2 to 100 sides), at most 20, each as the table sees it. */
const tableDice = (dice: TableDie[]): TableDie[] =>
  dice
    .filter((die) => die.sides >= 2 && die.sides <= 100 && die.value >= 0 && die.value <= 100)
    .slice(0, 20)
    .map(plain);

/** Only what the table shows of a die (the sheet's dice carry more: damage types and the like). */
const plain = (die: TableDie): TableDie => ({
  sides: die.sides,
  value: die.value,
  ...(die.label !== undefined ? { label: die.label } : {}),
  ...(die.dropped ? { dropped: true } : {}),
});
