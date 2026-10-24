import React from 'react';
import type { Character } from '@itd/schema';
import { Ledger, LedgerRow } from '../../../ui/Ledger';
import { Panel } from '../../../ui/primitives';
import { plainText } from '../../../ui/text';
import { useSheetDialogs } from '../dialogs/context';
import { SectionAside } from '../SectionAside';
import { EditableText } from '../parts/EditableText';
import { useSheetText } from '../useSheetText';

type PersonaField =
  'alignment' | 'personalityTraits' | 'ideals' | 'bonds' | 'flaws' | 'alliesAndOrganizations';

const CHARACTER_FIELDS: { field: PersonaField; title: string; placeholder: string }[] = [
  { field: 'alignment', title: 'Мировоззрение', placeholder: 'Например: законно-доброе' },
  { field: 'personalityTraits', title: 'Черты характера', placeholder: 'Привычки, манеры, речь' },
  { field: 'ideals', title: 'Идеалы', placeholder: 'Во что герой верит' },
  { field: 'bonds', title: 'Привязанности', placeholder: 'Люди, места, обеты' },
  { field: 'flaws', title: 'Слабости', placeholder: 'Пороки, страхи, тайны' },
  {
    field: 'alliesAndOrganizations',
    title: 'Союзники и организации',
    placeholder: 'Клан, гильдия, покровители',
  },
];

/**
 * Who the hero is as a person: the story so far and how they look on the left, read like a page;
 * their traits and character on the right, short and to the point.
 */
export const PersonaSection: React.FC<{ character: Character }> = ({ character }) => {
  const dialogs = useSheetDialogs();
  const save = useSheetText();

  return (
    <div className="flex h-full gap-8">
      {/* The pages grow down with their text; only a very long story scrolls the pages as a whole.
          The scroller keeps a margin round them, so the leaves heaped under each page are not cut. */}
      <div className="ui-scroll ui-scroll--bare -m-4 grid min-h-0 min-w-0 flex-1 grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] items-start gap-8 overflow-y-auto p-4">
        <Panel variant="paper" ornate={false} className="space-y-6 px-7 py-6">
          <EditableText
            title="Предыстория"
            value={character.backstory}
            onSave={save('backstory')}
            placeholder="Расскажите, откуда герой и что привело его сюда"
            rows={14}
          />
          <EditableText
            title="Внешность"
            value={character.appearance}
            onSave={save('appearance')}
            placeholder="Рост, черты лица, шрамы, одежда"
            rows={5}
          />
        </Panel>

        <div className="flex min-w-0 flex-col gap-6">
          <Ledger
            title="Черты"
            addLabel="Добавить черту"
            onAdd={() => dialogs.open({ kind: 'trait' })}
            scroll={false}
          >
            {character.traits.map((trait) => (
              <LedgerRow
                key={trait.id}
                title={trait.name}
                meta={plainText(trait.description)}
                selected={dialogs.isSelected('trait', trait.id)}
                onOpen={() => dialogs.openEntry('trait', trait.id)}
              />
            ))}
            {character.traits.length === 0 && (
              <li className="py-4 text-sm opacity-60">Особых черт пока нет</li>
            )}
          </Ledger>

          <Panel variant="paper" ornate={false} className="space-y-4 px-6 py-5">
            {CHARACTER_FIELDS.map(({ field, title, placeholder }) => (
              <EditableText
                key={field}
                heading="label"
                title={title}
                value={character[field]}
                onSave={save(field)}
                placeholder={placeholder}
                rows={3}
              />
            ))}
          </Panel>
        </div>
      </div>
      <SectionAside />
    </div>
  );
};
