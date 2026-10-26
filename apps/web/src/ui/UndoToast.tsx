import React from 'react';
import { toast } from 'react-hot-toast';
import { IconUndo } from './icons';

/** How long the chance to undo stays on screen. */
const UNDO_TOAST_MS = 6000;

/** "Потрачен ресурс: Второе дыхание (1/2) ↶": what just changed, and a way back. */
export function showUndoToast(message: string, onUndo: () => void): void {
  toast(
    (t) => (
      <span className="flex items-center gap-3">
        <span className="min-w-0">{message}</span>
        <button
          type="button"
          aria-label="Отменить"
          title="Отменить"
          className="-my-1.5 -mr-1.5 grid h-8 w-8 shrink-0 place-items-center text-frame-bright opacity-80 transition-opacity hover:opacity-100"
          onClick={(event) => {
            // The toast itself dismisses on click; undoing should not count twice.
            event.stopPropagation();
            toast.dismiss(t.id);
            onUndo();
          }}
        >
          <IconUndo width={18} height={18} />
        </button>
      </span>
    ),
    { duration: UNDO_TOAST_MS },
  );
}
