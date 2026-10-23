import React, { useState } from 'react';
import { Panel, TextArea } from '../../../ui/primitives';

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
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={`mt-1 block w-full whitespace-pre-line text-left text-sm leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}
          title={expanded ? 'Свернуть' : 'Развернуть'}
        >
          {value}
        </button>
      ) : (
        <p className="mt-1 text-sm opacity-60">{placeholder}</p>
      )}
    </Panel>
  );
};
