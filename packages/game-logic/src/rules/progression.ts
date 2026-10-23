import type { Character } from '@itd/schema';
import { EXPERIENCE_BY_LEVEL, MAX_LEVEL } from '../content/progression';

export const getProficiencyBonus = (level: number): number => {
  if (level >= 17) return 6;
  if (level >= 13) return 5;
  if (level >= 9) return 4;
  if (level >= 5) return 3;
  return 2;
};

/** Experience needed to reach `level`; levels past the table cost as much as the last one. */
export const experienceForLevel = (level: number): number =>
  EXPERIENCE_BY_LEVEL[Math.min(Math.max(level, 1), MAX_LEVEL)] ?? 0;

/** The highest level the given amount of experience is enough for. */
export function levelForExperience(experience: number): number {
  let level = 1;
  while (level < MAX_LEVEL && experience >= experienceForLevel(level + 1)) level += 1;
  return level;
}

export interface ExperienceProgress {
  currentLevelXP: number;
  nextLevelXP: number;
  /** Progress towards the next level, 0–100. Always 100 at the level cap. */
  progress: number;
  canLevelUp: boolean;
  isMaxLevel: boolean;
}

export function experienceProgress(level: number, experience: number): ExperienceProgress {
  const isMaxLevel = level >= MAX_LEVEL;
  const currentLevelXP = experienceForLevel(level);
  const nextLevelXP = isMaxLevel ? currentLevelXP : experienceForLevel(level + 1);
  const span = nextLevelXP - currentLevelXP;
  const progress = isMaxLevel || span <= 0 ? 100 : ((experience - currentLevelXP) / span) * 100;

  return {
    currentLevelXP,
    nextLevelXP,
    progress: Math.min(100, Math.max(0, progress)),
    canLevelUp: !isMaxLevel && experience >= nextLevelXP,
    isMaxLevel,
  };
}

/** Sets experience and level together, keeping the proficiency bonus in step with the level. */
export const setExperience = (character: Character, experience: number, level: number): Character => ({
  ...character,
  experience,
  level,
  proficiencyBonus: getProficiencyBonus(level),
});
