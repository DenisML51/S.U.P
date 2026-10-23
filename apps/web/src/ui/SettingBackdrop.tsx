import React from 'react';
import type { Setting } from '@itd/schema';
import { SETTING_LIST } from './theme/settings';
import { SettingScope } from './theme/SettingScope';
import { cx } from './primitives';

/** Gilt filigree in the four corners. */
const HighFantasyFrame: React.FC = () => {
  const corner = (
    <svg width="120" height="120" viewBox="0 0 180 180" fill="none" stroke="rgb(var(--c-frame))">
      <path d="M14 170V40C14 26 26 14 40 14h130" strokeWidth="1" />
      <path d="M24 130V48c0-13 11-24 24-24h82" strokeWidth="0.75" opacity="0.6" />
      <path d="M14 76c20 0 34 14 34 34M76 14c0 20 14 34 34 34" strokeWidth="0.75" opacity="0.7" />
      <path d="M40 40l9-4 4 9-9 4z" fill="rgb(var(--c-frame-bright))" stroke="none" />
      <circle cx="110" cy="48" r="2" fill="rgb(var(--c-frame))" stroke="none" />
      <circle cx="48" cy="110" r="2" fill="rgb(var(--c-frame))" stroke="none" />
    </svg>
  );
  return (
    <>
      <div className="absolute left-0 top-0">{corner}</div>
      <div className="absolute right-0 top-0 -scale-x-100">{corner}</div>
      <div className="absolute bottom-0 left-0 -scale-y-100">{corner}</div>
      <div className="absolute bottom-0 right-0 -scale-100">{corner}</div>
    </>
  );
};

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
      className="absolute inset-y-24 right-8 w-3 opacity-50"
      style={{ background: 'repeating-linear-gradient(180deg, rgb(var(--c-frame)) 0 1px, transparent 1px 12px)' }}
    />
    <div
      className="absolute inset-0 opacity-[0.04]"
      style={{ background: 'repeating-linear-gradient(0deg, rgb(var(--c-frame-bright)) 0 1px, transparent 1px 4px)' }}
    />
  </>
);

/** Darkness pressing in from the edges, a cold red at the bottom. */
const DarkFantasyFrame: React.FC = () => (
  <>
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
          style={{ opacity: id === setting ? 1 : 0 }}
        >
          <Frame />
        </SettingScope>
      );
    })}
  </div>
);
