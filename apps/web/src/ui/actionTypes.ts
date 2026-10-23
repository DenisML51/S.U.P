import type { ActionType } from '@itd/schema';

/** How each action type reads in the interface; the colour is the `act-*` design token. */
export const ACTION_TYPES: Record<ActionType, { label: string; short: string; token: string }> = {
  action: { label: 'Основное действие', short: 'основное', token: 'act-action' },
  bonus: { label: 'Бонусное действие', short: 'бонусное', token: 'act-bonus' },
  reaction: { label: 'Реакция', short: 'реакция', token: 'act-reaction' },
  passive: { label: 'Пассивное', short: 'пассивное', token: 'act-passive' },
};
