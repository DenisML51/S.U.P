import { describe, expect, it } from 'vitest';
import { receiveCoins, spendCoins, totalCopper } from '../src/rules/currency';

const purse = (gold: number, silver: number, copper: number) => ({ gold, silver, copper });

describe('currency', () => {
  it('totals the purse in copper', () => {
    expect(totalCopper(purse(1, 2, 3))).toBe(123);
  });

  it('receives coins of one kind', () => {
    expect(receiveCoins(purse(1, 0, 0), 5, 'silver')).toEqual(purse(1, 5, 0));
  });

  it('pays with the named coin when there are enough', () => {
    expect(spendCoins(purse(5, 0, 0), 3, 'gold')).toEqual(purse(2, 0, 0));
  });

  it('tops up with smaller coins before breaking a larger one', () => {
    expect(spendCoins(purse(3, 50, 0), 5, 'gold')).toEqual(purse(0, 30, 0));
  });

  it('breaks a larger coin and returns the change', () => {
    expect(spendCoins(purse(1, 2, 0), 5, 'silver')).toEqual(purse(0, 7, 0));
    expect(spendCoins(purse(1, 0, 0), 3, 'copper')).toEqual(purse(0, 9, 7));
  });

  it('breaks several coins when one is not enough', () => {
    expect(spendCoins(purse(3, 0, 0), 25, 'silver')).toEqual(purse(0, 5, 0));
  });

  it('refuses when the purse holds too little', () => {
    expect(spendCoins(purse(0, 9, 9), 1, 'gold')).toBeNull();
  });

  it('never changes the total by more than the price', () => {
    const before = purse(2, 13, 41);
    const after = spendCoins(before, 37, 'silver')!;
    expect(totalCopper(before) - totalCopper(after)).toBe(370);
  });
});
