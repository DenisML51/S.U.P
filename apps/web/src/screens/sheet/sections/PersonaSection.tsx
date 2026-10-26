import React, { useMemo } from 'react';
import { rulesOf, type FeatureOrigin } from '@itd/game-logic';
import type { Character } from '@itd/schema';
import { Ledger, LedgerGroup, LedgerRow } from '../../../ui/Ledger';
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

interface FeatureRow {
  kind: 'trait' | 'ability';
  id: string;
  name: string;
  description: string;
  /** What it was picked in or what it is ("Боевой стиль", "Черта"), when the name alone does not say. */
  from?: string;
}

/**
 * The hero's features, each once, by where they come from: the parts its rules system names
 * (species, background, class), then the player's own. A pick stands in for the feature it was
 * picked in (Defense for Fighting Style) and names it; features used as actions are listed too, so
 * a feat is found here whatever it does.
 * Summaries the sheet shows elsewhere (proficiencies, the weapon mastery list) are left out.
 */
function useFeatureGroups(character: Character): { title: string; rows: FeatureRow[] }[] {
  const { build, traits, abilities } = character;
  const origins = useMemo(() => (build ? rulesOf(build).featureOrigins(build) : new Map<string, FeatureOrigin>()), [build]);

  return useMemo(() => {
    const entries: (FeatureRow & { grant?: string })[] = [
      ...traits.filter((t) => t.grant !== 'build').map((t) => ({ kind: 'trait' as const, ...pick(t) })),
      ...abilities
        .filter((a) => a.grant && origins.has(a.grant))
        .map((a) => ({ kind: 'ability' as const, ...pick(a) })),
    ];
    const byGrant = new Map(entries.filter((e) => e.grant).map((e) => [e.grant!, e]));
    const replaced = new Set(
      entries.map((e) => (e.grant ? origins.get(e.grant)?.parent : undefined)).filter(Boolean),
    );
    const order = [...origins.keys()];

    const parts = new Map<string, FeatureRow[]>();
    const own: FeatureRow[] = [];
    for (const entry of entries) {
      const origin = entry.grant ? origins.get(entry.grant) : undefined;
      if (!origin) {
        own.push(entry);
        continue;
      }
      if (replaced.has(entry.grant)) continue;
      const parent = origin.parent ? byGrant.get(origin.parent)?.name : undefined;
      const row = { ...entry, from: parent ?? origin.label };
      parts.set(origin.part, [...(parts.get(origin.part) ?? []), row]);
    }
    const rank = (row: FeatureRow & { grant?: string }) => order.indexOf(row.grant ?? '');
    return [
      ...(build ? rulesOf(build).featureParts : []).map((part) => ({
        title: part.title,
        rows: (parts.get(part.id) ?? []).sort((a, b) => rank(a) - rank(b)),
      })),
      { title: 'Своё', rows: own },
    ].filter((group) => group.rows.length > 0);
  }, [build, traits, abilities, origins]);
}

const pick = (entry: { id: string; name: string; description?: string; grant?: string }) => ({
  id: entry.id,
  name: entry.name,
  description: entry.description ?? '',
  grant: entry.grant,
});

/**
 * Who the hero is as a person: the story so far and how they look on the left, read like a page;
 * their traits and character on the right, short and to the point.
 */
export const PersonaSection: React.FC<{ character: Character }> = ({ character }) => {
  const dialogs = useSheetDialogs();
  const save = useSheetText();
  const groups = useFeatureGroups(character);

  return (
    <div className="flex h-full gap-8 max-lg:flex-col">
      {/* The pages grow down with their text; only a very long story scrolls the pages as a whole.
          The scroller keeps a margin round them, so the leaves heaped under each page are not cut.
          Where the room is narrow (a small screen, or an entry's card open beside), the pages
          stack: the story first, the features under it. */}
      <div className="ui-section-list flex min-h-0 min-w-0 flex-1">
        <div className="ui-persona__columns ui-scroll ui-scroll--bare -m-4 grid min-h-0 min-w-0 flex-1 items-start gap-8 overflow-y-auto p-4">
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
              title="Особенности"
              addLabel="Добавить особенность"
              onAdd={() => dialogs.open({ kind: 'trait' })}
              scroll={false}
            >
              {groups.map((group) => (
                <React.Fragment key={group.title}>
                  {groups.length > 1 && <LedgerGroup>{group.title}</LedgerGroup>}
                  {group.rows.map((row) => (
                    <LedgerRow
                      key={row.id}
                      title={row.name}
                      meta={[row.from, plainText(row.description)].filter(Boolean).join(' · ')}
                      selected={dialogs.isSelected(row.kind, row.id)}
                      onOpen={() => dialogs.openEntry(row.kind, row.id)}
                    />
                  ))}
                </React.Fragment>
              ))}
              {groups.length === 0 && <li className="py-4 text-sm opacity-60">Особенностей пока нет</li>}
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
      </div>
      <SectionAside />
    </div>
  );
};
