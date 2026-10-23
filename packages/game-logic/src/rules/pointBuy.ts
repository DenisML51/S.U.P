import { ATTRIBUTE_MAX, ATTRIBUTE_MIN, INITIAL_POINTS, POINT_BUY_COSTS } from '../content/progression';

export type AttributeScores = Record<string, number>;

export const pointBuyCost = (score: number): number => POINT_BUY_COSTS[score] ?? 0;

export const pointsUsed = (scores: AttributeScores): number =>
  Object.values(scores).reduce((total, score) => total + pointBuyCost(score), 0);

export const pointsRemaining = (scores: AttributeScores): number => INITIAL_POINTS - pointsUsed(scores);

export function canIncrement(scores: AttributeScores, attributeId: string): boolean {
  const score = scores[attributeId] ?? ATTRIBUTE_MIN;
  if (score >= ATTRIBUTE_MAX) return false;
  return pointsRemaining(scores) >= pointBuyCost(score + 1) - pointBuyCost(score);
}

export const canDecrement = (scores: AttributeScores, attributeId: string): boolean =>
  (scores[attributeId] ?? ATTRIBUTE_MIN) > ATTRIBUTE_MIN;
