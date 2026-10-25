import { useEffect, useSyncExternalStore } from 'react';

/**
 * The outcome of an opposed roll, told on the roll's telegram: an attack on the investigator met
 * by a dodge or a fight back, settled once the player names the attacker's level. Kept beside the
 * roll (by its serial) rather than in it, so the combat screen can add it to a toast already up.
 */
export interface RollVerdict {
  /** The roll it settles. */
  serial: number;
  /** Phrases read in a row ("Уклонение не удалось", "удар прошёл"); a telegram parts them with ТЧК. */
  parts: string[];
  tone: 'success' | 'danger' | 'neutral';
}

let current: RollVerdict | null = null;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

/** How many roll telegrams are on screen: the roll's drawing counts itself in while it is mounted. */
let shown = 0;

export function useCountRollShown(): void {
  useEffect(() => {
    shown += 1;
    emit();
    return () => {
      shown -= 1;
      emit();
    };
  }, []);
}

/**
 * Whether a roll telegram is up. Told by the drawing itself rather than read from the toaster's
 * store: a second subscriber to that store, once unmounted, unhooks the app's toast list instead
 * of itself (react-hot-toast 2.6), and no toast shows again.
 */
export const useRollShown = (): boolean => useSyncExternalStore(subscribe, () => shown > 0);

export function setRollVerdict(next: RollVerdict | null): void {
  if (
    next === current ||
    (next && current && next.serial === current.serial && next.parts.join() === current.parts.join())
  )
    return;
  current = next;
  emit();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** The verdict on the roll `serial`, if one was reached. */
export function useRollVerdict(serial: number): RollVerdict | null {
  const verdict = useSyncExternalStore(subscribe, () => current);
  return verdict?.serial === serial ? verdict : null;
}
