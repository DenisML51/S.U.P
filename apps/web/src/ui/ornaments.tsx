import React from 'react';
import type { Theme } from './theme/settings';
import { SETTING_ART } from './art';
import { useSetting } from './theme/SettingScope';

/** The ornament set of the nearest setting scope, or of the one asked for. */
export const useSettingArt = (setting?: Theme) => {
  const scope = useSetting();
  return SETTING_ART[setting ?? scope];
};

/** The setting's corner pieces on all four corners of the positioned parent; nothing in sci-fi. */
export const Corners: React.FC<{ setting?: Theme }> = ({ setting }) => {
  const corner = useSettingArt(setting).corner;
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
  const crest = useSettingArt().crest;
  if (!crest) return null;
  return (
    <svg className="ui-crest" viewBox={crest.viewBox} aria-hidden>
      {crest.art}
    </svg>
  );
};

export const RuleMark: React.FC = () => <>{useSettingArt().ruleMark}</>;

/** List bullet in the vocabulary of the current setting; outlined marks an inactive entry. */
export const LedgerBullet: React.FC<{ filled?: boolean }> = ({ filled = true }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className="shrink-0">
    {useSettingArt().bullet(filled)}
  </svg>
);

/** Small heraldic mark of the setting. */
export const SettingEmblem: React.FC<{ size?: number; className?: string }> = ({ size = 28, className }) => {
  const { Emblem } = useSettingArt();
  return <Emblem width={size} height={size} aria-hidden className={className} />;
};

/** The setting's marvel over the experience bar when a new level can be taken. */
export const LevelReady: React.FC = () => {
  const { LevelReady: Effect } = useSettingArt();
  return (
    <span className="ui-level-ready">
      <Effect />
    </span>
  );
};
