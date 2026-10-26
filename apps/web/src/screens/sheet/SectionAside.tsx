import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAtLeast } from '../../ui/useBreakpoint';
import { useSheetDialogs } from './dialogs/context';
import { EntryPane } from './EntryPane';

/**
 * The list of a section, kept to the width of a page and centred in the room it has: a stack of
 * pages on the desk, not a sheet stretched across the screen. When the right column widens for an
 * entry's card, the page moves along with the centre.
 */
export const SectionList: React.FC<{ maxWidth?: number; children: React.ReactNode }> = ({
  maxWidth = 780,
  children,
}) => (
  <div className="ui-section-list flex min-h-0 min-w-0 flex-1 justify-center">
    <div className="flex min-h-0 w-full flex-col gap-4" style={{ maxWidth }}>
      {children}
    </div>
  </div>
);

/** Width of the column while it holds an entry's card. */
const CARD_WIDTH = 400;
const SWAP = { duration: 0.22, ease: 'easeOut' } as const;

/**
 * The right column of a section. It holds the section's secondary information (the purse, notes)
 * until an entry of the list is chosen; then the entry's card takes its place, and closing the
 * card brings the information back. A section without such information shows the column only
 * for the card; choosing another entry keeps the card where it is. The column's width eases between the two, so the list beside it gives way gently.
 */
export const SectionAside: React.FC<{ width?: number; children?: React.ReactNode }> = ({
  width = 0,
  children,
}) => {
  const { selected, clearSelection } = useSheetDialogs();
  const desktop = useAtLeast('desktop');

  // The card belongs to this section's list: leaving the section closes it.
  useEffect(() => clearSelection, [clearSelection]);

  // Below the desktop the information goes under the list across the width (the card is a dialog there).
  if (!desktop) return children ? <aside className="flex flex-col gap-5">{children}</aside> : null;

  const shown = selected ? CARD_WIDTH : width;
  return (
    <div
      className="h-full shrink-0 transition-[width,margin] duration-300 ease-out"
      style={{ width: shown, marginLeft: shown > 0 ? undefined : '-2rem' }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {selected ? (
          <motion.div
            key="card"
            className="h-full pt-5"
            style={{ width: CARD_WIDTH }}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={SWAP}
          >
            <EntryPane />
          </motion.div>
        ) : (
          children && (
            <motion.aside
              key="info"
              className="flex h-full min-h-0 flex-col gap-5"
              style={{ width }}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={SWAP}
            >
              {children}
            </motion.aside>
          )
        )}
      </AnimatePresence>
    </div>
  );
};
