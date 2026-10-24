import React from 'react';
import { ATTRIBUTES_LIST, SKILLS_LIST } from '@itd/game-logic';
import { cx } from '../../ui/primitives';
import type { Creation } from './useCreation';

/** Skills and saving throws the hero is trained in, grouped by the attribute they use. */
export const TrainingChoice: React.FC<{ creation: Creation; columns?: 1 | 2 | 3 }> = ({
  creation,
  columns = 2,
}) => (
  <div
    className={cx(
      'grid gap-x-6 gap-y-4',
      columns === 3 ? 'grid-cols-3' : columns === 2 ? 'grid-cols-2' : 'grid-cols-1',
    )}
  >
    {ATTRIBUTES_LIST.map((attribute) => {
      const skills = SKILLS_LIST.filter((s) => s.attribute === attribute.id);
      const save = creation.savingThrows.includes(attribute.id);
      return (
        <div key={attribute.id}>
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className="truncate text-xs uppercase tracking-[0.14em] text-ink-faint">
              {attribute.name}
            </span>
            <button
              type="button"
              aria-pressed={save}
              onClick={() => creation.toggleSave(attribute.id)}
              className={cx(
                'shrink-0 whitespace-nowrap text-xs transition-colors',
                save ? 'text-frame-bright' : 'text-ink-faint hover:text-ink-muted',
              )}
            >
              {save ? '◆ спасбросок' : '◇ спасбросок'}
            </button>
          </div>
          {skills.map((skill) => {
            const trained = creation.skills.find((s) => s.id === skill.id)?.proficient ?? false;
            return (
              <button
                key={skill.id}
                type="button"
                aria-pressed={trained}
                onClick={() => creation.toggleSkill(skill.id)}
                className={cx(
                  'flex w-full items-center gap-2 py-0.5 text-left text-sm transition-colors',
                  trained ? 'text-ink' : 'text-ink-faint hover:text-ink-muted',
                )}
              >
                <span
                  className={cx(
                    'h-2 w-2 rotate-45 border',
                    trained ? 'border-frame-bright bg-frame-bright' : 'border-ink-faint',
                  )}
                  aria-hidden
                />
                {skill.name}
              </button>
            );
          })}
        </div>
      );
    })}
  </div>
);
