/// <reference types="vite/client" />
/// <reference types="unplugin-icons/types/react" />

interface ImportMetaEnv {
  /** API base URL; defaults to `/api` on the same origin. */
  readonly VITE_API_URL?: string;
}

declare module 'virtual:i18n/en' {
  import type { CompiledDictionary } from './i18n/engine';
  const dictionary: CompiledDictionary;
  export default dictionary;
}
