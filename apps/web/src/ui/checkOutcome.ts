import type { TableCheck } from '@itd/schema';

/** How a check with a target came out; a percentile skill also tells hard and extreme successes apart. */
export type CheckOutcome = 'critical' | 'extreme' | 'hard' | 'success' | 'failure' | 'fumble';

/**
 * The outcome of a throw against its target, or `null` when it had none. A difficulty is met or
 * beaten by the total; a percentile skill is rolled at or under (a fifth of it extreme, half hard,
 * 01 a critical; 100 — or 96 and up for a skill under 50 — a fumble).
 */
export const checkOutcome = (check: Pick<TableCheck, 'target' | 'under' | 'total'>): CheckOutcome | null => {
  const { target, total } = check;
  if (target === undefined) return null;
  if (!check.under) return total >= target ? 'success' : 'failure';
  if (total === 1) return 'critical';
  if (total >= 100 || (target < 50 && total >= 96)) return 'fumble';
  if (total <= Math.floor(target / 5)) return 'extreme';
  if (total <= Math.floor(target / 2)) return 'hard';
  return total <= target ? 'success' : 'failure';
};

export const OUTCOME_LABEL: Record<CheckOutcome, string> = {
  critical: 'Критический успех',
  extreme: 'Экстремальный успех',
  hard: 'Трудный успех',
  success: 'Успех',
  failure: 'Провал',
  fumble: 'Критический провал',
};

export const outcomeSucceeded = (outcome: CheckOutcome) => outcome !== 'failure' && outcome !== 'fumble';
