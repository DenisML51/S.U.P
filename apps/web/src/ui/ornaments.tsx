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
/** Motes rising off the bar while a level waits: where each starts along it, its drift and beat. */
const READY_MOTES = Array.from({ length: 18 }, (_, i) => ({
  left: `${(4 + ((i * 53) % 92)).toFixed(0)}%`,
  drift: `${(((i * 37) % 21) - 10).toFixed(0)}px`,
  rise: `${(18 + ((i * 29) % 22)).toFixed(0)}px`,
  delay: `${(-(i * 0.47) % 3.4).toFixed(2)}s`,
  duration: `${(2.2 + ((i * 17) % 13) / 10).toFixed(2)}s`,
  size: `${(2 + (i % 3)).toFixed(0)}px`,
}));

/**
 * A level waits to be taken: the setting's own marvel over the experience bar, laid over a glow
 * that breathes along the bar, a light running down its length, a spark beating at its end and
 * motes rising off it — stars, fairy dust, data, embers, grace, spores, each setting its own.
 */
export const LevelReady: React.FC = () => {
  const { LevelReady: Effect } = useSettingArt();
  return (
    <span className="ui-level-ready">
      <span className="ui-level-ready__glow" aria-hidden />
      <span className="ui-level-ready__sheen" aria-hidden />
      <Effect />
      <span className="ui-level-ready__motes" aria-hidden>
        {READY_MOTES.map((mote, i) => (
          <i
            key={i}
            style={
              {
                left: mote.left,
                width: mote.size,
                height: mote.size,
                animationDelay: mote.delay,
                animationDuration: mote.duration,
                '--drift': mote.drift,
                '--rise': mote.rise,
              } as React.CSSProperties
            }
          />
        ))}
      </span>
      <span className="ui-level-ready__spark" aria-hidden />
    </span>
  );
};
