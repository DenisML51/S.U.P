import type { Setting } from '@itd/schema';
import { DARK_FANTASY_ART } from './darkFantasy';
import { HIGH_FANTASY_ART } from './highFantasy';
import { SCI_FI_ART } from './sciFi';
import type { SettingArt } from './types';

export const SETTING_ART: Record<Setting, SettingArt> = {
  'high-fantasy': HIGH_FANTASY_ART,
  'sci-fi': SCI_FI_ART,
  'dark-fantasy': DARK_FANTASY_ART,
};

export type { SettingArt };
