import React, { forwardRef, useId } from 'react';
import { Corners, RuleMark } from './ornaments';

const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');

// ------------------------------------------------------------------------------------------------
// Panel
// ------------------------------------------------------------------------------------------------

export type PanelVariant = 'plate' | 'paper' | 'inset';

type PanelProps = React.HTMLAttributes<HTMLElement> & {
  variant?: PanelVariant;
  /** Corner ornaments; on by default for plates. */
  ornate?: boolean;
  as?: 'div' | 'section' | 'article' | 'aside' | 'header' | 'nav' | 'button';
};

export const Panel = forwardRef<HTMLElement, PanelProps>(
  ({ variant = 'plate', ornate = variant === 'plate', as: Component = 'div', className, children, ...rest }, ref) => (
    <Component
      ref={ref as never}
      className={cx('ui-panel', variant !== 'plate' && `ui-panel--${variant}`, className)}
      {...rest}
    >
      {ornate && <Corners />}
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
    <h2 className="ui-display ui-title text-[1.35rem] leading-none text-frame-bright">{children}</h2>
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
  size?: 'sm' | 'md' | 'lg';
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
  height?: number;
  ticks?: boolean;
  label?: string;
  className?: string;
}> = ({ value, max, tone, extra = 0, extraTone = 'temp-hp', height = 8, ticks = false, label, className }) => {
  const total = Math.max(max, value + extra, 1);
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
  <span
    className={cx('inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium leading-none', className)}
    style={{
      color: `rgb(var(--c-${tone}))`,
      border: `1px solid rgb(var(--c-${tone}) / 0.45)`,
      background: `rgb(var(--c-${tone}) / 0.08)`,
      borderRadius: 'var(--radius)',
    }}
  >
    {children}
  </span>
);

export { cx };
