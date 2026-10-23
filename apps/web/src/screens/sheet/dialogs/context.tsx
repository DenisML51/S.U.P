import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

/** Lists whose entries open as a card: viewed first, edited in the same dialog. */
export type EntryKind = 'attack' | 'ability' | 'spell' | 'item' | 'trait' | 'resource';

/**
 * The one dialog open over the sheet. Entries are referenced by id and read from the live
 * character, so a card shows changes made while it is open; no id means a new entry.
 */
export type SheetDialog =
  | { kind: EntryKind; id?: string; edit?: boolean }
  | { kind: 'health' | 'sanity' | 'experience' | 'currency' | 'armor' | 'profile' | 'dice' }
  | { kind: 'attribute' | 'limb'; id: string };

interface SheetDialogs {
  dialog: SheetDialog | null;
  open: (dialog: SheetDialog) => void;
  close: () => void;
}

const Context = createContext<SheetDialogs | null>(null);

export const SheetDialogsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialog, setDialog] = useState<SheetDialog | null>(null);
  const close = useCallback(() => setDialog(null), []);
  const value = useMemo(() => ({ dialog, open: setDialog, close }), [dialog, close]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
};

export function useSheetDialogs(): SheetDialogs {
  const value = useContext(Context);
  if (!value) throw new Error('useSheetDialogs outside SheetDialogsProvider');
  return value;
}
