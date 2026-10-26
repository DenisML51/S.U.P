import React from 'react';
import { ATTRIBUTES_LIST, SKILLS_LIST } from '@itd/game-logic';
import { Section } from '../../ui/Section';
import type { Creation } from './useCreation';

/**
 * Skills and saving throws the hero is trained in, grouped by the score they use: each score a
 * section with its saving throw on the right and its skills as chips.
 */
export const TrainingChoice: React.FC<{ creation: Creation }> = ({ creation }) => (
  <div className="mx-auto grid max-w-5xl grid-cols-2 gap-x-10 gap-y-7 [&>.ui-section+.ui-section]:mt-0">
    {ATTRIBUTES_LIST.map((attribute) => {
      const skills = SKILLS_LIST.filter((s) => s.attribute === attribute.id);
      const save = creation.savingThrows.includes(attribute.id);
      return (
        <Section
          key={attribute.id}
          title={attribute.name}
          aside={
            <button
              type="button"
              aria-pressed={save}
              onClick={() => creation.toggleSave(attribute.id)}
              className="ui-option ui-option--chip !h-7 !px-2.5 !text-xs"
            >
              Спасбросок
            </button>
          }
        >
          {skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <button
                  key={skill.id}
                  type="button"
                  aria-pressed={creation.skills.find((s) => s.id === skill.id)?.proficient ?? false}
                  onClick={() => creation.toggleSkill(skill.id)}
                  className="ui-option ui-option--chip"
                >
                  {skill.name}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-faint">Навыков нет — только спасбросок.</p>
          )}
        </Section>
      );
    })}
  </div>
);
