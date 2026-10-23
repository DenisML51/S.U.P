/**
 * Per-device interface preferences. They describe this screen, not the character, so they stay in
 * localStorage and are not synced. Keys are the ones the desktop app used, so preferences carry over.
 */
export interface AppSettings {
  compactCards: boolean;
  notifications: boolean;
  fullscreen: boolean;
}

const KEYS: Record<keyof AppSettings, string> = {
  compactCards: 'trpg_compact_cards',
  notifications: 'trpg_notifications',
  fullscreen: 'trpg_fullscreen',
};

const DEFAULTS: AppSettings = { compactCards: false, notifications: true, fullscreen: false };

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

export function loadSettings(): AppSettings {
  const flag = (name: keyof AppSettings) => {
    const value = read(KEYS[name]);
    return value === null ? DEFAULTS[name] : value === 'true';
  };
  return { compactCards: flag('compactCards'), notifications: flag('notifications'), fullscreen: flag('fullscreen') };
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
