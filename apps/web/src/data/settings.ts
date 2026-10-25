/**
 * Per-device interface preferences. They describe this screen, not the character, so they stay in
 * localStorage and are not synced. Keys are the ones the desktop app used, so preferences carry over.
 */
/** How the madness of an investigator shows on the sheet: in full, calm (no strobe, flicker or sway), or not at all. */
export type MadnessEffects = 'full' | 'calm' | 'off';
export const MADNESS_EFFECTS: MadnessEffects[] = ['full', 'calm', 'off'];

export interface AppSettings {
  notifications: boolean;
  fullscreen: boolean;
  madnessEffects: MadnessEffects;
}

const KEYS: Record<keyof AppSettings, string> = {
  notifications: 'trpg_notifications',
  fullscreen: 'trpg_fullscreen',
  madnessEffects: 'trpg_madness_effects',
};

const DEFAULTS: AppSettings = { notifications: true, fullscreen: false, madnessEffects: 'full' };

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
  const effects = read(KEYS.madnessEffects) as MadnessEffects | null;
  return {
    notifications: flag('notifications'),
    fullscreen: flag('fullscreen'),
    madnessEffects: effects && MADNESS_EFFECTS.includes(effects) ? effects : DEFAULTS.madnessEffects,
  };
}

/** The madness effects as shown: "full" turns calm for those who asked the system for reduced motion. */
export function effectiveMadnessEffects(chosen: MadnessEffects, reducedMotion: boolean): MadnessEffects {
  return chosen === 'full' && reducedMotion ? 'calm' : chosen;
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
