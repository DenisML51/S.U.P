import React from 'react';
import { useReducedMotion } from 'framer-motion';
import { CONDITION_IDS, fifth } from '@itd/game-logic/coc';
import type { Character } from '@itd/schema';
import { effectiveMadnessEffects } from '../../data/settings';
import { useCharacterStore } from '../../store/useCharacterStore';

/** How badly the mind is going: nothing, uneasy (sanity low), a bout of madness, or lasting insanity. */
export type MadnessStage = 0 | 1 | 2 | 3;

export function madnessStage(character: Pick<Character, 'sanity' | 'conditions' | 'coc'>): MadnessStage {
  const has = (id: string) => character.conditions.includes(id);
  if (has(CONDITION_IDS.indefiniteInsanity) || has(CONDITION_IDS.permanentInsanity)) return 3;
  if (has(CONDITION_IDS.temporaryInsanity)) return 2;
  const start = character.coc?.startingSanity ?? 50;
  return character.sanity <= Math.max(5, fifth(start) * 2) ? 1 : 0;
}

/**
 * The edge of sight closing in. Drawn over the whole screen and never in the way of a click: a
 * veil of veined noise at the borders that beats like a racing heart; in a bout the edges blur and
 * drain of colour and shadows slip past at the edge of vision; in lasting madness the veil sways,
 * its colours come apart and the dark falls for an instant now and then. Each setting tints it
 * (see coc.css). The app's setting "Эффекты безумия" calms it (no strobe, flicker or sway) or turns
 * it off; reduced motion always calms it.
 */
export const InsanityVeil: React.FC<{ stage: MadnessStage }> = ({ stage }) => {
  const chosen = useCharacterStore((s) => s.settings.madnessEffects);
  const mode = effectiveMadnessEffects(chosen, !!useReducedMotion());
  if (stage === 0 || mode === 'off') return null;
  return (
    <div className="coc-veil" data-stage={stage} data-mode={mode} aria-hidden>
      <div className="coc-veil__noise" />
      <div className="coc-veil__noise coc-veil__noise--b" />
      <div className="coc-veil__pulse" />
      {stage >= 2 && (
        <>
          <div className="coc-veil__tunnel" />
          <div className="coc-veil__shade coc-veil__shade--l" />
          <div className="coc-veil__shade coc-veil__shade--r" />
        </>
      )}
      {stage >= 3 && (
        <>
          <div className="coc-veil__split" />
          <div className="coc-veil__flicker" />
        </>
      )}
    </div>
  );
};
