import type { Character, Setting } from '@itd/schema';
import { create } from 'zustand';

/** One thing a new level brought, as the burst lists it. */
export interface LevelGain {
  label: string;
  value: string;
}

export interface LevelUpMoment {
  key: number;
  from: number;
  to: number;
  setting: Setting;
  gains: LevelGain[];
}

/** The big moments played in the middle of the screen: for now, a new level. */
interface MomentState {
  levelUp: LevelUpMoment | null;
  celebrate(moment: Omit<LevelUpMoment, 'key'>): void;
  clear(): void;
}

export const useMomentStore = create<MomentState>((set) => ({
  levelUp: null,
  celebrate: (moment) => set({ levelUp: { ...moment, key: Date.now() } }),
  clear: () => set({ levelUp: null }),
}));

type Sheet = Pick<Character, 'maxHP' | 'maxHPBonus' | 'proficiencyBonus' | 'abilities' | 'spells' | 'resources'>;

/** What the hero gained between two versions of its sheet, for the burst's list. */
export function levelGains(before: Sheet, after: Sheet): LevelGain[] {
  const gains: LevelGain[] = [];
  const hp = after.maxHP + after.maxHPBonus - (before.maxHP + before.maxHPBonus);
  if (hp) gains.push({ label: 'Максимум здоровья', value: hp > 0 ? `+${hp}` : `${hp}` });
  const proficiency = after.proficiencyBonus - before.proficiencyBonus;
  if (proficiency > 0) gains.push({ label: 'Бонус мастерства', value: `+${proficiency}` });
  const abilities = after.abilities.length - before.abilities.length;
  if (abilities > 0) gains.push({ label: 'Новые умения', value: `+${abilities}` });
  const spells = after.spells.length - before.spells.length;
  if (spells > 0) gains.push({ label: 'Новые заклинания', value: `+${spells}` });
  const resources = after.resources.length - before.resources.length;
  if (resources > 0) gains.push({ label: 'Новые ресурсы', value: `+${resources}` });
  return gains;
}
