import React from 'react';
import type { SettingArt } from './types';

/**
 * Sci-fi ornament: a ship's tactical terminal. Panes carry no decoration — structure comes from
 * hairlines, index numbers and codes — so the art is a divider, a chevron bullet, the emblem and
 * the screen's instrument frame.
 */

/** Graduated scale along a screen edge, `count` ticks with a longer one every fifth. */
const Scale: React.FC<{ count: number; className: string; vertical?: boolean }> = ({ count, className, vertical }) => (
  <svg
    className={className}
    width={vertical ? 14 : count * 8}
    height={vertical ? count * 8 : 14}
    viewBox={vertical ? `0 0 14 ${count * 8}` : `0 0 ${count * 8} 14`}
    aria-hidden
  >
    {Array.from({ length: count }, (_, i) => {
      const length = i % 5 === 0 ? 12 : 5;
      const at = i * 8 + 0.5;
      return vertical ? (
        <path key={i} d={`M0 ${at}H${length}`} stroke="currentColor" strokeWidth="1" />
      ) : (
        <path key={i} d={`M${at} 0V${length}`} stroke="currentColor" strokeWidth="1" />
      );
    })}
  </svg>
);

/** A field of fine dots, densest in one corner and fading out: the halftone of a printed display. */
const HALFTONE =
  'radial-gradient(circle, rgb(var(--c-frame-bright) / 0.55) 0 1px, transparent 1.4px) 0 0 / 14px 14px';

/** Instrument frame: corner ticks and edge scales over a dot grid, a halftone in the far corner. */
const Backdrop: React.FC = () => (
  <div className="absolute inset-0 text-frame">
    <div className="absolute inset-0 opacity-[0.18]" style={{ background: 'radial-gradient(circle, rgb(var(--c-frame)) 0 0.8px, transparent 1.2px) 0 0 / 28px 28px' }} />
    <div
      className="absolute bottom-0 right-0 h-[42vh] w-[42vw] opacity-50"
      style={{ background: HALFTONE, maskImage: 'radial-gradient(100% 100% at 100% 100%, #000, transparent 70%)' }}
    />
    <Scale count={40} className="absolute left-1/2 top-3 -translate-x-1/2 opacity-60" />
    <Scale count={30} vertical className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60" />
    <div className="absolute left-5 top-5 h-3 w-3 border-l border-t border-frame-bright/70" />
    <div className="absolute right-5 top-5 h-3 w-3 border-r border-t border-frame-bright/70" />
    <div className="absolute bottom-5 left-5 h-3 w-3 border-b border-l border-frame-bright/70" />
    <div className="absolute bottom-5 right-5 h-3 w-3 border-b border-r border-frame-bright/70" />
  </div>
);

export const SCI_FI_ART: SettingArt = {
  ruleMark: (
    <svg width="34" height="6" viewBox="0 0 34 6" aria-hidden>
      <path d="M0 3h6M10 3h14M28 3h6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  // Interface chevron.
  bullet: (filled) => (
    <path d="M3 2.5 9.5 7 3 11.5 5.5 7Z" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="0.9" strokeLinejoin="round" />
  ),
  // A hexagonal node with an inner ring.
  emblem: (
    <>
      <path d="M16 3 27.3 9.5V22.5L16 29 4.7 22.5V9.5Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="16" cy="16" r="5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="16" cy="16" r="1.6" fill="currentColor" />
    </>
  ),
  Backdrop,
};
