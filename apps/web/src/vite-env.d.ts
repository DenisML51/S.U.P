/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API base URL; defaults to `/api` on the same origin. */
  readonly VITE_API_URL?: string;
}
