import type { Theme } from '../theme/settings';
import { DARK_FANTASY_ART } from './darkFantasy';
import { HIGH_FANTASY_ART } from './highFantasy';
import { SCI_FI_ART } from './sciFi';
import { CYBERPUNK_ART } from './cyberpunk';
import { LOVECRAFT_ART } from './lovecraft';
import { SERVICE_ART } from './service';
import type { SettingArt } from './types';

export const SETTING_ART: Record<Theme, SettingArt> = {
  service: SERVICE_ART,
  'high-fantasy': HIGH_FANTASY_ART,
  'sci-fi': SCI_FI_ART,
  'dark-fantasy': DARK_FANTASY_ART,
  cyberpunk: CYBERPUNK_ART,
  lovecraft: LOVECRAFT_ART,
};

export type { SettingArt };
