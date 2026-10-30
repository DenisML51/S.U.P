import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { Setting } from '@itd/schema';
import { SETTING_ART } from './art';

/** How long a flourish runs, in ms, unless its setting says otherwise; the overlay is removed after it. */
const DURATION = 1600;

/** Loose particles every flourish gets; a setting styles them (sparks, embers, broken blocks) or hides them. */
const PARTICLES = 28;

/**
 * A setting's flourish over the whole screen, played once when its world is chosen. Each setting
 * draws its own in CSS (`.ui-flourish--<setting>`) from the same layers — the overlay's ::before and
 * ::after, three spans, a cloud of particles scattered at random — and may add a picture of its own
 * (`SettingArt.Flourish`). It starts at the point given (the card's centre), takes no clicks and is
 * gone in about a second.
 */
export const Flourish: React.FC<{ setting: Setting; x: number; y: number; onEnd: () => void }> = ({ setting, x, y, onEnd }) => {
  const { Flourish: Art, flourishMs = DURATION } = SETTING_ART[setting];
  useEffect(() => {
    const timer = window.setTimeout(onEnd, flourishMs);
    return () => window.clearTimeout(timer);
  }, [onEnd, flourishMs]);
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLES }, () => ({
        '--dx': (Math.random() * 2 - 1).toFixed(3),
        '--dy': Math.random().toFixed(3),
        '--delay': Math.random().toFixed(3),
        '--size': Math.random().toFixed(3),
      })),
    [],
  );
  return createPortal(
    <div
      className={`ui-flourish ui-flourish--${setting}`}
      style={{ '--fx-x': `${x}px`, '--fx-y': `${y}px` } as React.CSSProperties}
      aria-hidden
    >
      <i />
      <i />
      <i />
      {particles.map((style, index) => (
        <b key={index} className="ui-flourish__p" style={style as React.CSSProperties} />
      ))}
      {Art && <Art x={x} y={y} />}
    </div>,
    document.body,
  );
};
