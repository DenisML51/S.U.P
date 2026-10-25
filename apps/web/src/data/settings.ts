/**
 * Per-device interface preferences. They describe this screen, not the character, so they stay in
 * localStorage and are not synced. Keys are the ones the desktop app used, so preferences carry over.
 */
export interface AppSettings {
  notifications: boolean;
  fullscreen: boolean;
  homeLayout: HomeLayout;
}

/** How the home page lays out one's heroes and tables. */
export const HOME_LAYOUTS = ['hub', 'menu', 'mosaic', 'cinema'] as const;
export type HomeLayout = (typeof HOME_LAYOUTS)[number];

const KEYS: Record<keyof AppSettings, string> = {
  notifications: 'trpg_notifications',
  fullscreen: 'trpg_fullscreen',
  homeLayout: 'itd.homeLayout',
};

const DEFAULTS: AppSettings = { notifications: true, fullscreen: false, homeLayout: 'hub' };

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

export function loadSettings(): AppSettings {
  const flag = (name: 'notifications' | 'fullscreen') => {
    const value = read(KEYS[name]);
    return value === null ? DEFAULTS[name] : value === 'true';
  };
  const layout = read(KEYS.homeLayout);
  return {
    notifications: flag('notifications'),
    fullscreen: flag('fullscreen'),
    homeLayout: HOME_LAYOUTS.find((known) => known === layout) ?? DEFAULTS.homeLayout,
  };
}
export function saveSettings(settings: AppSettings): void {
  try {
    for (const name of Object.keys(KEYS) as (keyof AppSettings)[]) {
      localStorage.setItem(KEYS[name], String(settings[name]));
    }
  } catch {
    // Not persisted (storage unavailable); the settings still apply for this session.
  }
}

/** Browser full screen; must be called from a user gesture to enter. */
export async function applyFullscreen(enabled: boolean): Promise<void> {
  try {
    if (enabled && !document.fullscreenElement) await document.documentElement.requestFullscreen();
    if (!enabled && document.fullscreenElement) await document.exitFullscreen();
  } catch {
    // Refused by the browser (no user gesture, iframe policy): nothing else to do.
  }
}
