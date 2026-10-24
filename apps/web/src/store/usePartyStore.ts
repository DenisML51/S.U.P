import type {
  AddCombatantsRequest,
  CreateNpcRequest,
  CreatePartyRequest,
  InvitePreviewDto,
  PartyDto,
  PartyListItemDto,
  StartCombatRequest,
  UpdateNpcRequest,
  UpdatePartyRequest,
} from '@itd/schema';
import { ErrorCode } from '@itd/schema';
import { toast } from 'react-hot-toast';
import { useEffect } from 'react';
import { create } from 'zustand';
import { ApiError, NetworkError, api } from '../data/api/client';
import type { Workspace } from '../data/workspace';

/**
 * Parties live on the server (they are shared tables, not the player's own data), so this store is a
 * cache of server views kept fresh by `party.changed` notifications. A change is sent, then the view
 * is fetched again; other members' devices fetch it when the notification reaches them.
 */
interface PartyState {
  /** `null` until the first load. */
  list: PartyListItemDto[] | null;
  /** Views of the parties someone on screen watches, as the signed-in user sees them. */
  parties: Record<string, PartyDto>;
  /** Parties the user lost their seat at (or that were deleted) while watching them. */
  gone: Record<string, true>;
  /** Parties whose session is not running: players are kept out of their tables. */
  closed: Record<string, true>;
  /** Parties whose view could not be fetched (offline, server error) and is not cached. */
  failed: Record<string, true>;

  refreshList(): Promise<void>;
  refreshParty(id: string): Promise<void>;
  /** Keeps a party's view fresh while the returned function is not called. */
  watch(id: string): () => void;

  create(input: CreatePartyRequest): Promise<string | null>;
  update(id: string, input: UpdatePartyRequest): Promise<boolean>;
  remove(id: string): Promise<boolean>;
  regenerateInvite(id: string): Promise<boolean>;
  startSession(id: string): Promise<boolean>;
  endSession(id: string): Promise<boolean>;
  preview(code: string): Promise<InvitePreviewDto | null>;
  join(code: string): Promise<string | null>;
  removeMember(id: string, userId: string): Promise<boolean>;
  addHero(id: string, characterId: string): Promise<boolean>;
  removeHero(id: string, heroId: string): Promise<boolean>;
  createNpc(id: string, input: CreateNpcRequest): Promise<boolean>;
  updateNpc(id: string, npcId: string, input: UpdateNpcRequest): Promise<boolean>;
  removeNpc(id: string, npcId: string): Promise<boolean>;

  startCombat(id: string, input: StartCombatRequest): Promise<boolean>;
  addCombatants(id: string, input: AddCombatantsRequest): Promise<boolean>;
  removeCombatant(id: string, combatantId: string): Promise<boolean>;
  setInitiative(id: string, combatantId: string, value: number): Promise<boolean>;
  rollNpcInitiative(id: string): Promise<boolean>;
  beginRounds(id: string): Promise<boolean>;
  nextTurn(id: string, from: string | null): Promise<boolean>;
  endCombat(id: string): Promise<boolean>;

  /** Binds the store to the signed-in account (or clears it on sign-out). */
  attach(workspace: Workspace | null): void;
}

/** Server messages are written for people; anything else becomes a plain sentence. */
const reportError = (error: unknown) => {
  if (error instanceof NetworkError) toast.error('Нет связи с сервером — партии доступны только онлайн');
  else if (error instanceof ApiError) toast.error(error.message);
  else {
    console.error(error);
    toast.error('Что-то пошло не так');
  }
};

const isGone = (error: unknown) => error instanceof ApiError && (error.status === 404 || error.status === 403);
const isClosed = (error: unknown) => error instanceof ApiError && error.code === ErrorCode.sessionClosed;

/** One request per key at a time; asks made meanwhile are folded into one more run after it. */
function singleFlight() {
  const running = new Map<string, Promise<void>>();
  const again = new Set<string>();
  const run = (key: string, task: () => Promise<void>): Promise<void> => {
    const current = running.get(key);
    if (current) {
      again.add(key);
      return current;
    }
    const promise = task().finally(() => {
      running.delete(key);
      if (again.delete(key)) void run(key, task);
    });
    running.set(key, promise);
    return promise;
  };
  return run;
}

const LIST_KEY = '\u0000list';

let detach: (() => void) | null = null;
/** How many screens watch each party. */
const watchers = new Map<string, number>();

