import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { resolveValue, toast, useToaster, type Toast } from 'react-hot-toast';
import { cx } from './primitives';
import { IconCheck, IconWarning } from './icons';

/** At most this many messages at once: a burst of rolls should not wall off the screen. */
const VISIBLE = 4;

/** Below this much room above a bar the plates give up the lift and come down over the bar. */
const LOW_ROOM = 190;

/**
 * How the stack fits the room above it (from the top of the screen down to where it stands): fewer
 * messages and smaller plates as the room gets short (a landscape phone, a low window), so a roll's
 * plate never runs off the top. With hardly any room over a bar it comes down over the bar instead.
 */
function fit(room: number, lift: number): { count: number; scale: number; low: boolean } {
  if (room < LOW_ROOM && lift > 40) return { count: 1, scale: 0.85, low: true };
  if (room >= 640) return { count: VISIBLE, scale: 1, low: false };
  if (room >= 480) return { count: 3, scale: 1, low: false };
  if (room >= 360) return { count: 2, scale: 0.9, low: false };
  if (room >= 260) return { count: 1, scale: 0.85, low: false };
  return { count: 1, scale: 0.75, low: false };
}

/**
 * The lift (`--toast-offset`, a CSS length) in pixels and the room above it, kept up to date as the
 * window or the lift changes. `probe` is an invisible box as tall as the lift.
 */
function useRoom(probe: React.RefObject<HTMLElement | null>): { room: number; lift: number } {
  const [size, setSize] = useState({ room: 800, lift: 24 });
  useLayoutEffect(() => {
    const measure = () => {
      const lift = probe.current?.getBoundingClientRect().height ?? 24;
      setSize({ room: Math.round(window.innerHeight - lift) - 12, lift });
    };
    measure();
    window.addEventListener('resize', measure);
    // The lift is a property on the root: a screen with a bottom bar sets it as it opens.
    const observer = new MutationObserver(measure);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    return () => {
      window.removeEventListener('resize', measure);
      observer.disconnect();
    };
  }, [probe]);
  return size;
}

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
  const probe = useRef<HTMLDivElement>(null);
  const { room, lift } = useRoom(probe);
  const { count, scale, low } = fit(room, lift);
  const visible = toasts.filter((t) => t.visible).slice(0, count);

  return (
    <>
      {/* As tall as the lift: the stack measures the room above it from this. */}
      <div
        ref={probe}
        aria-hidden
        className="pointer-events-none invisible fixed left-0 top-0 w-px"
        style={{ height: 'var(--toast-offset, 1.5rem)' }}
      />
      <div
        className="ui-toasts pointer-events-none fixed inset-x-0 z-[210] flex flex-col-reverse items-center gap-2"
        style={{
          bottom: low ? '0.75rem' : 'var(--toast-offset, 1.5rem)',
          transition: 'bottom 300ms ease',
        }}
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
              // Each plate shrinks, not the stack: the stack keeps standing just over the bar.
              style={scale < 1 ? { zoom: scale } : undefined}
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
    </>
  );
};
