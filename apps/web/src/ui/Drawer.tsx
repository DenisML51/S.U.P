import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cx } from './primitives';

const ENTER = { duration: 0.45, ease: [0.22, 1, 0.36, 1] } as const;

/**
 * A panel that slides in over the screen from one edge, for what a narrow screen has no room to
 * keep in view (the hero's column, the fight's log, the table's chat). Escape, a tap on the dark
 * around it or its own close button put it away.
 */
export const Drawer: React.FC<{
  open: boolean;
  onClose: () => void;
  /** Accessible name of the panel. */
  label: string;
  side?: 'left' | 'right';
  className?: string;
  children: React.ReactNode;
}> = ({ open, onClose, label, side = 'left', className, children }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const away = side === 'left' ? '-100%' : '100%';
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="drawer"
          className="fixed inset-0 z-[150]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
        >
          <div className="absolute inset-0 bg-bg-deep/75" onClick={onClose} aria-hidden />
          <motion.div
            className={cx(
              'absolute inset-y-0 flex w-[min(340px,calc(100vw-3rem))] flex-col bg-bg shadow-2xl',
              side === 'left' ? 'left-0' : 'right-0',
              className,
            )}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            initial={{ x: away }}
            animate={{ x: 0 }}
            exit={{ x: away }}
            transition={ENTER}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
