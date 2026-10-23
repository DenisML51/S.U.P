export const MAX_LEVEL = 20;

/** Total experience required to reach each level. */
export const EXPERIENCE_BY_LEVEL: Record<number, number> = {
  1: 0,
  2: 300,
  3: 900,
  4: 2700,
  5: 6500,
  6: 14000,
  7: 23000,
  8: 34000,
  9: 48000,
  10: 64000,
  11: 85000,
  12: 100000,
  13: 120000,
  14: 140000,
  15: 165000,
  16: 195000,
  17: 225000,
  18: 265000,
  19: 305000,
  20: 355000,
};

/** Point-buy cost of each attribute score during character creation. */
export const POINT_BUY_COSTS: Record<number, number> = {
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 7,
  15: 9,
};

export const INITIAL_POINTS = 27;
export const ATTRIBUTE_MIN = 8;
export const ATTRIBUTE_MAX = 15;
export const ATTRIBUTE_START = 8;

/** Mental strength of classes that do not declare their own. */
export const DEFAULT_MENTAL_STRENGTH = 50;
export const MAX_SANITY_CAP = 100;

export const DEFAULT_SPEED = 30;
export const BASE_ARMOR_CLASS = 10;
export const SHIELD_ARMOR_BONUS = 2;
export const BASE_HIT_POINTS = 10;
