import React, { useLayoutEffect, useRef, useState } from 'react';
import { Panel, TextArea, cx } from '../../../ui/primitives';
import { Prose } from '../../../ui/Prose';

/**
 * A titled piece of the player's own text: read as formatted text, edited in place. The field
 * saves when it loses focus; Escape drops the edit.
 */
export const EditableText: React.FC<{
  title: string;
  /** `title`: a heading in the display face; `label`: a small caption above the text. */
  heading?: 'title' | 'label';
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  /** Long text folds to a few lines and opens on click. */
  collapsible?: boolean;
  rows?: number;
  className?: string;
}> = ({ title, heading = 'title', value, onSave, placeholder = 'Пока пусто', collapsible = false, rows = 5, className }) => {
  const [draft, setDraft] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const editing = draft !== null;
  const folds = collapsible && (overflowing || expanded);

  // Folding only makes sense for text longer than the folded height.
  useLayoutEffect(() => {
    const node = textRef.current;
    if (!collapsible || !node || expanded) return;
    const measure = () => setOverflowing(node.scrollHeight > node.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [collapsible, value, expanded, editing]);

  return (
    <section className={cx('group/text', className)}>
      <div className="flex items-baseline justify-between gap-4">
        {heading === 'title' ? (
          <h3 className="ui-display text-base">{title}</h3>
        ) : (
          <h4 className="text-[11px] font-medium uppercase tracking-[0.16em] opacity-60">{title}</h4>
        )}
        {!editing && (
          <button
            type="button"
            className={cx('text-xs transition-opacity hover:!opacity-100', heading === 'label' ? 'opacity-0 focus:opacity-60 group-hover/text:opacity-60' : 'opacity-60')}
            onClick={() => setDraft(value)}
          >
            изменить
          </button>
        )}
      </div>
      {editing ? (
        <TextArea
          autoFocus
          rows={rows}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              setDraft(null);
            }
          }}
          onBlur={() => {
            if (draft !== value) onSave(draft);
            setDraft(null);
          }}
          className="mt-2"
        />
      ) : value.trim() ? (
        <div
          ref={textRef}
          role={folds ? 'button' : undefined}
          tabIndex={folds ? 0 : undefined}
          onClick={folds ? () => setExpanded((v) => !v) : undefined}
          onKeyDown={folds ? (e) => e.key === 'Enter' && setExpanded((v) => !v) : undefined}
          title={folds ? (expanded ? 'Свернуть' : 'Развернуть') : undefined}
          className={cx(
            'ui-notes mt-1',
            collapsible && !expanded && 'ui-notes--collapsed',
            collapsible && overflowing && !expanded && 'ui-notes--faded',
            folds && 'cursor-pointer',
          )}
        >
          <Prose>{value}</Prose>
        </div>
      ) : (
        <button type="button" className="mt-1 block text-left text-sm opacity-50 hover:opacity-80" onClick={() => setDraft('')}>
          {placeholder}
        </button>
      )}
    </section>
  );
};

/** Notes of a sheet section on their own sheet of paper, folded when long. */
export const SectionNotes: React.FC<{
  title?: string;
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ title = 'Заметки', className, ...rest }) => (
  <Panel variant="paper" ornate={false} className={cx('px-5 py-3', className)}>
    <EditableText title={title} collapsible {...rest} />
  </Panel>
);
