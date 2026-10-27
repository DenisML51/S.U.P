import '@fontsource/golos-text/400.css';
import '@fontsource/golos-text/500.css';
import '@fontsource/golos-text/600.css';
import '@fontsource/tektur/400.css';
import '@fontsource/tektur/500.css';
import '@fontsource/tektur/600.css';
import '@fontsource/poiret-one/400.css';
import '@fontsource/pt-mono/400.css';
import '@fontsource/cinzel/400.css';
import '@fontsource/cinzel/500.css';
import '@fontsource/cinzel/600.css';
import '@fontsource/forum/400.css';
import '@fontsource/alegreya/400.css';
import '@fontsource/alegreya/400-italic.css';
import '@fontsource/alegreya/500.css';
import '@fontsource/alegreya/700.css';
import '@fontsource/alegreya-sc/400.css';
import '@fontsource/alegreya-sc/500.css';
import '@fontsource/alegreya-sc/700.css';
import '@fontsource/marck-script/400.css';
import { DEFAULT_SETTING, type Setting } from '@itd/schema';

export interface SettingInfo {
  id: Setting;
  /** The setting's name, as players know these genres. */
  label: string;
}

/**
 * Visual settings a character can belong to. Each one's look lives in `settings/<id>.css` and its
 * ornaments in `ui/art`; this list is what the UI offers.
 */
export const SETTING_INFO: Record<Setting, SettingInfo> = {
  'sci-fi': { id: 'sci-fi', label: 'Sci-Fi' },
  lovecraft: { id: 'lovecraft', label: 'Lovecraft' },
  'elden-ring': { id: 'elden-ring', label: 'Elden Ring' },
  fable: { id: 'fable', label: 'Fantasy' },
};

export const SETTING_LIST = Object.values(SETTING_INFO);

export const settingOf = (character: { setting?: Setting } | null | undefined): Setting =>
  character?.setting ?? DEFAULT_SETTING;

/**
 * What a part of the screen wears: a character's setting, or the service's own theme for everything
 * that belongs to no world (account, hero select chrome, app settings).
 */
export type Theme = Setting | 'service';

