import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import type { Theme } from './theme/settings';
import { useSetting, SettingScope } from './theme/SettingScope';
import { Button, IconButton, Panel, Rule, cx } from './primitives';
import { IconClose } from './icons';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  /** Short line under the title. */
  subtitle?: React.ReactNode;
  /** Small label above the title: what kind of thing this is ("Атака · основное"). */
  eyebrow?: React.ReactNode;
  /** A picture before the title, e.g. the icon of an attack. */
  icon?: React.ReactNode;
  children?: React.ReactNode;
  /** Buttons row; right-aligned. */
  footer?: React.ReactNode;
  /** Left end of the buttons row, apart from the main actions ("Удалить"). */
  footerStart?: React.ReactNode;
  /** Changing it swaps the content (viewing → editing): the old content fades, the window glides to
      the size of the new one. */
  swapKey?: string;
  width?: 'sm' | 'md' | 'lg' | 'xl';
  /** The theme to wear instead of the surrounding one: `'service'` for the service's own dialogs. */
  setting?: Theme;
  /** Paper suits reading (descriptions); plate suits forms. */
  variant?: 'plate' | 'paper';
  /**
   * An emblem settled on the window's top edge (the new level's): the window keeps its top at `y`
   * and its heading below the emblem's radius `r`; once the emblem is there (`cut`), a round opening
   * of that radius widens under it, through the window, its frame and lines.
   */
  hole?: { y: number; r: number; cut: boolean };
  className?: string;
}

const WIDTHS = { sm: 448, md: 576, lg: 768, xl: 1024 } as const;

/** Ids of the open dialogs, the topmost last. */
const OPEN_DIALOGS: string[] = [];

/** Focus the element marked for it, else the first field (or, on opening, the first button). */
const focusInto = (panel: HTMLElement | null, orButton: boolean) =>
  (
    panel?.querySelector<HTMLElement>('[data-autofocus]') ??
    panel?.querySelector<HTMLElement>(
      orButton ? 'input, textarea, select, button' : 'input, textarea, select',
    )
  )?.focus();

const RESIZE = { duration: 0.28, ease: [0.22, 1, 0.36, 1] } as const;

/**
 * Height of the current content, kept up to date as it changes. Content that is on its way out
 * (marked with an older swap key) is ignored: it reflows as the window widens and would make the
 * height dip before the new content arrives.
 */
function useHeight(swapKey: string): [(node: HTMLElement | null) => void, number | undefined] {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [height, setHeight] = useState<number>();
  const current = useRef(swapKey);
  current.current = swapKey;
  useEffect(() => {
    if (!node) return;
    const observer = new ResizeObserver(() => {
      if (node.dataset.swap === current.current) setHeight(node.offsetHeight);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);
  return [setNode, height];
}

/**
 * Modal dialog in the current setting. Closes on Escape and on a click outside; focus moves into
 * the dialog and returns where it was on close. It stands in the middle of the screen. Rendered in a
 * portal so ancestors' overflow and transforms never clip it.
 */
/**
 * The title, set smaller once it does not fit one line: a nameplate (Fable's pill, Lovecraft's
 * plate) broken over two lines looks broken. Measured as laid out (and again when the fonts land),
 * so it holds for any title, language and setting. A new title starts over at the full size.
 */
const DialogTitle: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
  const ref = useRef<HTMLHeadingElement>(null);
  const [long, setLong] = useState(false);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || long) return;
    const check = () => {
      const lineHeight = parseFloat(getComputedStyle(element).lineHeight);
      if (lineHeight > 0 && element.offsetHeight > lineHeight * 1.5) setLong(true);
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(element);
    return () => observer.disconnect();
  }, [long]);
  return (
    <h2 ref={ref} id={id} data-long={long || undefined} className="ui-dialog__title ui-display ui-title text-2xl leading-tight">
      {children}
    </h2>
  );
};

