import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/** Lists whose entries open as a card: viewed first, edited in the same dialog. */
export type EntryKind = 'attack' | 'ability' | 'spell' | 'item' | 'trait' | 'resource';

/**
 * The one dialog open over the sheet. Entries are referenced by id and read from the live
 * character, so a card shows changes made while it is open; no id means a new entry. `edit` opens
 * only the form (from the details pane): saving or cancelling it closes the dialog.
 */
export type SheetDialog =
  | { kind: EntryKind; id?: string; edit?: boolean }
  | { kind: 'health' | 'sanity' | 'experience' | 'currency' | 'armor' | 'body' | 'profile' | 'dice' | 'levelUp' | 'rest' }
  | { kind: 'attribute' | 'limb'; id: string }
  /** Picks of a feature changed on the sheet (the known forms of Wild Shape), by the feature's grant. */
  | { kind: 'choices'; grant: string };

/** An entry whose card is shown beside its list. */
export interface SelectedEntry {
  kind: EntryKind;
  id: string;
}

interface SheetDialogs {
  dialog: SheetDialog | null;
  open: (dialog: SheetDialog) => void;
  close: () => void;
  /** The entry shown in the details pane, if the screen is wide enough to have one. */
  selected: SelectedEntry | null;
  /** Shows an entry's card: beside the list on a wide screen, as a dialog otherwise. */
  openEntry: (kind: EntryKind, id: string) => void;
  /** Whether this entry's card is the one beside its list. */
  isSelected: (kind: EntryKind, id: string) => boolean;
  clearSelection: () => void;
}

/** Below this width the section has no room for a list and a card side by side. */
const PANE_QUERY = '(min-width: 1440px)';

/** Whether the screen is wide enough to show an entry's card beside its list. */
export function useWideSheet(): boolean {
  const [wide, setWide] = useState(() => window.matchMedia(PANE_QUERY).matches);
  useEffect(() => {
    const query = window.matchMedia(PANE_QUERY);
    const onChange = () => setWide(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return wide;
}

const Context = createContext<SheetDialogs | null>(null);

export const SheetDialogsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialog, setDialog] = useState<SheetDialog | null>(null);
  const [selected, setSelected] = useState<SelectedEntry | null>(null);
  const wide = useWideSheet();
  const close = useCallback(() => setDialog(null), []);
  const clearSelection = useCallback(() => setSelected(null), []);
  const openEntry = useCallback(
    (kind: EntryKind, id: string) => (wide ? setSelected({ kind, id }) : setDialog({ kind, id })),
    [wide],
  );
  const value = useMemo(() => {
    const shown = wide ? selected : null;
    return {
      dialog,
      open: setDialog,
      close,
      selected: shown,
      openEntry,
      isSelected: (kind: EntryKind, id: string) => shown?.kind === kind && shown.id === id,
      clearSelection,
    };
  }, [dialog, close, selected, wide, openEntry, clearSelection]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
};

export function useSheetDialogs(): SheetDialogs {
  const value = useContext(Context);
  if (!value) throw new Error('useSheetDialogs outside SheetDialogsProvider');
  return value;
}

/**
 * How an entry card renders: as a dialog over the sheet, or as the details pane beside its list.
 * In the pane, editing opens the card's form as a dialog over it, so the pane stays in place.
 */
export type EntryPresentation = { mode: 'dialog' } | { mode: 'pane'; edit: () => void };

const PresentationContext = createContext<EntryPresentation>({ mode: 'dialog' });

export const EntryPresentationScope = PresentationContext.Provider;

export const useEntryPresentation = (): EntryPresentation => useContext(PresentationContext);
