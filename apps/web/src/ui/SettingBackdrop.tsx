import React from 'react';
import type { Setting } from '@itd/schema';
import { FRAME_OUTER, VineFrameCorner } from './art/highFantasy';
import { SETTING_LIST } from './theme/settings';
import { SettingScope } from './theme/SettingScope';
import { cx } from './primitives';

/** A faint field of stars, as on an atlas of the sky. Three scattered layers, so it never tiles. */
const STARS =
  'radial-gradient(circle at 20% 30%, rgb(var(--c-frame-bright) / 0.7) 0 1px, transparent 1.5px) 0 0 / 173px 197px,' +
  'radial-gradient(circle at 70% 60%, rgb(var(--c-ink) / 0.45) 0 0.8px, transparent 1.3px) 0 0 / 89px 113px,' +
  'radial-gradient(circle at 40% 80%, rgb(var(--c-frame-bright) / 0.5) 0 1.4px, transparent 2px) 0 0 / 311px 277px';

/** Quiet vine flourishes in the screen corners over a field of stars; the content stays the focus. */
const HighFantasyFrame: React.FC = () => (
  <div className="absolute inset-0 text-frame">
    <div className="absolute inset-0 opacity-60" style={{ background: STARS }} />
    {(['left-0 top-0', 'right-0 top-0 -scale-x-100', 'bottom-0 left-0 -scale-y-100', 'bottom-0 right-0 -scale-100'] as const).map(
      (position) => (
        <div key={position} className={`absolute ${position}`} style={{ margin: FRAME_OUTER }}>
          <VineFrameCorner />
        </div>
      ),
    )}
  </div>
);

/** Heavy riveted bars across top and bottom, a red edge on the left. */
const GrimdarkFrame: React.FC = () => (
  <>
    <div className="absolute inset-x-0 top-0 h-[10px] border-b-2 border-frame/60 bg-gradient-to-b from-surface-2 to-surface" />
    <div className="absolute inset-x-0 bottom-0 h-[10px] border-t-2 border-frame/60 bg-gradient-to-t from-surface-2 to-surface" />
    <div
      className="absolute inset-x-0 top-[3px] h-[4px]"
      style={{ background: 'radial-gradient(circle, rgb(var(--c-frame-bright)) 1.5px, transparent 2px) 0 0 / 48px 4px repeat-x' }}
    />
    <div className="absolute inset-y-0 left-0 w-[3px] bg-accent/70" />
  </>
);

/** HUD brackets, a measuring scale and faint scanlines. */
const SciFiFrame: React.FC = () => (
  <>
    <div className="absolute left-6 top-6 h-16 w-16 border-l border-t border-frame" />
    <div className="absolute right-6 top-6 h-16 w-16 border-r border-t border-frame" />
    <div className="absolute bottom-6 left-6 h-16 w-16 border-b border-l border-frame" />
    <div className="absolute bottom-6 right-6 h-16 w-16 border-b border-r border-frame" />
    <div
      className="absolute inset-y-24 right-8 w-3 opacity-30"
      style={{ background: 'repeating-linear-gradient(180deg, rgb(var(--c-frame)) 0 1px, transparent 1px 12px)' }}
    />
    <div
      className="absolute inset-0 opacity-[0.025]"
      style={{ background: 'repeating-linear-gradient(0deg, rgb(var(--c-frame-bright)) 0 1px, transparent 1px 4px)' }}
    />
  </>
);

/** Darkness pressing in from the edges, a cold red at the bottom, an engraved double frame. */
const DarkFantasyFrame: React.FC = () => (
  <>
    <div className="absolute inset-3 border border-frame/50" />
    <div className="absolute inset-[18px] border border-frame/25" />
    <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 220px 60px rgb(0 0 0 / 0.85)' }} />
    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-accent/15 to-transparent" />
  </>
);

const FRAMES: Record<Setting, React.FC> = {
  'high-fantasy': HighFantasyFrame,
  grimdark: GrimdarkFrame,
  'sci-fi': SciFiFrame,
  'dark-fantasy': DarkFantasyFrame,
};

/**
 * Screen-edge decoration of each setting. All four are mounted at once and cross-fade, so moving
 * between characters of different settings morphs the frame instead of swapping it.
 */
export const SettingBackdrop: React.FC<{ setting: Setting; className?: string }> = ({ setting, className }) => (
  <div className={cx('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden>
    {SETTING_LIST.map(({ id }) => {
      const Frame = FRAMES[id];
      return (
        <SettingScope
          key={id}
          setting={id}
          className="absolute inset-0 transition-opacity duration-700"
          // Atmosphere, not decoration: the frame stays well behind the content.
          style={{ opacity: id === setting ? 0.45 : 0 }}
        >
          <Frame />
        </SettingScope>
      );
    })}
  </div>
);
