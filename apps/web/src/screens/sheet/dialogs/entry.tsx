import React, { useState } from 'react';
import { Dialog } from '../../../ui/Dialog';
import { Button } from '../../../ui/primitives';
import { DeleteButton } from './parts';

/**
 * State of an entry card: the live entry (by id) and, while editing, its draft. A card opened
 * without an id is a new entry and starts as a form.
 */
export function useEntryDraft<T extends { id: string }>(
  list: T[],
  id: string | undefined,
  edit: boolean | undefined,
  blank: () => T,
  toDraft: (entry: T) => T = (entry) => entry,
) {
  const entry = list.find((e) => e.id === id);
  const [draft, setDraft] = useState<T | null>(() => (!entry ? blank() : edit ? toDraft(entry) : null));
  return {
    entry,
    draft,
    setDraft,
    startEditing: () => entry && setDraft(toDraft(entry)),
    stopEditing: () => setDraft(null),
  };
}

interface Common {
  open: boolean;
  onClose: () => void;
  /** Accusative noun for the delete question: "атаку", "предмет". */
  what: string;
  onDelete?: () => void;
}

/** The reading side of a card: figures and text, "Изменить" and the entry's own action. */
export const EntryView: React.FC<
  Common & {
    name: string;
    eyebrow: React.ReactNode;
    onEdit: () => void;
    /** The main thing to do with the entry: "Атаковать", "Использовать", "Сотворить". */
    primary?: React.ReactNode;
    children?: React.ReactNode;
  }
> = ({ open, onClose, what, onDelete, name, eyebrow, onEdit, primary, children }) => (
  <Dialog
    open={open}
    onClose={onClose}
    swapKey="view"
    width="md"
    eyebrow={eyebrow}
    title={name}
    footerStart={onDelete && <DeleteButton what={what} name={name} onDelete={onDelete} />}
    footer={
      <>
        <Button variant={primary ? 'secondary' : 'primary'} onClick={onEdit} data-autofocus={primary ? undefined : true}>
          Изменить
        </Button>
        {primary}
      </>
    }
  >
    {children}
  </Dialog>
);

/** The editing side of a card: a form, saved as a whole or dropped. */
export const EntryForm: React.FC<
  Common & {
    isNew: boolean;
    name: string;
    eyebrow: React.ReactNode;
    canSave: boolean;
    onSave: () => void;
    onCancel: () => void;
    width?: 'md' | 'lg' | 'xl';
    children: React.ReactNode;
  }
> = ({ open, onClose, what, onDelete, isNew, name, eyebrow, canSave, onSave, onCancel, width = 'lg', children }) => (
  <Dialog
    open={open}
    onClose={onClose}
    swapKey="edit"
    width={width}
    eyebrow={eyebrow}
    title={name.trim() || 'Без названия'}
    footerStart={!isNew && onDelete && <DeleteButton what={what} name={name} onDelete={onDelete} />}
    footer={
      <>
        <Button variant="ghost" onClick={onCancel}>
          Отмена
        </Button>
        <Button variant="primary" disabled={!canSave} onClick={onSave}>
          {isNew ? 'Добавить' : 'Сохранить'}
        </Button>
      </>
    }
  >
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSave) onSave();
      }}
    >
      {children}
      <button type="submit" hidden />
    </form>
  </Dialog>
);
