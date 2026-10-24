import { api } from './api/client';
import { CharacterRepository } from './local/characterRepository';
import { openCharacterDatabase } from './local/database';
import { RealtimeClient } from './sync/realtimeClient';
import { SyncEngine } from './sync/syncEngine';
import type { SessionManager } from './session/sessionManager';

/**
 * Everything bound to one signed-in account on this device: its local database, the sync engine and
 * the realtime connection. Created on sign-in, disposed on sign-out.
 */
export interface Workspace {
  userId: string;
  repository: CharacterRepository;
  sync: SyncEngine;
  /**
   * Party changes pushed by the server (`null`: reconnected, anything may have changed). Parties live
   * on the server only; this is how their views stay fresh.
   */
  onPartyChanged(listener: (partyId: string | null) => void): () => void;
  /** Starts background sync. `online: false` keeps working locally until the server is reachable. */
  start(online: boolean): void;
  dispose(): void;
}

export function createWorkspace(userId: string, session: SessionManager): Workspace {
  const repository = new CharacterRepository(openCharacterDatabase(userId), `itd-characters-${userId}`);
  const sync = new SyncEngine(repository, api.characters, `itd-sync-${userId}`);
  const partyListeners = new Set<(partyId: string | null) => void>();
  const emitParty = (partyId: string | null) => partyListeners.forEach((listener) => listener(partyId));
  const realtime = new RealtimeClient(() => session.ensureAccessToken(), {
    onCharactersChanged: () => void sync.sync(),
    onConnected: () => {
      void sync.sync();
      emitParty(null);
    },
    onPartyChanged: emitParty,
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
    onPartyChanged(listener) {
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
