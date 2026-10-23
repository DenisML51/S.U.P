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

interface Anchored<T> {
  value: T;
  rect: DOMRect;
}

/**
 * Hover hints of the combat bar. One hint at a time, shown above whatever is under the cursor;
 * leaving and entering the next icon quickly swaps the hint without a flicker.
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
    hideTimer.current = window.setTimeout(() => setTip(null), 60);
  }, []);
  /** Props for the element the hint describes. */
  const bind = (value: T): TipBinding => ({
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => show(value, e.currentTarget),
    onMouseLeave: hide,
    onFocus: (e: React.FocusEvent<HTMLElement>) => show(value, e.currentTarget),
    onBlur: hide,
  });
  return { tip, bind, clear: () => setTip(null) };
}

/** The hint itself: a small plate in the setting's chrome, above its anchor, kept on screen. */
export const HudTip: React.FC<{
  rect: DOMRect | null;
  /** Changes when the hint describes something else, to replay the entrance. */
  tipKey: string;
  width?: number;
  className?: string;
  children: React.ReactNode;
}> = ({ rect, tipKey, width = 320, className, children }) =>
  createPortal(
    <AnimatePresence>
      {rect && (
        <motion.div
          key={tipKey}
          className="pointer-events-none fixed z-[60]"
          style={{
            width,
            bottom: window.innerHeight - rect.top + 12,
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
            {children}
          </Panel>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
