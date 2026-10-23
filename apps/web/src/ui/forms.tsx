import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Prose } from './Prose';
import { TextArea, cx } from './primitives';
import { IconMinus, IconNext, IconPlus } from './icons';

// ------------------------------------------------------------------------------------------------
// Segmented: one of a few options, all visible at once (action type, item type).
// ------------------------------------------------------------------------------------------------

export interface SegmentOption<T extends string> {
  value: T;
  label: React.ReactNode;
  /** Colour token of the option when chosen (`act-bonus`, `danger`). */
  tone?: string;
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  /** Accessible name of the group. */
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cx('ui-segmented', className)}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className="ui-segmented__option"
            style={selected && option.tone ? ({ '--segment-tone': `var(--c-${option.tone})` } as React.CSSProperties) : undefined}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------------------------------------
// Switch: an on/off setting with its label.
// ------------------------------------------------------------------------------------------------

export const Switch: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
}> = ({ checked, onChange, label, hint, className }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={cx('group flex items-start gap-3 text-left', className)}
  >
    <span className="ui-switch mt-0.5" aria-hidden />
    <span>
      <span className="block text-sm text-ink">{label}</span>
      {hint && <span className="block text-xs text-ink-faint">{hint}</span>}
    </span>
  </button>
);

// ------------------------------------------------------------------------------------------------
// NumberField: a number with steppers; the text stays editable, so "-" or an empty field are
// allowed while typing and settle on blur.
// ------------------------------------------------------------------------------------------------

