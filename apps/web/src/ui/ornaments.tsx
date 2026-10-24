import React from 'react';
import type { Setting } from '@itd/schema';
import { SETTING_ART } from './art';
import { useSetting } from './theme/SettingScope';

/** The ornament set of the nearest setting scope, or of the one asked for. */
const useArt = (setting?: Setting) => {
  const scope = useSetting();
  return SETTING_ART[setting ?? scope];
};

/** The setting's corner pieces on all four corners of the positioned parent; nothing in sci-fi. */
export const Corners: React.FC<{ setting?: Setting }> = ({ setting }) => {
  const corner = useArt(setting).corner;
  if (!corner) return null;
  return (
    <>
      {(['tl', 'tr', 'bl', 'br'] as const).map((position) => (
        <svg key={position} className={`ui-corner ui-corner--${position}`} viewBox={corner.viewBox} aria-hidden>
          {corner.art}
        </svg>
      ))}
    </>
  );
};

/** The setting's centre piece on the top edge of the positioned parent (a major panel). */
export const Crest: React.FC = () => {
  const crest = useArt().crest;
  if (!crest) return null;
  return (
    <svg className="ui-crest" viewBox={crest.viewBox} aria-hidden>
      {crest.art}
    </svg>
  );
};

export const RuleMark: React.FC = () => <>{useArt().ruleMark}</>;

/** List bullet in the vocabulary of the current setting; outlined marks an inactive entry. */
export const LedgerBullet: React.FC<{ filled?: boolean }> = ({ filled = true }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className="shrink-0">
    {useArt().bullet(filled)}
  </svg>
);

/** Small heraldic mark of the setting. */
export const SettingEmblem: React.FC<{ size?: number; className?: string }> = ({ size = 28, className }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className={className}>
    {useArt().emblem}
  </svg>
);
