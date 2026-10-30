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
  /**
   * A prelude to a level-up window: instead of letting go, the moment settles as a small emblem at
   * the top of the screen and calls this as it does, to open the window under it.
   */
  onDock?: () => void;
}

/** The big moments played in the middle of the screen: for now, a new level. */
interface MomentState {
  levelUp: LevelUpMoment | null;
  /** A prelude's emblem has come to rest on the level-up window's edge. */
  landed: boolean;
  celebrate(moment: Omit<LevelUpMoment, 'key'>): void;
  clear(): void;
  land(): void;
  /** Lets a prelude's settled emblem go along with its window; a plain moment stays. */
  release(): void;
}

export const useMomentStore = create<MomentState>((set) => ({
  levelUp: null,
  landed: false,
  celebrate: (moment) => set({ levelUp: { ...moment, key: Date.now() }, landed: false }),
  clear: () => set({ levelUp: null, landed: false }),
  land: () => set({ landed: true }),
  release: () => set((s) => (s.levelUp?.onDock ? { levelUp: null, landed: false } : s)),
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
