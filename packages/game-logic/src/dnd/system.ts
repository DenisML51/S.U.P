import type { RuleSystem } from '../systems';
import { applyBuild, describeGrant, featureOrigins } from './build';

/** D&D 2024 as the generic screens see it. */
export const DND_2024: RuleSystem = {
  id: 'dnd2024',
  featureParts: [
    { id: 'species', title: 'Вид' },
    { id: 'background', title: 'Предыстория' },
    { id: 'class', title: 'Класс' },
  ],
  rebuild: (character, build) => applyBuild(character, build).character,
  featureOrigins: (build) =>
    new Map(
      [...featureOrigins(build)].map(([key, origin]) => [
        key,
        { part: origin.part, parent: origin.parent, label: origin.source === 'feat' ? 'Черта' : undefined },
      ]),
    ),
  describeGrant,
};
