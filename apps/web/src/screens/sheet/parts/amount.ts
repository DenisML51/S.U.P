/** What Enter does with a typed amount of health or sanity, said once for both places. */
export const SIGN_HINT = 'Выберите кнопкой или наберите со знаком: −8 и Enter — отнять, +8 и Enter — прибавить';

/** Digits with an optional sign in front (a typed minus may be a hyphen or a dash). */
export const cleanAmount = (text: string): string => {
  const sign = /^\s*([+\-−–])/.exec(text)?.[1];
  const digits = text.replace(/[^\d]/g, '');
  return sign ? `${sign === '+' ? '+' : '−'}${digits}` : digits;
};

/** The amount typed and its sign, if one was given: `−8` takes, `+8` gives, `8` waits for a button. */
export function signedAmount(text: string): { sign: '+' | '-' | null; value: number } {
  const value = Number(text.replace(/[^\d]/g, ''));
  const sign = text.startsWith('+') ? '+' : text.startsWith('−') ? '-' : null;
  return { sign, value: Number.isFinite(value) ? value : 0 };
}
