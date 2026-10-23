import { describe, expect, it } from 'vitest';
import { formatDice, parseDiceFormula, rollD20 } from '../src/rules/dice';

/** A random source returning the given d20 faces in order. */
const faces = (...values: number[]) => {
  let index = 0;
  return () => (values[index++]! - 1) / 20;
};

describe('d20 modes', () => {
  it('rolls one die normally', () => {
    expect(rollD20('normal', faces(7))).toEqual({ dice: [7], kept: 7 });
  });

  it('keeps the higher of two with advantage and the lower with disadvantage', () => {
    expect(rollD20('advantage', faces(4, 17))).toEqual({ dice: [4, 17], kept: 17 });
    expect(rollD20('disadvantage', faces(4, 17))).toEqual({ dice: [4, 17], kept: 4 });
  });
});

describe('formatDice', () => {
  it('writes dice from the largest and the bonus with its sign', () => {
    expect(formatDice({ 6: 2, 8: 1 }, 3)).toBe('1d8 + 2d6 + 3');
    expect(formatDice({ 20: 1 }, -2)).toBe('1d20 - 2');
    expect(formatDice({}, 4)).toBe('4');
  });

  it('round-trips through the parser', () => {
    const parsed = parseDiceFormula(formatDice({ 4: 3, 12: 1 }, -1));
    expect(parsed.bonus).toBe(-1);
    expect(parsed.dice.map((d) => [d.sides, d.count])).toEqual([
      [12, 1],
      [4, 3],
    ]);
  });
});
