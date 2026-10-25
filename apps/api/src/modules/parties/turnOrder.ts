/** What decides a combatant's place in the round. */
export interface TurnEntry {
  id: string;
  /** `null` until rolled: such combatants act last. */
  initiative: number | null;
  /** Initiative modifier (DEX in Call of Cthulhu): breaks ties, the quicker one first. */
  bonus: number;
  /** Then the higher combat skill (Call of Cthulhu: best fighting or firearms skill); 0 when unknown. */
  skill?: number;
  joinedAt: Date;
}

/**
 * Highest initiative first; ties go to the higher modifier, then the higher combat skill, then to
 * whoever joined the fight first.
 */
export const turnOrder = <T extends TurnEntry>(entries: readonly T[]): T[] =>
  [...entries].sort(
    (a, b) =>
      Number(a.initiative === null) - Number(b.initiative === null) ||
      (b.initiative ?? 0) - (a.initiative ?? 0) ||
      b.bonus - a.bonus ||
      (b.skill ?? 0) - (a.skill ?? 0) ||
      a.joinedAt.getTime() - b.joinedAt.getTime() ||
      a.id.localeCompare(b.id),
  );

/**
 * Whose turn follows `currentId` once `leaving` are out of the fight, and whether a new round starts.
 * `null` when nobody is left.
 */
export function nextTurn<T extends TurnEntry>(
  entries: readonly T[],
  currentId: string | null,
  leaving: ReadonlySet<string> = new Set(),
): { next: T; wrapped: boolean } | null {
  const order = turnOrder(entries);
  const remaining = order.filter((entry) => !leaving.has(entry.id));
  if (remaining.length === 0) return null;
  const index = order.findIndex((entry) => entry.id === currentId);
  if (index < 0) return { next: remaining[0]!, wrapped: false };
  for (let step = 1; step <= order.length; step++) {
    const candidate = order[(index + step) % order.length]!;
    if (!leaving.has(candidate.id)) return { next: candidate, wrapped: index + step >= order.length };
  }
  return null;
}
