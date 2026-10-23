import React, { useLayoutEffect, useRef, useState } from 'react';
import { Panel, TextArea, cx } from '../../../ui/primitives';
import { Prose } from '../../../ui/Prose';

/**
 * Free-text notes of a section on paper. Collapsed to one line when long; edited in place and
 * saved when the field loses focus.
 */
export const SectionNotes: React.FC<{ title?: string; value: string; onSave: (value: string) => void; placeholder?: string }> = ({
  title = 'Заметки',
  value,
  onSave,
  placeholder = 'Пока пусто',
}) => {
  const [draft, setDraft] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const editing = draft !== null;
  const textRef = useRef<HTMLButtonElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  // Collapsing only makes sense for notes longer than the collapsed height.
  useLayoutEffect(() => {
    const node = textRef.current;
    if (!node || expanded) return;
    const measure = () => setOverflowing(node.scrollHeight > node.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [value, expanded, editing]);

  return (
    <Panel variant="paper" ornate={false} className="px-5 py-3">
      <div className="flex items-center justify-between gap-4">
        <h3 className="ui-display text-base">{title}</h3>
        {!editing && (
          <button type="button" className="text-xs opacity-70 hover:opacity-100" onClick={() => setDraft(value)}>
            изменить
          </button>
        )}
      </div>
      {editing ? (
        <TextArea
          autoFocus
          rows={5}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft !== value) onSave(draft);
            setDraft(null);
          }}
          className="mt-2 !bg-paper !text-paper-ink"
        />
      ) : value ? (
        <button
          ref={textRef}
          type="button"
          onClick={() => setExpanded((v) => !v)}
          disabled={!overflowing && !expanded}
          className={cx('ui-notes mt-1 block w-full cursor-default text-left', !expanded && 'ui-notes--collapsed', overflowing && !expanded && 'ui-notes--faded', (overflowing || expanded) && 'cursor-pointer')}
          title={overflowing || expanded ? (expanded ? 'Свернуть' : 'Развернуть') : undefined}
        >
          <Prose>{value}</Prose>
        </button>
      ) : (
        <p className="mt-1 text-sm opacity-60">{placeholder}</p>
      )}
    </Panel>
  );
};
