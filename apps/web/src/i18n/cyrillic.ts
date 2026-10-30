const CYRILLIC = /[А-Яа-яЁё]/;

/** Whether a text has anything to translate: a text without Russian letters is shown as it is. */
export const hasCyrillic = (text: string): boolean => CYRILLIC.test(text);
