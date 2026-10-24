import React from 'react';
import { IconButton, Panel, Rule, cx } from './primitives';
import { IconClose } from './icons';

export interface DetailsFact {
  label: string;
  value: React.ReactNode;
}

/**
 * The card of the entry chosen in a list (a spell, an item, an ability), shown beside the list so
 * the list stays in view — as an inventory shows the selected item in a game. Its picture, kind and
 * name head it, the key figures follow, then the text and what can be done with the entry.
 */
export const DetailsPane: React.FC<{
  title: React.ReactNode;
  /** What kind of thing this is ("Заклинание · 3 круг"). */
  eyebrow?: React.ReactNode;
  /** The entry's picture, usually an icon tile. */
  icon?: React.ReactNode;
  /** Key figures, large and side by side. */
  facts?: DetailsFact[];
  /** Buttons along the bottom edge. */
  actions?: React.ReactNode;
  /** Small tools in the top right corner, before the close button (delete). */
  tools?: React.ReactNode;
  onClose?: () => void;
  children?: React.ReactNode;
  className?: string;
}> = ({ title, eyebrow, icon, facts, actions, tools, onClose, children, className }) => (
  <Panel
    as="aside"
    crest
    className={cx('ui-details flex min-h-0 flex-col', className)}
    aria-label="Подробности"
  >
    <header className="ui-details__head relative px-6 pb-3 pt-7">
      <div className="flex items-center gap-4">
        {icon}
        <div className="min-w-0 flex-1">
          {eyebrow && <div className="ui-details__eyebrow">{eyebrow}</div>}
          <h2 className="ui-details__title ui-display ui-title">{title}</h2>
        </div>
      </div>
      <Rule className="ui-details__rule mt-4" />
      {(tools || onClose) && (
        <div className="absolute right-3 top-3 flex items-center gap-1">
          {tools}
          {onClose && (
            <IconButton label="Закрыть" onClick={onClose} size={30}>
              <IconClose width={16} height={16} />
            </IconButton>
          )}
        </div>
      )}
    </header>
    {facts && facts.length > 0 && (
      <dl className="ui-details__facts mx-6">
        {facts.map((fact) => (
          <div key={fact.label} className="ui-details__fact">
            <dt>{fact.label}</dt>
            <dd className="ui-numeric">{fact.value}</dd>
          </div>
        ))}
      </dl>
    )}
    {children && (
      <div className="ui-details__body ui-scroll min-h-0 flex-1 overflow-y-auto px-6 py-4">{children}</div>
    )}
    {actions && (
      <footer className="ui-details__foot flex flex-wrap items-center gap-2 px-6 py-4">{actions}</footer>
    )}
  </Panel>
);
