import type { Build, CocBuild } from '@itd/schema';
import type { RuleSystem } from '../systems';
import { talentDef } from './content/pulp';
import { talentTraits } from './creation';
import { rebuildInvestigator } from './engine';

const coc = (build: Build): CocBuild => {
  if (build.ruleset !== 'coc7') throw new Error(`Not a Call of Cthulhu build: ${build.ruleset}`);
  return build;
};

/** Call of Cthulhu as the generic screens see it: Pulp talents are its granted features. */
export const COC_7: RuleSystem = {
  id: 'coc7',
  featureParts: [{ id: 'talents', title: 'Таланты' }],
  rebuild: (character, build) => {
    const rebuilt = rebuildInvestigator(character, coc(build));
    const own = rebuilt.traits.filter((trait) => !trait.grant?.startsWith('talent:'));
    return { ...rebuilt, traits: [...talentTraits(coc(build)), ...own] };
  },
  featureOrigins: (build) => new Map(coc(build).talents.map((id) => [`talent:${id}`, { part: 'talents' }])),
  describeGrant: (_build, grant) => {
    const talent = grant?.startsWith('talent:') ? talentDef(grant.slice('talent:'.length)) : undefined;
    return talent ? `Талант Pulp «${talent.name}»` : undefined;
  },
};
