import React from 'react';
import { CONDITION_IDS, fifth } from '@itd/game-logic/coc';
import type { Character } from '@itd/schema';

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
 * veil of veined noise at the borders that beats like a racing heart, shadows that slip past at the
 * edge of vision, and at the worst the page itself sways and its colours come apart. Each setting
 * tints it (see coc.css); reduced motion keeps only the still veil.
 */
export const InsanityVeil: React.FC<{ stage: MadnessStage }> = ({ stage }) =>
  stage === 0 ? null : (
    <div className="coc-veil" data-stage={stage} aria-hidden>
      <div className="coc-veil__noise" />
      <div className="coc-veil__noise coc-veil__noise--b" />
      <div className="coc-veil__pulse" />
      {stage >= 2 && (
        <>
          <div className="coc-veil__shade coc-veil__shade--l" />
          <div className="coc-veil__shade coc-veil__shade--r" />
        </>
      )}
      {stage >= 3 && <div className="coc-veil__split" />}
    </div>
  );
