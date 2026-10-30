import type { Theme } from '../theme/settings';
import { SCI_FI_ART } from './sciFi';
import { LOVECRAFT_ART } from './lovecraft';
import { ELDEN_RING_ART } from './eldenRing';
import { FABLE_ART } from './fable';
import { SERVICE_ART } from './service';
import type { SettingArt } from './types';

export const SETTING_ART: Record<Theme, SettingArt> = {
  service: SERVICE_ART,
  'sci-fi': SCI_FI_ART,
  lovecraft: LOVECRAFT_ART,
  'elden-ring': ELDEN_RING_ART,
  fable: FABLE_ART,
};

export type { SettingArt };
