import React, { useState } from 'react';
import { DetailsPane } from '../../../ui/DetailsPane';
import { Dialog } from '../../../ui/Dialog';
import { Button } from '../../../ui/primitives';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { useEntryPresentation } from './context';
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

/**
 * The reading side of a card: figures and text, "Изменить" and the entry's own action. Shown as a
 * dialog, or as the details pane beside the list when the sheet has room for one.
 */
export const EntryView: React.FC<
  Common & {
    name: string;
    eyebrow: React.ReactNode;
    /** The entry's icon, as on the combat bar. */
    icon?: React.ReactNode;
    onEdit: () => void;
    /** The entry is taken with a reaction: it can be used out of the hero's turn in a party's fight. */
    reaction?: boolean;
    /** The main thing to do with the entry: "Атаковать", "Использовать", "Сотворить". */
    primary?: React.ReactNode;
    children?: React.ReactNode;
  }
> = ({ open, onClose, what, onDelete: remove, name, eyebrow, icon, onEdit, primary: action, reaction, children }) => {
  const presentation = useEntryPresentation();
  // Out of the hero's turn in a party's fight the card is for reading only.
  const locked = useCharacterStore((s) => s.turnLock) !== null;
  const onDelete = locked ? undefined : remove;
  const primary = locked && !reaction ? undefined : action;
  const edit = (button: React.ReactNode) =>
    locked ? <span className="text-xs text-ink-faint">Действовать можно в свой ход</span> : button;
  if (presentation.mode === 'pane') {
    return (
      <DetailsPane
        className="h-full"
        eyebrow={eyebrow}
        title={name}
        icon={icon}
        onClose={onClose}
        tools={onDelete && <DeleteButton compact what={what} name={name} onDelete={onDelete} />}
        actions={
          <>
            {primary}
            {edit(
              <Button variant={primary ? 'secondary' : 'primary'} onClick={presentation.edit}>
                Изменить
              </Button>,
            )}
          </>
        }
      >
        {children}
      </DetailsPane>
    );
  }
  return (
    <Dialog
      open={open}
      onClose={onClose}
      swapKey="view"
      width="md"
      eyebrow={eyebrow}
      icon={icon}
      title={name}
      footerStart={onDelete && <DeleteButton what={what} name={name} onDelete={onDelete} />}
      footer={
        <>
          {edit(
            <Button
              variant={primary ? 'secondary' : 'primary'}
              onClick={onEdit}
              data-autofocus={primary ? undefined : true}
            >
              Изменить
            </Button>,
          )}
          {primary}
        </>
      }
    >
      {children}
    </Dialog>
  );
};

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
> = ({
  open,
  onClose,
  what,
  onDelete,
  isNew,
  name,
  eyebrow,
  canSave,
  onSave,
  onCancel,
  width = 'lg',
  children,
}) => {
  const locked = useCharacterStore((s) => s.turnLock) !== null;
  return (
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
          <Button
            variant="primary"
            disabled={!canSave || locked}
            onClick={onSave}
            title={locked ? 'Действовать можно в свой ход' : undefined}
          >
            {isNew ? 'Добавить' : 'Сохранить'}
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSave && !locked) onSave();
        }}
      >
        {children}
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
};
