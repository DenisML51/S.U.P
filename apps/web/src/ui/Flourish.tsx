import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Setting } from '@itd/schema';

/** How long the longest flourish runs, in ms; the overlay is removed after it. */
const DURATION = 1400;

/**
 * A setting's flourish over the whole screen, played once when its world is chosen: a gilt ring
 * spreading from the card, a scan sweeping down, darkness closing in, the picture tearing, lightning.
 * Each setting draws its own in CSS (`.ui-flourish--<setting>`) from the same few layers; it starts
 * at the point given (the card's centre), takes no clicks and is gone in about a second.
 */
export const Flourish: React.FC<{ setting: Setting; x: number; y: number; onEnd: () => void }> = ({ setting, x, y, onEnd }) => {
  useEffect(() => {
    const timer = window.setTimeout(onEnd, DURATION);
    return () => window.clearTimeout(timer);
  }, [onEnd]);
  return createPortal(
    <div
      className={`ui-flourish ui-flourish--${setting}`}
      style={{ '--fx-x': `${x}px`, '--fx-y': `${y}px` } as React.CSSProperties}
      aria-hidden
    >
      <i />
      <i />
      <i />
    </div>,
    document.body,
  );
};
