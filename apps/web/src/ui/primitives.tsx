import React, { forwardRef, useId } from 'react';
import { Corners, Crest, RuleMark } from './ornaments';

const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');

// ------------------------------------------------------------------------------------------------
// Panel
// ------------------------------------------------------------------------------------------------

export type PanelVariant = 'plate' | 'paper' | 'inset';

type PanelProps = React.HTMLAttributes<HTMLElement> & {
  variant?: PanelVariant;
  /** Corner ornaments; on by default for plates. */
  ornate?: boolean;
  /** The setting's centre piece on the top edge: marks the main panel of a screen. */
  crest?: boolean;
  /** Clickable surface with the setting's hover effect. */
  interactive?: boolean;
  /** Persistent "selected" look, the same as hover. */
  active?: boolean;
  as?: 'div' | 'section' | 'article' | 'aside' | 'header' | 'nav' | 'button';
};

/** The leaves under a sheet of paper, the one nearest the page first. */
const LEAVES = [1, 2, 3, 4] as const;

export const Panel = forwardRef<HTMLElement, PanelProps>(
  (
    { variant = 'plate', ornate = variant === 'plate', crest, interactive, active, as: Component = 'div', className, children, ...rest },
    ref,
  ) => (
    <Component
      ref={ref as never}
      className={cx('ui-panel', variant !== 'plate' && `ui-panel--${variant}`, interactive && 'ui-interactive', className)}
      data-active={active || undefined}
      {...rest}
    >
      {interactive && <span className="ui-fx" aria-hidden />}
      {/* Paper lies on a heap of older leaves; settings that keep records on paper show it. */}
      {variant === 'paper' &&
        LEAVES.map((n) => <span key={n} className={`ui-leaf ui-leaf--${n}`} aria-hidden />)}
      {ornate && <Corners />}
      {crest && <Crest />}
      {children}
    </Component>
  ),
);
Panel.displayName = 'Panel';

// ------------------------------------------------------------------------------------------------
// Type
// ------------------------------------------------------------------------------------------------

/** Section heading in the setting's display face, with an ornamental rule. */
export const SectionTitle: React.FC<{
  children: React.ReactNode;
  /** Something aligned to the right of the title, e.g. an "add" button. */
  action?: React.ReactNode;
  className?: string;
}> = ({ children, action, className }) => (
  <div className={cx('flex items-center gap-4', className)}>
    <h2 className="ui-display ui-title ui-section-title text-[1.35rem] leading-none text-frame-bright">{children}</h2>
    <div className="ui-rule ui-rule--left flex-1" aria-hidden />
    {action}
  </div>
);

/** A divider with the setting's centre mark. */
export const Rule: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cx('ui-rule', className)} role="separator">
    <RuleMark />
  </div>
);

// ------------------------------------------------------------------------------------------------
// Buttons
// ------------------------------------------------------------------------------------------------

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** `row`: compact action inside a list entry, set in the body face. */
  size?: 'row' | 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', icon, className, children, type = 'button', ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cx('ui-button', `ui-button--${variant}`, `ui-button--${size}`, className)}
      {...rest}
    >
      {icon}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Accessible name; also shown as a tooltip. */
  label: string;
  size?: number;
  pressed?: boolean;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, size = 36, pressed, className, children, type = 'button', ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={cx('ui-icon-button', className)}
      style={{ width: size, height: size }}
      {...rest}
    >
      {children}
    </button>
  ),
);
IconButton.displayName = 'IconButton';

// ------------------------------------------------------------------------------------------------
// Tabs
// ------------------------------------------------------------------------------------------------

export interface TabItem<T extends string> {
  id: T;
  label: React.ReactNode;
  /** How many entries the tab holds, shown after its name. */
  count?: number;
}

/** Views of one list ("Всё", "Оружие", "Броня"): the open one is marked in the setting's manner. */
export function Tabs<T extends string>({
  value,
  items,
  onChange,
  label,
  className,
}: {
  value: T;
  items: TabItem<T>[];
  onChange: (value: T) => void;
  /** Accessible name of the tab list. */
  label: string;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className={cx('ui-tabs', className)}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={item.id === value}
          onClick={() => onChange(item.id)}
          className="ui-tabs__tab"
        >
          {item.label}
          {item.count !== undefined && <span className="ui-tabs__count">{item.count}</span>}
        </button>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------------------------------------
// Meter
// ------------------------------------------------------------------------------------------------

export type MeterTone = 'hp' | 'temp-hp' | 'sanity' | 'xp' | 'armor' | 'accent' | 'success' | 'danger';

export const Meter: React.FC<{
  value: number;
  max: number;
  tone: MeterTone;
  /** Extra amount drawn after the value, hatched (temporary hit points). */
  extra?: number;
  extraTone?: MeterTone;
  /** Part of the maximum lost until a rest (a Vital Sacrifice), drawn hatched at the end. */
  lost?: number;
  height?: number;
  ticks?: boolean;
  label?: string;
  className?: string;
}> = ({ value, max, tone, extra = 0, extraTone = 'temp-hp', lost = 0, height = 8, ticks = false, label, className }) => {
  const total = Math.max(max + lost, value + extra, 1);
  const percent = (part: number) => `${Math.min(100, Math.max(0, (part / total) * 100))}%`;
  return (
    <div
      className={cx('ui-meter', ticks && 'ui-meter--ticks', className)}
      style={
        {
          '--meter-height': `${height}px`,
          '--meter-color': `var(--c-${tone})`,
          '--meter-extra-color': `var(--c-${extraTone})`,
        } as React.CSSProperties
      }
      role="meter"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={label}
    >
      {extra > 0 && <div className="ui-meter__extra" style={{ width: percent(value + extra) }} />}
      <div className="ui-meter__fill" style={{ width: percent(value) }} />
      {lost > 0 && <div className="ui-meter__lost" style={{ width: percent(lost) }} />}
    </div>
  );
};

// ------------------------------------------------------------------------------------------------
// Fields
// ------------------------------------------------------------------------------------------------

export const Field: React.FC<{
  label: string;
  hint?: string;
  error?: string;
  children: (props: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }) => React.ReactNode;
  className?: string;
}> = ({ label, hint, error, children, className }) => {
  const id = useId();
  const describedBy = error || hint ? `${id}-note` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="ui-label">
        {label}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {(error || hint) && (
        <p id={describedBy} className={cx('mt-1.5 text-xs', error ? 'text-danger' : 'text-ink-faint')}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
};

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => <input ref={ref} className={cx('ui-input', className)} {...rest} />,
);
Input.displayName = 'Input';

export const TextArea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...rest }, ref) => <textarea ref={ref} className={cx('ui-input ui-scroll resize-y', className)} {...rest} />,
);
TextArea.displayName = 'TextArea';

// ------------------------------------------------------------------------------------------------
// Small pieces
// ------------------------------------------------------------------------------------------------

/** A quiet label for categories (action type, school, rarity). */
export const Tag: React.FC<{ tone?: string; children: React.ReactNode; className?: string }> = ({
  tone = 'frame',
  children,
  className,
}) => (
  <span className={cx('ui-tag', className)} style={{ '--tag-tone': `var(--c-${tone})` } as React.CSSProperties}>
    {children}
  </span>
);

export { cx };
