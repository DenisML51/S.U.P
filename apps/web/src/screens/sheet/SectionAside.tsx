import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  <div className="flex min-h-0 min-w-0 flex-1 justify-center">
    <div className="flex min-h-0 w-full flex-col gap-4" style={{ maxWidth }}>
      {children}
    </div>
  </div>
);

/** Width of the column while it holds an entry's card. */
const CARD_WIDTH = 400;
/** The narrowest a card and the list beside it may get when the section is fitted to its room. */
const CARD_MIN = 340;
const LIST_MIN = 360;
/** The gap between the list and the column (`gap-8`). */
const GAP = 32;
const SWAP = { duration: 0.22, ease: 'easeOut' } as const;

/**
 * The room of the section the column stands in, told to the sheet: whether a card fits beside the
 * list, and how wide it may be. Leaving the section hands the choice back to the screen's width.
 */
function useFittedCard(fit: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const { setPaneRoom } = useSheetDialogs();
  const [card, setCard] = useState(CARD_WIDTH);
  useLayoutEffect(() => {
    const section = ref.current?.parentElement;
    if (!fit || !section) return;
    const measure = () => {
      const room = section.clientWidth - LIST_MIN - GAP;
      setPaneRoom(room >= CARD_MIN);
      setCard(Math.min(CARD_WIDTH, room));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(section);
    return () => {
      observer.disconnect();
      setPaneRoom(null);
    };
  }, [fit, setPaneRoom]);
  return { ref, card: fit ? card : CARD_WIDTH };
}

/**
 * The right column of a section. It holds the section's secondary information (the purse, notes)
 * until an entry of the list is chosen; then the entry's card takes its place, and closing the
 * card brings the information back. A section without such information shows the column only
 * for the card; choosing another entry keeps the card where it is. The column's width eases between the two, so the list beside it gives way gently.
 * A `fit` section opens the card beside its list whenever its own room allows both (half a wide
 * screen, a tablet held flat), not only on a wide screen; the card narrows a little to fit.
 */
export const SectionAside: React.FC<{ width?: number; fit?: boolean; children?: React.ReactNode }> = ({
  width = 0,
  fit = false,
  children,
}) => {
  const { selected, clearSelection } = useSheetDialogs();
  const desktop = useAtLeast('desktop');
  const { ref, card } = useFittedCard(fit);

  // The card belongs to this section's list: leaving the section closes it.
  useEffect(() => clearSelection, [clearSelection]);

  // Below the desktop the information goes under the list across the width (the card is a dialog
  // there, unless the section has room for it beside the list).
  if (!desktop && !(fit && selected)) {
    if (children) return <aside className="flex flex-col gap-5">{children}</aside>;
    return fit ? <div ref={ref} className="-ml-8 w-0 shrink-0" aria-hidden /> : null;
  }

  const shown = selected ? card : width;
  return (
    <div
      ref={ref}
      className="h-full shrink-0 transition-[width,margin] duration-300 ease-out max-lg:sticky max-lg:top-0 max-lg:h-[calc(100dvh-8rem)] max-lg:self-start"
      style={{ width: shown, marginLeft: shown > 0 ? undefined : '-2rem' }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {selected ? (
          <motion.div
            key="card"
            className="h-full pt-5"
            style={{ width: card }}
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
