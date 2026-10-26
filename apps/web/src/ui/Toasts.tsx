import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { resolveValue, toast, useToaster, type Toast } from 'react-hot-toast';
import { cx } from './primitives';
import { IconCheck, IconWarning } from './icons';

/** At most this many messages at once: a burst of rolls should not wall off the screen. */
const VISIBLE = 4;

const ICON: Partial<Record<Toast['type'], React.ReactNode>> = {
  success: <IconCheck width={18} height={18} className="shrink-0 text-success" />,
  error: <IconWarning width={18} height={18} className="shrink-0 text-danger" />,
  loading: <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-frame/30 border-t-frame-bright" />,
};

/**
 * Lifts the messages by `offset` (a CSS length) while the calling screen is shown and `active`, so
 * they rise above a bar along the bottom instead of covering it.
 */
export function useToastOffset(offset: string, active = true): void {
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    root.style.setProperty('--toast-offset', offset);
    return () => {
      root.style.removeProperty('--toast-offset');
    };
  }, [offset, active]);
}

/**
 * Messages of the app (rolls, saves, errors) as plates in the language of the current setting.
 * They rise from the bottom edge (a screen with a bottom HUD lifts them with `--toast-offset`), the
 * stack makes room smoothly, hovering holds them, a click dismisses one. A message may carry its own
 * button ("Отменить"), so the plate itself is not a button. They stand over open windows (a roll made
 * from a window is seen), under the hints of the combat HUD.
 */
export const Toasts: React.FC = () => {
  const { toasts, handlers } = useToaster({ duration: 3500 });
  const visible = toasts.filter((t) => t.visible).slice(0, VISIBLE);

  return (
    <div
      className="ui-toasts pointer-events-none fixed inset-x-0 z-[210] flex flex-col-reverse items-center gap-2"
      style={{ bottom: 'var(--toast-offset, 1.5rem)', transition: 'bottom 300ms ease' }}
      onMouseEnter={handlers.startPause}
      onMouseLeave={handlers.endPause}
    >
      <AnimatePresence initial={false}>
        {visible.map((t) => (
          <motion.div
            key={t.id}
            layout
            role={t.type === 'error' ? 'alert' : 'status'}
            onClick={() => toast.dismiss(t.id)}
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97, transition: { duration: 0.18 } }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className={cx(
              'ui-toast pointer-events-auto cursor-pointer',
              t.type === 'error' && 'ui-toast--error',
              t.type === 'success' && 'ui-toast--success',
            )}
          >
            {/* The body keeps icon and message in a row, so a setting may stack a head above it. */}
            <div className="ui-toast__body flex min-w-0 items-center gap-3">
              {ICON[t.type]}
              <span className={cx('min-w-0 text-left', typeof t.message === 'string' && 'ui-toast__text')}>
                {resolveValue(t.message, t)}
              </span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
