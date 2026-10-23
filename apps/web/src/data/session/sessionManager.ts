import type { AuthResponse, UserDto } from '@itd/schema';
import { NetworkError, api, apiClient, isUnauthorized, type TokenProvider } from '../api/client';

const CACHED_USER_KEY = 'itd.session.user';
const REFRESH_LOCK = 'itd-auth-refresh';
/** Renew the access token this long before it expires. */
const REFRESH_AHEAD_MS = 60_000;

export type BootResult =
  | { kind: 'authenticated'; user: UserDto }
  /** The server is unreachable but this device knows who was signed in: work offline. */
  | { kind: 'offline'; user: UserDto }
  | { kind: 'anonymous' };

const readCachedUser = (): UserDto | null => {
  try {
    const raw = localStorage.getItem(CACHED_USER_KEY);
    return raw ? (JSON.parse(raw) as UserDto) : null;
  } catch {
    return null;
  }
};

const writeCachedUser = (user: UserDto | null) => {
  try {
    if (user) localStorage.setItem(CACHED_USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(CACHED_USER_KEY);
  } catch {
    // Storage may be unavailable (private mode); the session still works for this page load.
  }
};

/**
 * Owns the access token (memory only, never persisted) and the refresh cycle. The refresh token
 * lives in an httpOnly cookie the page cannot read.
 */
export class SessionManager implements TokenProvider {
  private accessToken: string | null = null;
  private expiresAt = 0;
  private refreshing: Promise<string | null> | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | undefined;
  private onSessionLost: (() => void) | null = null;
  private onUserChanged: ((user: UserDto) => void) | null = null;

  constructor() {
    apiClient.setTokenProvider(this);
  }

  /** Called when the server ends the session (refresh rejected). */
  setListeners(listeners: { onSessionLost: () => void; onUserChanged: (user: UserDto) => void }): void {
    this.onSessionLost = listeners.onSessionLost;
    this.onUserChanged = listeners.onUserChanged;
  }

  get cachedUser(): UserDto | null {
    return readCachedUser();
  }

  /** Restores the session on page load from the refresh cookie. */
  async boot(): Promise<BootResult> {
    try {
      const response = await api.auth.refresh();
      this.accept(response);
      return { kind: 'authenticated', user: response.user };
    } catch (error) {
      const cached = readCachedUser();
      if (error instanceof NetworkError && cached) return { kind: 'offline', user: cached };
      if (isUnauthorized(error)) writeCachedUser(null);
      return { kind: 'anonymous' };
    }
  }

  async login(email: string, password: string): Promise<UserDto> {
    const response = await api.auth.login({ email, password });
    this.accept(response);
    return response.user;
  }

  async register(email: string, password: string, displayName: string): Promise<UserDto> {
    const response = await api.auth.register({ email, password, displayName });
    this.accept(response);
    return response.user;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    this.accept(await api.account.changePassword({ currentPassword, newPassword }));
  }

  async updateDisplayName(displayName: string): Promise<UserDto> {
    const user = await api.account.update(displayName);
    writeCachedUser(user);
    this.onUserChanged?.(user);
    return user;
  }

  async logout(): Promise<void> {
    try {
      await api.auth.logout();
    } finally {
      this.clear();
    }
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  /** A token valid for at least a little while, refreshing first if needed. */
  async ensureAccessToken(): Promise<string | null> {
    if (this.accessToken && this.expiresAt - Date.now() > 30_000) return this.accessToken;
    return this.refreshAccessToken();
  }

  /** Single flight per tab; the Web Lock serialises tabs so a rotated cookie is never replayed. */
  refreshAccessToken(): Promise<string | null> {
    this.refreshing ??= this.lockedRefresh().finally(() => {
      this.refreshing = null;
    });
    return this.refreshing;
  }

  private async lockedRefresh(): Promise<string | null> {
    const run = async (): Promise<string | null> => {
      try {
        const response = await api.auth.refresh();
        this.accept(response);
        return response.accessToken;
      } catch (error) {
        if (isUnauthorized(error)) {
          this.clear();
          this.onSessionLost?.();
        }
        return null;
      }
    };
    const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
    return locks ? locks.request(REFRESH_LOCK, run) : run();
  }

  private accept(response: AuthResponse): void {
    this.accessToken = response.accessToken;
    this.expiresAt = Date.parse(response.accessTokenExpiresAt);
    writeCachedUser(response.user);
    this.onUserChanged?.(response.user);

    clearTimeout(this.refreshTimer);
    const delay = Math.max(5_000, this.expiresAt - Date.now() - REFRESH_AHEAD_MS);
    this.refreshTimer = setTimeout(() => void this.refreshAccessToken(), delay);
  }

  private clear(): void {
    clearTimeout(this.refreshTimer);
    this.accessToken = null;
    this.expiresAt = 0;
    writeCachedUser(null);
  }
}

export const sessionManager = new SessionManager();
