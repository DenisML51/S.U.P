import type { PartyMessageDto } from '@itd/schema';
import { api } from './api/client';
import { CharacterRepository } from './local/characterRepository';
import { openCharacterDatabase } from './local/database';
import { RealtimeClient } from './sync/realtimeClient';
import { SyncEngine } from './sync/syncEngine';
import type { SessionManager } from './session/sessionManager';

/** What the server pushes about parties: a change to fetch (`partyId` null: reconnected), or a message. */
export type PartyEvent =
  | { type: 'changed'; partyId: string | null }
  | { type: 'message'; partyId: string; message: PartyMessageDto };

/**
 * Everything bound to one signed-in account on this device: its local database, the sync engine and
 * the realtime connection. Created on sign-in, disposed on sign-out.
 */
export interface Workspace {
  userId: string;
  repository: CharacterRepository;
  sync: SyncEngine;
  /** Party events pushed by the server. Parties live on the server only; this keeps their views fresh. */
  onPartyEvent(listener: (event: PartyEvent) => void): () => void;
  /** Starts background sync. `online: false` keeps working locally until the server is reachable. */
  start(online: boolean): void;
  dispose(): void;
}

export function createWorkspace(userId: string, session: SessionManager): Workspace {
  const repository = new CharacterRepository(openCharacterDatabase(userId), `itd-characters-${userId}`);
  const sync = new SyncEngine(repository, api.characters, `itd-sync-${userId}`);
  const partyListeners = new Set<(event: PartyEvent) => void>();
  const emitParty = (event: PartyEvent) => partyListeners.forEach((listener) => listener(event));
  const realtime = new RealtimeClient(() => session.ensureAccessToken(), {
    onCharactersChanged: () => void sync.sync(),
    onConnected: () => {
      void sync.sync();
      emitParty({ type: 'changed', partyId: null });
    },
    onPartyChanged: (partyId) => emitParty({ type: 'changed', partyId }),
    onPartyMessage: (partyId, message) => emitParty({ type: 'message', partyId, message }),
  });

  const unsubscribe = repository.subscribe((change) => {
    if (change.source === 'local') sync.schedulePush();
  });
  const onOnline = () => {
    realtime.reconnectNow();
    void sync.sync();
  };
  const onVisible = () => {
    if (document.visibilityState === 'visible') void sync.sync();
  };

  return {
    userId,
    repository,
    sync,
    onPartyEvent(listener) {
      partyListeners.add(listener);
      return () => partyListeners.delete(listener);
    },
    start(online) {
      window.addEventListener('online', onOnline);
      document.addEventListener('visibilitychange', onVisible);
      realtime.start();
      if (online) void sync.sync();
    },
    dispose() {
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
      unsubscribe();
      partyListeners.clear();
      realtime.stop();
      sync.stop();
      repository.close();
    },
  };
}
