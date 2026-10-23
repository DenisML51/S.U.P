import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useSetting, SettingScope } from './theme/SettingScope';
import { Button, IconButton, Panel, cx } from './primitives';
import { IconClose } from './icons';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  /** Short line under the title. */
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  /** Buttons row; right-aligned. */
  footer?: React.ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl';
  /** Paper suits reading (descriptions); plate suits forms. */
  variant?: 'plate' | 'paper';
  className?: string;
}

const WIDTHS = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' } as const;

/**
 * Modal dialog in the current setting. Closes on Escape and on a click outside; focus moves into
 * the dialog and returns where it was on close. Rendered in a portal so ancestors' overflow and
 * transforms never clip it.
 */
export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'md',
  variant = 'plate',
  className,
}) => {
  const setting = useSetting();
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    requestAnimationFrame(() => {
      const target = panelRef.current?.querySelector<HTMLElement>('[data-autofocus], input, textarea, select, button');
      target?.focus();
    });
    return () => {
      window.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <SettingScope setting={setting} className="fixed inset-0 z-[200] grid place-items-center p-6">
          <motion.div
            className="absolute inset-0 bg-bg-deep/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={cx('relative w-full', WIDTHS[width])}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <Panel
              ref={panelRef}
              as="section"
              variant={variant}
              ornate
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className={cx('flex max-h-[86vh] flex-col', className)}
            >
              <header className="flex items-start gap-4 px-6 pt-5 pb-4">
                <div className="min-w-0 flex-1">
                  <h2 id={titleId} className="ui-display ui-title text-2xl leading-tight">
                    {title}
                  </h2>
                  {subtitle && <p className="mt-1 text-sm opacity-70">{subtitle}</p>}
                </div>
                <IconButton label="Закрыть" onClick={onClose} size={32}>
                  <IconClose width={18} height={18} />
                </IconButton>
              </header>
              {children && <div className="ui-scroll min-h-0 flex-1 overflow-y-auto px-6 pb-5">{children}</div>}
              {footer && <footer className="flex justify-end gap-3 border-t border-line/60 px-6 py-4">{footer}</footer>}
            </Panel>
          </motion.div>
        </SettingScope>
      )}
    </AnimatePresence>,
    document.body,
  );
};

/** Yes/no question with a clear default; the destructive variant puts the danger on the button. */
export const ConfirmDialog: React.FC<{
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ open, title, message, confirmLabel, danger = false, onConfirm, onCancel }) => (
  <Dialog
    open={open}
    onClose={onCancel}
    title={title}
    width="sm"
    footer={
      <>
        <Button variant="ghost" onClick={onCancel} data-autofocus>
          Отмена
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </>
    }
  >
    <div className="text-[15px] leading-relaxed text-ink-muted">{message}</div>
  </Dialog>
);
