import type { Currency } from '@itd/schema';

export type Coin = keyof Currency;

/** Worth of each coin in copper: 1 gold = 10 silver = 100 copper. */
export const COIN_VALUE: Record<Coin, number> = { copper: 1, silver: 10, gold: 100 };

const DESCENDING: Coin[] = ['gold', 'silver', 'copper'];

export const totalCopper = (currency: Currency): number =>
  DESCENDING.reduce((sum, coin) => sum + currency[coin] * COIN_VALUE[coin], 0);

export const receiveCoins = (currency: Currency, amount: number, coin: Coin): Currency => ({
  ...currency,
  [coin]: currency[coin] + Math.max(0, Math.trunc(amount)),
});

/** Change for a broken coin, in the largest coins below it. */
function addChange(purse: Currency, change: number, broken: Coin): void {
  let rest = change;
  for (const coin of DESCENDING) {
    if (COIN_VALUE[coin] >= COIN_VALUE[broken]) continue;
    const count = Math.floor(rest / COIN_VALUE[coin]);
    purse[coin] += count;
    rest -= count * COIN_VALUE[coin];
  }
}

/**
 * Pays `amount` coins of the given kind the way a player would: with those coins first, then with
 * smaller ones, and only then by breaking a larger coin and taking the change. Returns `null` when
 * the purse does not hold enough in total.
 */
export function spendCoins(currency: Currency, amount: number, coin: Coin): Currency | null {
  let need = Math.max(0, Math.trunc(amount)) * COIN_VALUE[coin];
  if (need === 0) return currency;
  if (totalCopper(currency) < need) return null;

  const purse = { ...currency };
  for (const kind of DESCENDING) {
    if (COIN_VALUE[kind] > COIN_VALUE[coin]) continue;
    const take = Math.min(purse[kind], Math.floor(need / COIN_VALUE[kind]));
    purse[kind] -= take;
    need -= take * COIN_VALUE[kind];
  }
  while (need > 0) {
    // The smallest coin that covers the rest, else the largest one there is.
    const kind =
      [...DESCENDING].reverse().find((k) => purse[k] > 0 && COIN_VALUE[k] >= need) ?? DESCENDING.find((k) => purse[k] > 0)!;
    purse[kind] -= 1;
    if (COIN_VALUE[kind] >= need) {
      addChange(purse, COIN_VALUE[kind] - need, kind);
      need = 0;
    } else {
      need -= COIN_VALUE[kind];
    }
  }
  return purse;
}