export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  subtitle,
  eyebrow,
  icon,
  children,
  footer,
  footerStart,
  swapKey = 'main',
  width = 'md',
  variant = 'plate',
  setting: ownSetting,
  hole,
  className,
}) => {
  const scopeSetting = useSetting();
  const setting = ownSetting ?? scopeSetting;
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    OPEN_DIALOGS.push(titleId);
    // Escape closes only the topmost dialog (a picker opened over a level-up window).
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && OPEN_DIALOGS[OPEN_DIALOGS.length - 1] === titleId) {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    requestAnimationFrame(() => focusInto(panelRef.current, true));
    return () => {
      window.removeEventListener('keydown', onKey);
      OPEN_DIALOGS.splice(OPEN_DIALOGS.lastIndexOf(titleId), 1);
      previous?.focus?.();
    };
  }, [open, onClose, titleId]);

  const [measure, contentHeight] = useHeight(swapKey);
  const focusFirstField = () => focusInto(panelRef.current, false);

  return createPortal(
    <AnimatePresence>
      {open && (
        <SettingScope
          setting={setting}
          className={cx(
            'fixed inset-0 z-[200] flex justify-center px-6 py-[5vh] max-sm:px-4',
            hole ? 'items-start' : 'items-center',
          )}
          style={hole && { paddingTop: hole.y }}
        >
          <motion.div
            className="absolute inset-0 bg-bg-deep/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* The window keeps its frame while the content changes; width and height follow the
              content, so the switch to a larger form and back reads as one window resizing. */}
          <motion.div
            className="relative"
            style={{ maxWidth: '100%' }}
            initial={{ opacity: 0, y: 12, scale: 0.98, width: WIDTHS[width] }}
            animate={{ opacity: 1, y: 0, scale: 1, width: WIDTHS[width] }}
            exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.15 } }}
            transition={{ ...RESIZE, opacity: { duration: 0.2 } }}
          >
            <Panel
              ref={panelRef}
              as="section"
              variant={variant}
              ornate
              crest={!hole}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className={cx('ui-dialog transition-colors', hole && 'ui-dialog--hole', className)}
              style={hole && ({ '--hole-r': `${hole.cut ? hole.r : 0}px` } as React.CSSProperties)}
            >
              <span className="ui-dialog__frame" aria-hidden />
              <motion.div
                className="overflow-hidden"
                initial={false}
                animate={{ height: contentHeight ?? 'auto' }}
                transition={RESIZE}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={swapKey}
                    ref={measure}
                    data-swap={swapKey}
                    className="flex max-h-[86vh] flex-col"
                    style={hole && { maxHeight: `calc(95vh - ${hole.y}px)` }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { duration: 0.18, delay: 0.06 } }}
                    exit={{ opacity: 0, transition: { duration: 0.1 } }}
                    onAnimationComplete={(definition) => {
                      if ((definition as { opacity?: number }).opacity === 1) focusFirstField();
                    }}
                  >
                    <header
                      className="ui-dialog__head relative pb-4 pl-6 pr-14 pt-5"
                      style={hole && { paddingTop: hole.r + 22 }}
                    >
                      <div className={cx('min-w-0', !!icon && 'flex items-center gap-4')}>
                        {icon}
                        <div className="min-w-0 flex-1">
                          {eyebrow && (
                            <div className="ui-dialog__eyebrow mb-1.5 text-[11px] uppercase tracking-[0.18em] opacity-70">
                              {eyebrow}
                            </div>
                          )}
                          <DialogTitle key={typeof title === 'string' ? title : undefined} id={titleId}>
                            {title}
                          </DialogTitle>
                          {subtitle && <p className="mt-1 text-sm opacity-70">{subtitle}</p>}
                        </div>
                      </div>
                      <Rule className="ui-dialog__rule mt-3" />
                    </header>
                    {children && (
                      <div className="ui-scroll min-h-0 flex-1 overflow-y-auto px-6 pb-5 max-sm:px-4">{children}</div>
                    )}
                    {(footer || footerStart) && (
                      // Buttons that do not fit wrap to the end of the next line; on a phone they share the
                      // width, and what stands at the start goes on its own line.
                      <footer className="ui-dialog__foot flex items-center gap-3 px-6 py-4 max-sm:flex-wrap max-sm:px-4 max-sm:py-3">
                        {footerStart}
                        <div className="ml-auto flex flex-wrap justify-end gap-3 max-sm:min-w-0 max-sm:flex-1 max-sm:[&>*]:min-w-0 max-sm:[&>*]:flex-1">
                          {footer}
                        </div>
                      </footer>
                    )}
                  </motion.div>
                </AnimatePresence>
              </motion.div>
              <IconButton
                label="Закрыть"
                onClick={onClose}
                size={32}
                className="!absolute right-4 top-4 z-[2]"
              >
                <IconClose width={18} height={18} />
              </IconButton>
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
  setting?: Theme;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ open, title, message, confirmLabel, danger = false, setting, onConfirm, onCancel }) => (
  <Dialog
    open={open}
    onClose={onCancel}
    setting={setting}

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
