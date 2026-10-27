import '@fontsource/golos-text/400.css';
import '@fontsource/golos-text/500.css';
import '@fontsource/golos-text/600.css';
import '@fontsource/cormorant-sc/500.css';
import '@fontsource/cormorant-sc/600.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/tektur/400.css';
import '@fontsource/tektur/500.css';
import '@fontsource/tektur/600.css';
import '@fontsource/old-standard-tt/400.css';
import '@fontsource/old-standard-tt/700.css';
import '@fontsource/oswald/400.css';
import '@fontsource/oswald/500.css';
import '@fontsource/oswald/600.css';
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
import '@fontsource/cinzel-decorative/700.css';
import '@fontsource/cormorant-unicase/700.css';
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
  'high-fantasy': { id: 'high-fantasy', label: 'High Fantasy' },
  'sci-fi': { id: 'sci-fi', label: 'Sci-Fi' },
  'dark-fantasy': { id: 'dark-fantasy', label: 'Dark Fantasy' },
  cyberpunk: { id: 'cyberpunk', label: 'Cyberpunk' },
  lovecraft: { id: 'lovecraft', label: 'Lovecraft' },
  'elden-ring': { id: 'elden-ring', label: 'Elden Ring' },
  fable: { id: 'fable', label: 'Fable' },
};

export const SETTING_LIST = Object.values(SETTING_INFO);

export const settingOf = (character: { setting?: Setting } | null | undefined): Setting =>
  character?.setting ?? DEFAULT_SETTING;

/**
 * What a part of the screen wears: a character's setting, or the service's own theme for everything
 * that belongs to no world (account, hero select chrome, app settings).
 */
export type Theme = Setting | 'service';

