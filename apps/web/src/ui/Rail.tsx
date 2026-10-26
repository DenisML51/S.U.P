import React from 'react';
import { cx } from './primitives';

/** A vertical navigation strip down the left edge of a screen. */
export const Rail: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className }) => (
  <nav className={cx('ui-rail flex h-full w-[76px] shrink-0 flex-col py-3', className)} aria-label={label}>
    {children}
  </nav>
);

/** A place on the rail: its icon over its name; the open one is marked in the setting's manner. */
export const RailButton: React.FC<{
  label: string;
  Icon: React.FC<React.SVGProps<SVGSVGElement>>;
  active?: boolean;
  onClick: () => void;
  hint?: string;
}> = ({ label, Icon, active, onClick, hint }) => (
  <button
    type="button"
    onClick={onClick}
    title={hint ?? label}
    aria-current={active ? 'page' : undefined}
    className="ui-rail__item group relative flex w-full flex-col items-center gap-1 py-2.5"
  >
    <span className="ui-rail__mark" aria-hidden />
    <Icon width={24} height={24} className="ui-rail__icon" />
    <span className="ui-rail__label text-[11px] leading-none">{label}</span>
  </button>
);

/** A thin rule between groups of the rail. */
export const RailDivider: React.FC = () => <div className="ui-rail__divider mx-4 my-2 h-px" aria-hidden />;

/**
 * The rail's places laid along the bottom of a narrow screen, one column each, the open one marked
 * along their top edge.
 */
export const TabBar: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({
  label,
  children,
  className,
}) => (
  <nav
    className={cx('ui-rail ui-tabbar grid shrink-0 grid-flow-col auto-cols-fr', className)}
    aria-label={label}
  >
    {children}
  </nav>
);
