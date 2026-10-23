import type {
  AuthResponse,
  ChangePasswordRequest,
  CharacterRecordDto,
  CharacterRevisionDto,
  CharacterRevisionSummaryDto,
  DeletedCharacterDto,
  ErrorCode,
  ErrorResponse,
  LoginRequest,
  RegisterRequest,
  SyncResponse,
  UserDto,
} from '@itd/schema';

export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

/** Identifies this browser tab to the server, so the tab can ignore notifications about its own writes. */
export const CLIENT_SESSION_ID = crypto.randomUUID();

/** The server answered with an error. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly body: ErrorResponse & Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** The server could not be reached at all (offline, DNS, server down). */
export class NetworkError extends Error {
  constructor(cause: unknown) {
    super('Нет соединения с сервером', { cause });
    this.name = 'NetworkError';
  }
}

export const isUnauthorized = (error: unknown): boolean => error instanceof ApiError && error.status === 401;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** JSON body. */
  body?: unknown;
  /** Binary body sent as is, with its own content type (uploads). */
  file?: Blob;
  /** Attach the access token and refresh it once on 401. */
  authenticated?: boolean;
}

/**
 * Supplies the access token and renews it. Implemented by the session module; kept as an interface
 * so the transport does not depend on how sessions are stored.
 */
export interface TokenProvider {
  getAccessToken(): string | null;
  /** Obtains a new access token; resolves to null when the session is gone. */
  refreshAccessToken(): Promise<string | null>;
}

export class ApiClient {
  private tokens: TokenProvider | null = null;

  setTokenProvider(tokens: TokenProvider): void {
    this.tokens = tokens;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { authenticated = true } = options;
    const response = await this.send(path, options, authenticated ? this.tokens?.getAccessToken() : null);

    if (response.status === 401 && authenticated && this.tokens) {
      const token = await this.tokens.refreshAccessToken();
      if (token) return this.parse<T>(await this.send(path, options, token));
    }
    return this.parse<T>(response);
  }

  private async send(path: string, options: RequestOptions, token: string | null | undefined): Promise<Response> {
    const headers: Record<string, string> = {
      'x-itd-client': 'web',
      'x-client-session': CLIENT_SESSION_ID,
    };
    if (options.file) headers['content-type'] = options.file.type || 'application/octet-stream';
    else if (options.body !== undefined) headers['content-type'] = 'application/json';
    if (token) headers.authorization = `Bearer ${token}`;

    try {
      return await fetch(`${API_BASE}${path}`, {
        method: options.method ?? 'GET',
        headers,
        body: options.file ?? (options.body === undefined ? undefined : JSON.stringify(options.body)),
        credentials: 'same-origin',
      });
    } catch (error) {
      throw new NetworkError(error);
    }
  }

  private async parse<T>(response: Response): Promise<T> {
    if (response.status === 204) return undefined as T;
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const error = (body ?? {}) as ErrorResponse & Record<string, unknown>;
      // A gateway error (proxy up, API down) is a connectivity problem, not an answer.
      if (response.status >= 502 && response.status <= 504 && !error.error) throw new NetworkError(response.statusText);
      throw new ApiError(response.status, error.error ?? 'internal_error', error.message ?? response.statusText, error);
    }
    return body as T;
  }
}

export const apiClient = new ApiClient();

const encode = encodeURIComponent;

/** Typed endpoints of the API. */
export interface UploadedAsset {
  id: string;
  url: string;
  width: number;
  height: number;
}

/** URL of an uploaded image; immutable, so browsers keep it cached for offline use. */
export const assetUrl = (id: string): string => `${API_BASE}/assets/${encodeURIComponent(id)}`;

export const api = {
  auth: {
    config: () => apiClient.request<{ registrationEnabled: boolean }>('/auth/config', { authenticated: false }),
    register: (body: RegisterRequest) =>
      apiClient.request<AuthResponse>('/auth/register', { method: 'POST', body, authenticated: false }),
    login: (body: LoginRequest) =>
      apiClient.request<AuthResponse>('/auth/login', { method: 'POST', body, authenticated: false }),
    refresh: () => apiClient.request<AuthResponse>('/auth/refresh', { method: 'POST', authenticated: false }),
    logout: () => apiClient.request<void>('/auth/logout', { method: 'POST', authenticated: false }),
  },
  account: {
    me: () => apiClient.request<UserDto>('/me'),
    update: (displayName: string) => apiClient.request<UserDto>('/me', { method: 'PATCH', body: { displayName } }),
    changePassword: (body: ChangePasswordRequest) =>
      apiClient.request<AuthResponse>('/me/password', { method: 'POST', body }),
  },
  assets: {
    upload: (file: Blob) => apiClient.request<UploadedAsset>('/assets', { method: 'POST', file }),
  },
  characters: {
    pull: (since: string) => apiClient.request<SyncResponse>(`/characters?since=${encode(since)}`),
    get: (id: string) => apiClient.request<CharacterRecordDto>(`/characters/${encode(id)}`),
    put: (id: string, baseRevision: number | null, data: unknown) =>
      apiClient.request<CharacterRecordDto>(`/characters/${encode(id)}`, { method: 'PUT', body: { baseRevision, data } }),
    remove: (id: string, baseRevision: number) =>
      apiClient.request<CharacterRecordDto>(`/characters/${encode(id)}?baseRevision=${baseRevision}`, {
        method: 'DELETE',
      }),
    restore: (id: string) =>
      apiClient.request<CharacterRecordDto>(`/characters/${encode(id)}/restore`, { method: 'POST' }),
    deleted: () => apiClient.request<DeletedCharacterDto[]>('/characters/deleted'),
    revisions: (id: string) =>
      apiClient.request<CharacterRevisionSummaryDto[]>(`/characters/${encode(id)}/revisions`),
    revision: (id: string, revision: number) =>
      apiClient.request<CharacterRevisionDto>(`/characters/${encode(id)}/revisions/${revision}`),
  },
};
