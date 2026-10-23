import type { UserDto } from '@itd/schema';
import Dexie from 'dexie';
import { toast } from 'react-hot-toast';
import { create } from 'zustand';
import { api } from '../data/api/client';
import { importLegacyBrowserStorage } from '../data/legacy/browserStorageImport';
import { databaseNameFor } from '../data/local/database';
import { sessionManager } from '../data/session/sessionManager';
import type { SyncStatus } from '../data/sync/syncEngine';
import { createWorkspace, type Workspace } from '../data/workspace';
import { useCharacterStore } from './useCharacterStore';

export type SessionStatus = 'booting' | 'anonymous' | 'authenticated';

const INITIAL_SYNC: SyncStatus = { state: 'idle', pending: 0, rejected: [], lastSyncedAt: null, lastError: null };

interface SessionState {
  status: SessionStatus;
  user: UserDto | null;
  /** Signed in from cache while the server is unreachable. */
  offline: boolean;
  registrationEnabled: boolean;
  sync: SyncStatus;

  boot(): Promise<void>;
  login(email: string, password: string): Promise<void>;
  register(email: string, password: string, displayName: string): Promise<void>;
  /**
   * Signs out and removes this account's data from the device. Refuses (returning the number of
   * unsynced changes) unless `force` is set, so the UI can warn before anything is lost.
   */
  logout(options?: { force?: boolean }): Promise<{ unsynced: number }>;
  syncNow(): Promise<void>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  updateDisplayName(displayName: string): Promise<void>;
}

let workspace: Workspace | null = null;
let unsubscribeSync: (() => void) | null = null;
let bootOnce: Promise<void> | null = null;

export const useSessionStore = create<SessionState>((set, get) => {
  const openWorkspace = async (user: UserDto, online: boolean) => {
    if (workspace?.userId === user.id) return;
    closeWorkspace();

    const current = createWorkspace(user.id, sessionManager);
    workspace = current;
    // Old browser-era characters are imported only once this device has the account's server
    // state: importing into an empty local copy would race the server copies of the same sheets.
    let legacyChecked = false;
    unsubscribeSync = current.sync.subscribe((sync) => {
      set({ sync });
      if (sync.state === 'unauthorized') void handleSessionLost();
      if (!legacyChecked && sync.state === 'idle' && sync.lastSyncedAt !== null) {
        legacyChecked = true;
        void importLegacy(current, user.id);
      }
    });
    await useCharacterStore.getState().attachWorkspace(current);
    current.start(online);
  };

  const importLegacy = async (target: Workspace, userId: string) => {
    const legacy = await importLegacyBrowserStorage(target.repository, userId);
    if (workspace !== target) return;
    if (legacy.imported.length > 0) {
      toast.success(`Перенесены персонажи из старой версии: ${legacy.imported.join(', ')}`, { duration: 6000 });
      await useCharacterStore.getState().reloadList();
    }
    if (legacy.failed.length > 0) {
      toast.error(`Не удалось перенести ${legacy.failed.length} старых персонажей`);
      console.warn('Legacy import failures', legacy.failed);
    }
  };

  const closeWorkspace = () => {
    unsubscribeSync?.();
    unsubscribeSync = null;
    workspace?.dispose();
    workspace = null;
    void useCharacterStore.getState().attachWorkspace(null);
  };

  const handleSessionLost = async () => {
    if (get().status !== 'authenticated') return;
    // Local data stays on the device: signing in again as the same user resumes syncing it.
    closeWorkspace();
    set({ status: 'anonymous', user: null, offline: false, sync: INITIAL_SYNC });
    toast.error('Сессия истекла. Войдите снова — несохранённые изменения не потеряются.');
  };

  sessionManager.setListeners({
    onSessionLost: () => void handleSessionLost(),
    onUserChanged: (user) => {
      if (get().status === 'authenticated') set({ user, offline: false });
    },
  });

  const signedIn = async (user: UserDto, online: boolean) => {
    set({ status: 'authenticated', user, offline: !online });
    await openWorkspace(user, online);
  };

  const bootSession = async () => {
    api.auth
      .config()
      .then(({ registrationEnabled }) => set({ registrationEnabled }))
      .catch(() => {});

    const result = await sessionManager.boot();
    if (result.kind === 'anonymous') set({ status: 'anonymous' });
    else await signedIn(result.user, result.kind === 'authenticated');
  };

  return {
    status: 'booting',
    user: null,
    offline: false,
    registrationEnabled: true,
    sync: INITIAL_SYNC,

    boot() {
      // React StrictMode runs mount effects twice in development; the session boots once.
      bootOnce ??= bootSession();
      return bootOnce;
    },

    async login(email, password) {
      await signedIn(await sessionManager.login(email, password), true);
    },

    async register(email, password, displayName) {
      await signedIn(await sessionManager.register(email, password, displayName), true);
    },

    async logout(options = {}) {
      const current = workspace;
      if (current && !options.force) {
        await current.sync.sync().catch(() => {});
        const unsynced = await current.repository.pendingCount();
        if (unsynced > 0) return { unsynced };
      }

      const userId = get().user?.id;
      await sessionManager.logout().catch(() => {});
      closeWorkspace();
      if (userId) await Dexie.delete(databaseNameFor(userId)).catch(() => {});
      set({ status: 'anonymous', user: null, offline: false, sync: INITIAL_SYNC });
      return { unsynced: 0 };
    },

    async syncNow() {
      await workspace?.sync.sync();
    },

    async changePassword(currentPassword, newPassword) {
      await sessionManager.changePassword(currentPassword, newPassword);
    },

    async updateDisplayName(displayName) {
      await sessionManager.updateDisplayName(displayName);
    },
  };
});
