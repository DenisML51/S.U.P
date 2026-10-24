import React from 'react';
import { toast } from 'react-hot-toast';

/** How long the chance to undo stays on screen. */
const UNDO_TOAST_MS = 6000;

/** "Потрачен ресурс: Второе дыхание (1/2) · Отменить": what just changed, and a way back. */
export function showUndoToast(message: string, onUndo: () => void): void {
  toast(
    (t) => (
      <span className="flex items-center gap-4">
        <span className="min-w-0">{message}</span>
        <button
          type="button"
          className="shrink-0 text-sm text-frame-bright underline-offset-4 hover:underline"
          onClick={(event) => {
            // The toast itself dismisses on click; undoing should not count twice.
            event.stopPropagation();
            toast.dismiss(t.id);
            onUndo();
          }}
        >
          Отменить
        </button>
      </span>
    ),
    { duration: UNDO_TOAST_MS },
  );
}
