import React, { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Panel, cx } from '../../ui/primitives';

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
  /** Props for the element the hint describes. */
  const bind = (value: T): TipBinding => ({
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => show(value, e.currentTarget),
    onMouseLeave: hide,
    onFocus: (e: React.FocusEvent<HTMLElement>) => show(value, e.currentTarget),
    onBlur: hide,
  });
  const hold: TipHold = { onMouseEnter: keep, onMouseLeave: hide };
  return { tip, bind, hold, clear: () => setTip(null) };
}

/** The hint itself: a small plate in the setting's chrome, above its anchor, kept on screen. */
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
          // The bottom padding bridges the gap to the icon, so the cursor can travel onto the hint.
          className={cx('fixed z-[60] pb-3', hold ? 'pointer-events-auto' : 'pointer-events-none')}
          {...hold}
          style={{
            width,
            bottom: window.innerHeight - rect.top,
            left: Math.max(
              12,
              Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 12),
            ),
          }}
          initial={{ opacity: 0, y: 6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.08 } }}
          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
        >
          <Panel ornate={false} className={cx('px-4 py-3 shadow-2xl', className)}>
            <div className="ui-scroll max-h-[min(60vh,32rem)] overflow-y-auto">{children}</div>
          </Panel>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
