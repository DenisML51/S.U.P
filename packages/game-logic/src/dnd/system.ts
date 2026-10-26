import type { Build, DndBuild } from '@itd/schema';
import type { RuleSystem } from '../systems';
import { applyBuild, catalogSpellEntry, catalogSpells, describeGrant, featureOrigins, sheetChoices } from './build';

const dnd = (build: Build): DndBuild => {
  if (build.ruleset !== 'dnd2024') throw new Error(`Not a D&D 2024 build: ${build.ruleset}`);
  return build;
};

/** D&D 2024 as the generic screens see it. */
export const DND_2024: RuleSystem = {
  id: 'dnd2024',
  featureParts: [
    { id: 'species', title: 'Вид' },
    { id: 'background', title: 'Предыстория' },
    { id: 'class', title: 'Класс' },
  ],
  rebuild: (character, build) => applyBuild(character, dnd(build)).character,
  featureOrigins: (build) =>
    new Map(
      [...featureOrigins(dnd(build))].map(([key, origin]) => [
        key,
        { part: origin.part, parent: origin.parent, label: origin.source === 'feat' ? 'Черта' : undefined },
      ]),
    ),
  describeGrant: (build, grant) => describeGrant(dnd(build), grant),
  sheetChoices: (build, grant) =>
    sheetChoices(dnd(build))
      .filter((open) => open.owner.key === grant)
      .map((open) => ({ key: open.key, label: open.choice.label, count: open.count, picked: open.picked.length })),
  spellCatalog: {
    list: (build) =>
      catalogSpells(dnd(build)).map(({ def, ownList, castable }) => ({
        id: def.id,
        name: def.name,
        level: def.level,
        school: def.school,
        ritual: !!def.ritual,
        concentration: !!def.concentration,
        ownList,
        castable,
      })),
    entry: (_build, id) => catalogSpellEntry(id),
  },
};