export const NumberField: React.FC<{
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Shown with a sign: "+3", "−1" (bonuses). */
  signed?: boolean;
  id?: string;
  label?: string;
  className?: string;
}> = ({ value, onChange, min = -Infinity, max = Infinity, step = 1, signed, id, label, className }) => {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const format = (n: number) => (signed && n > 0 ? `+${n}` : `${n}`);
  const [text, setText] = useState(format(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(format(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `format` only depends on `signed`
  }, [value, focused, signed]);

  const commit = (raw: string) => {
    const parsed = Number(raw.replace('−', '-').replace(',', '.'));
    if (raw.trim() !== '' && Number.isFinite(parsed)) onChange(clamp(parsed));
    else setText(format(value));
  };

  return (
    <div className={cx('ui-number', className)}>
      <button type="button" tabIndex={-1} aria-label="Меньше" onClick={() => onChange(clamp(value - step))} disabled={value <= min}>
        <IconMinus width={14} height={14} />
      </button>
      <input
        id={id}
        aria-label={label}
        inputMode="decimal"
        value={text}
        onFocus={(e) => {
          setFocused(true);
          e.target.select();
        }}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => {
          setFocused(false);
          commit(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit((e.target as HTMLInputElement).value);
          else if (e.key === 'ArrowUp') {
            e.preventDefault();
            onChange(clamp(value + step));
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            onChange(clamp(value - step));
          }
        }}
      />
      <button type="button" tabIndex={-1} aria-label="Больше" onClick={() => onChange(clamp(value + step))} disabled={value >= max}>
        <IconPlus width={14} height={14} />
      </button>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------
// Popover: a floating list under a field. Rendered into <body> so scrolling dialogs never clip it;
// flips above the field when there is no room below.
// ------------------------------------------------------------------------------------------------

const Popover: React.FC<{
  anchor: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ anchor, open, onClose, children }) => {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => setRect(anchor.current?.getBoundingClientRect() ?? null);
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, anchor]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panel.current?.contains(target) && !anchor.current?.contains(target)) onClose();
    };
    // Captured before the dialog's own Escape handler, so Escape closes only the list.
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [open, onClose, anchor]);

  const below = rect ? window.innerHeight - rect.bottom > 260 || rect.top < 260 : true;

  return createPortal(
    <AnimatePresence>
      {open && rect && (
        <motion.div
          ref={panel}
          className="ui-popover ui-scroll"
          style={{
            left: rect.left,
            width: rect.width,
            ...(below ? { top: rect.bottom + 4 } : { bottom: window.innerHeight - rect.top + 4 }),
          }}
          initial={{ opacity: 0, y: below ? -4 : 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          transition={{ duration: 0.14 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

/** Moves the highlighted option with the arrow keys; Enter picks it. */
function useListKeys(count: number, onPick: (index: number) => void) {
  const [active, setActive] = useState(-1);
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (count === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => (i + 1) % count);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => (i <= 0 ? count - 1 : i - 1));
    } else if (event.key === 'Enter' && active >= 0) {
      event.preventDefault();
      onPick(active);
    }
  };
  return { active, setActive, onKeyDown };
}

// ------------------------------------------------------------------------------------------------
// Select: one value from a list too long for Segmented.
// ------------------------------------------------------------------------------------------------

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

export function Select<T extends string>({
  value,
  options,
  onChange,
  placeholder = 'Не выбрано',
  id,
  className,
}: {
  value: T | undefined;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  id?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const pick = (index: number) => {
    onChange(options[index]!.value);
    setOpen(false);
  };
  const keys = useListKeys(options.length, pick);
  const current = options.find((o) => o.value === value);

  return (
    <>
      <button
        ref={button}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          setOpen((o) => !o);
          keys.setActive(options.findIndex((o) => o.value === value));
        }}
        onKeyDown={(e) => (open ? keys.onKeyDown(e) : e.key === 'ArrowDown' && setOpen(true))}
        className={cx('ui-input flex items-center justify-between gap-2 text-left', className)}
      >
        <span className={cx('truncate', !current && 'text-ink-faint')}>{current?.label ?? placeholder}</span>
        <IconNext width={14} height={14} className={cx('shrink-0 text-ink-faint transition-transform', open ? '-rotate-90' : 'rotate-90')} />
      </button>
      <Popover anchor={button} open={open} onClose={() => setOpen(false)}>
        <ul id={listId} role="listbox">
          {options.map((option, index) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              data-active={index === keys.active || undefined}
              onPointerEnter={() => keys.setActive(index)}
              onClick={() => pick(index)}
              className="ui-popover__option"
            >
              <span>{option.label}</span>
              {option.hint && <span className="text-xs text-ink-faint">{option.hint}</span>}
            </li>
          ))}
        </ul>
      </Popover>
    </>
  );
}

// ------------------------------------------------------------------------------------------------
// Suggest: free text with suggestions (damage types: the list is a hint, homebrew is allowed).
// ------------------------------------------------------------------------------------------------

export const Suggest: React.FC<{
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  id?: string;
  label?: string;
  className?: string;
}> = ({ value, onChange, suggestions, placeholder, id, label, className }) => {
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const query = value.trim().toLowerCase();
  const matches = suggestions.filter((s) => s.toLowerCase().includes(query) && s.toLowerCase() !== query);
  const pick = (index: number) => {
    onChange(matches[index]!);
    setOpen(false);
  };
  const keys = useListKeys(matches.length, pick);

  return (
    <>
      <input
        ref={input}
        id={id}
        aria-label={label}
        className={cx('ui-input', className)}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          keys.setActive(-1);
        }}
        onKeyDown={keys.onKeyDown}
      />
      <Popover anchor={input} open={open && matches.length > 0} onClose={() => setOpen(false)}>
        <ul role="listbox">
          {matches.map((option, index) => (
            <li
              key={option}
              role="option"
              aria-selected={false}
              data-active={index === keys.active || undefined}
              onPointerEnter={() => keys.setActive(index)}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => pick(index)}
              className="ui-popover__option"
            >
              {option}
            </li>
          ))}
        </ul>
      </Popover>
    </>
  );
};

// ------------------------------------------------------------------------------------------------
// MarkdownField: long text with a preview of how it will read on the sheet.
// ------------------------------------------------------------------------------------------------

export const MarkdownField: React.FC<{
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  id?: string;
}> = ({ value, onChange, rows = 6, placeholder, id }) => {
  const [preview, setPreview] = useState(false);
  return (
    <div className="relative">
      <div className="absolute -top-[1.6rem] right-0 flex gap-3 text-xs">
        {(['Текст', 'Просмотр'] as const).map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => setPreview(index === 1)}
            className={cx('transition-colors', preview === (index === 1) ? 'text-frame-bright' : 'text-ink-faint hover:text-ink-muted')}
          >
            {label}
          </button>
        ))}
      </div>
      {preview ? (
        <div className="ui-input ui-scroll overflow-y-auto" style={{ minHeight: `${rows * 1.5 + 1.1}rem`, maxHeight: '22rem' }}>
          {value.trim() ? <Prose>{value}</Prose> : <span className="text-sm text-ink-faint">Пусто</span>}
        </div>
      ) : (
        <TextArea id={id} rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
};