export const usePartyStore = create<PartyState>((set, get) => {
  const flight = singleFlight();

  const fetchParty = (id: string) =>
    flight(id, async () => {
      try {
        const party = await api.parties.get(id);
        const { [id]: _, ...gone } = get().gone;
        const { [id]: __, ...failed } = get().failed;
        const { [id]: ___, ...closed } = get().closed;
        set({ parties: { ...get().parties, [id]: party }, gone, failed, closed });
      } catch (error) {
        if (isClosed(error)) {
          const { [id]: _, ...parties } = get().parties;
          set({ parties, closed: { ...get().closed, [id]: true } });
          return;
        }
        // A cached view stays on screen; without one the screen says what happened.
        if (!isGone(error)) {
          if (!get().parties[id]) set({ failed: { ...get().failed, [id]: true } });
          return;
        }
        const { [id]: _, ...parties } = get().parties;
        set({ parties, gone: { ...get().gone, [id]: true } });
      }
    });

  /** Sends a change of a party and shows its result; `false` when it was refused. */
  const change = async (id: string, call: () => Promise<unknown>): Promise<boolean> => {
    try {
      await call();
      void get().refreshParty(id);
      void get().refreshList();
      return true;
    } catch (error) {
      reportError(error);
      if (isGone(error) || isClosed(error)) void get().refreshParty(id);
      return false;
    }
  };

  return {
    list: null,
    parties: {},
    gone: {},
    failed: {},
    closed: {},

    refreshList: () =>
      flight(LIST_KEY, async () => {
        try {
          const list = await api.parties.list();
          // A table seen again in the list (or open again) is no longer "gone" or "closed" for this tab.
          const { gone, closed } = get();
          const seated = new Set(list.map((party) => party.id));
          const open = new Set(list.filter((party) => party.inSession).map((party) => party.id));
          set({
            list,
            gone: Object.fromEntries(Object.entries(gone).filter(([id]) => !seated.has(id))),
            closed: Object.fromEntries(Object.entries(closed).filter(([id]) => !open.has(id))),
          });
        } catch {
          // Offline: the last list stays; the next notification or reconnect refreshes it.
        }
      }),

    refreshParty: (id) => fetchParty(id),

    watch: (id) => {
      watchers.set(id, (watchers.get(id) ?? 0) + 1);
      void fetchParty(id);
      return () => {
        const left = (watchers.get(id) ?? 1) - 1;
        if (left > 0) watchers.set(id, left);
        else watchers.delete(id);
      };
    },

    create: async (input) => {
      try {
        const { id } = await api.parties.create(input);
        void get().refreshList();
        return id;
      } catch (error) {
        reportError(error);
        return null;
      }
    },
    update: (id, input) => change(id, () => api.parties.update(id, input)),
    remove: async (id) => {
      const removed = await change(id, () => api.parties.remove(id));
      if (removed) {
        const { [id]: _, ...parties } = get().parties;
        set({ parties });
      }
      return removed;
    },
    regenerateInvite: (id) => change(id, () => api.parties.regenerateInvite(id)),
    startSession: (id) => change(id, () => api.parties.startSession(id)),
    endSession: (id) => change(id, () => api.parties.endSession(id)),

    preview: async (code) => {
      try {
        return await api.invites.preview(code);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) toast.error('Партия с таким кодом не найдена');
        else reportError(error);
        return null;
      }
    },
    join: async (code) => {
      try {
        const { partyId } = await api.invites.accept(code);
        void get().refreshList();
        void get().refreshParty(partyId);
        return partyId;
      } catch (error) {
        reportError(error);
        return null;
      }
    },
    removeMember: (id, userId) => change(id, () => api.parties.removeMember(id, userId)),
    addHero: (id, characterId) => change(id, () => api.parties.addHero(id, characterId)),
    removeHero: (id, heroId) => change(id, () => api.parties.removeHero(id, heroId)),
    createNpc: (id, input) => change(id, () => api.parties.createNpc(id, input)),
    updateNpc: (id, npcId, input) => change(id, () => api.parties.updateNpc(id, npcId, input)),
    removeNpc: (id, npcId) => change(id, () => api.parties.removeNpc(id, npcId)),

    startCombat: (id, input) => change(id, () => api.combat.start(id, input)),
    addCombatants: (id, input) => change(id, () => api.combat.add(id, input)),
    removeCombatant: (id, combatantId) => change(id, () => api.combat.remove(id, combatantId)),
    setInitiative: (id, combatantId, value) => change(id, () => api.combat.setInitiative(id, combatantId, value)),
    rollNpcInitiative: (id) => change(id, () => api.combat.rollNpcs(id)),
    beginRounds: (id) => change(id, () => api.combat.begin(id)),
    nextTurn: (id, from) => change(id, () => api.combat.next(id, from)),
    endCombat: (id) => change(id, () => api.combat.end(id)),

    attach: (workspace) => {
      detach?.();
      detach = null;
      watchers.clear();
      set({ list: null, parties: {}, gone: {}, failed: {}, closed: {} });
      if (!workspace) return;

      detach = workspace.onPartyEvent((event) => {
        if (event.type !== 'changed') return;
        const { partyId } = event;
        void get().refreshList();
        const ids = partyId === null ? [...watchers.keys()] : [partyId];
        for (const id of ids) if (watchers.has(id) || get().parties[id]) void fetchParty(id);
      });
      void get().refreshList();
    },
  };
});

/** The party one of the user's characters sits at, from the party list. */
export const usePartyOfCharacter = (characterId: string | undefined): PartyListItemDto | undefined =>
  usePartyStore((s) => (characterId ? s.list?.find((party) => party.myCharacterIds.includes(characterId)) : undefined));

/** A party's view, kept fresh while the calling component is on screen. */
export function useParty(id: string | undefined): PartyDto | undefined {
  const watch = usePartyStore((s) => s.watch);
  useEffect(() => (id ? watch(id) : undefined), [id, watch]);
  return usePartyStore((s) => (id ? s.parties[id] : undefined));
}
