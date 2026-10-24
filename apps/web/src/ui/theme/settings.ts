import '@fontsource/golos-text/400.css';
import '@fontsource/golos-text/500.css';
import '@fontsource/golos-text/600.css';
import '@fontsource/cormorant-sc/500.css';
import '@fontsource/cormorant-sc/600.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/forum/400.css';
import '@fontsource/tektur/400.css';
import '@fontsource/tektur/500.css';
import '@fontsource/tektur/600.css';
import '@fontsource/oranienbaum/400.css';
import { DEFAULT_SETTING, type Setting } from '@itd/schema';

export interface SettingInfo {
  id: Setting;
  /** Shown when choosing a character's universe. */
  label: string;
  hint: string;
}

/**
 * Visual settings a character can belong to. Colours, fonts and ornaments live in `tokens.css`
 * under `[data-setting="…"]`; this list is what the UI offers.
 */
export const SETTING_INFO: Record<Setting, SettingInfo> = {
  'high-fantasy': {
    id: 'high-fantasy',
    label: 'Высокое фэнтези',
    hint: 'Королевства, магия, эпос',
  },
  grimdark: {
    id: 'grimdark',
    label: 'Готический гримдарк',
    hint: 'Империи, война без конца, вера и сталь',
  },
  'sci-fi': {
    id: 'sci-fi',
    label: 'Научная фантастика',
    hint: 'Корабли, технологии, далёкие миры',
  },
  'dark-fantasy': {
    id: 'dark-fantasy',
    label: 'Тёмное фэнтези',
    hint: 'Ужас, безумие, гниющий мир',
  },
};

export const SETTING_LIST = Object.values(SETTING_INFO);

export const settingOf = (character: { setting?: Setting } | null | undefined): Setting =>
  character?.setting ?? DEFAULT_SETTING;
