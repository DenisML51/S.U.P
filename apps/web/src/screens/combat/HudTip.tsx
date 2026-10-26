import React, { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Panel, cx } from '../../ui/primitives';
import { useMediaQuery } from '../../ui/useBreakpoint';

/** Props that make an element show a hint while hovered or focused. */
export interface TipBinding {
  onMouseEnter: (e: React.MouseEvent<HTMLElement>) => void;
  onMouseLeave: () => void;
  onFocus: (e: React.FocusEvent<HTMLElement>) => void;
  onBlur: () => void;
}

/** Props of the hint itself: while the cursor is on it, it stays (to read a long text, scroll it). */
export interface TipHold {
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

interface Anchored<T> {
  value: T;
  rect: DOMRect;
}

/**
 * Hover hints of the combat bar. One hint at a time, shown above whatever is under the cursor;
 * leaving and entering the next icon quickly swaps the hint without a flicker. The cursor may move
 * from the icon onto the hint: it stays while hovered and closes once the cursor leaves it.
 */
export function useHudTip<T>() {
  const [tip, setTip] = useState<Anchored<T> | null>(null);
  const hideTimer = useRef<number | undefined>(undefined);
  const show = useCallback((value: T, target: HTMLElement) => {
    window.clearTimeout(hideTimer.current);
    setTip({ value, rect: target.getBoundingClientRect() });
  }, []);
  const hide = useCallback(() => {
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setTip(null), 160);
  }, []);
  const keep = useCallback(() => window.clearTimeout(hideTimer.current), []);
  const clear = useCallback(() => setTip(null), []);
  /** Props for the element the hint describes. */
  const bind = (value: T): TipBinding => ({
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => show(value, e.currentTarget),
    onMouseLeave: hide,
    // Only a keyboard's focus: focus handed back by a closing dialog, or left by a tap, is no ask for a hint.
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      if (e.currentTarget.matches(':focus-visible')) show(value, e.currentTarget);
    },
    onBlur: hide,
  });
  const hold: TipHold = { onMouseEnter: keep, onMouseLeave: hide };
  return { tip, bind, hold, show, clear };
}

/**
 * Whether the HUD is used by touch: no hover, or a screen narrower than the desktop. There a tap
 * picks before it acts and a long press stands for the right click, and the hints say so.
 */
export const useTouchHud = (): boolean => useMediaQuery('(hover: none), (max-width: 1023.98px)');

/** What stands in the screen's upper half gets its hints and menus below it. */
export const below = (rect: DOMRect) => rect.top < window.innerHeight / 2;

/**
 * The hint itself: a small plate in the setting's chrome, above its anchor (below it, for what
 * stands in the screen's upper half), kept on screen.
 */
export const HudTip: React.FC<{
  rect: DOMRect | null;
  /** Changes when the hint describes something else, to replay the entrance. */
  tipKey: string;
  width?: number;
  className?: string;
  /** Keeps the hint open while the cursor is on it. */
  hold?: TipHold;
  children: React.ReactNode;
}> = ({ rect, tipKey, width = 320, className, hold, children }) =>
  createPortal(
    <AnimatePresence>
      {rect && (
        <motion.div
          key={tipKey}
          data-hud-tip
          // The padding toward the icon bridges the gap, so the cursor can travel onto the hint.
          className={cx(
            'fixed z-[60]',
            below(rect) ? 'pt-3' : 'pb-3',
            hold ? 'pointer-events-auto' : 'pointer-events-none',
          )}
          {...hold}
          style={{
            width,
            ...(below(rect) ? { top: rect.bottom } : { bottom: window.innerHeight - rect.top }),
            left: Math.max(
              12,
              Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 12),
            ),
          }}
          initial={{ opacity: 0, y: below(rect) ? -6 : 6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.08 } }}
          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
        >
          <Panel ornate={false} className={cx('px-4 py-3 shadow-2xl', className)}>
            {children}
          </Panel>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
