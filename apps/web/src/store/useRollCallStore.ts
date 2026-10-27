import type { Character, TableRollCallDto } from '@itd/schema';
import { create } from 'zustand';
import type { Workspace } from '../data/workspace';

/** A call of the master's waiting for this player's throw. */
export interface PendingCall extends TableRollCallDto {
  partyId: string;
}

/**
 * The master's calls for a throw, as they reach this player: one plate each, in the order they
 * came, until the player throws (or puts it away).
 */
interface RollCallState {
  calls: PendingCall[];
  dismiss(call: Pick<PendingCall, 'id' | 'heroId'>): void;
  attach(workspace: Workspace | null): void;
}

let detach: (() => void) | null = null;
let current: Workspace | null = null;

/** The player's own hero behind a call, read from this device's copy. */
export const calledHero = async (characterId: string): Promise<Character | null> =>
  (await current?.repository.get(characterId)) ?? null;

export const useRollCallStore = create<RollCallState>((set, get) => ({
  calls: [],
  dismiss: ({ id, heroId }) => set({ calls: get().calls.filter((c) => !(c.id === id && c.heroId === heroId)) }),
  attach: (workspace) => {
    detach?.();
    detach = null;
    current = workspace;
    set({ calls: [] });
    if (!workspace) return;
    detach = workspace.onPartyEvent((event) => {
      if (event.type !== 'rollCall') return;
      // The same call for the same hero twice (a reconnect) is one plate.
      const calls = get().calls.filter((c) => !(c.id === event.call.id && c.heroId === event.call.heroId));
      set({ calls: [...calls, { ...event.call, partyId: event.partyId }] });
    });
  },
}));
