import React from 'react';
import GiRingedPlanet from '~icons/game-icons/ringed-planet';
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
const VIEW_W = 1600;
const VIEW_H = 1000;
/** The planet below: its centre far under the bottom edge, so only its limb shows. */
const PLANET = { x: 800, y: 1900, r: 1150 };
/** Parallels on the planet's face: flattened ellipses across the visible cap, nearer ones wider. */
const PARALLELS = Array.from({ length: 6 }, (_, i) => {
  const y = PLANET.y - PLANET.r + 40 + i * i * 14 + i * 26;
  const rx = Math.sqrt(PLANET.r ** 2 - (PLANET.y - y) ** 2);
  return { y, rx, ry: rx * 0.09 };
});

/** A sparse field of stars, the same every time. */
const STARS = (() => {
  let seed = 4242;
  const next = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: 46 }, () => ({ x: next() * VIEW_W, y: next() * 700, r: next() < 0.15 ? 1.4 : 0.8 }));
})();

/**
 * The view from orbit, in hairline: the limb of a planet across the bottom with its thin rim of
 * atmosphere and faint parallels and meridians, the night side darker, under a sparse field of stars.
 */
const OrbitView: React.FC = () => (
  <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMid slice" fill="none" stroke="currentColor" aria-hidden className="h-full w-full">
    <defs>
      <linearGradient id="sf-planet-shade" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="rgb(var(--c-surface-2))" />
        <stop offset="0.55" stopColor="rgb(var(--c-surface))" />
        <stop offset="1" stopColor="rgb(var(--c-bg-deep))" />
      </linearGradient>
      <clipPath id="sf-planet-clip">
        <circle cx={PLANET.x} cy={PLANET.y} r={PLANET.r} />
      </clipPath>
    </defs>
    {STARS.map(({ x, y, r }, i) => (
      <circle key={i} cx={x.toFixed(0)} cy={y.toFixed(0)} r={r} fill="currentColor" stroke="none" opacity="0.6" />
    ))}
    {/* The planet: shaded from day to night, parallels on its face, the rim of atmosphere. */}
    <circle cx={PLANET.x} cy={PLANET.y} r={PLANET.r} fill="url(#sf-planet-shade)" stroke="none" />
    <g clipPath="url(#sf-planet-clip)" strokeWidth="0.6" opacity="0.55">
      {PARALLELS.map(({ y, rx, ry }) => (
        <ellipse key={y} cx={PLANET.x} cy={y + ry} rx={rx} ry={ry} />
      ))}
      {[-0.5, -0.25, 0, 0.25, 0.5].map((k) => (
        <ellipse key={k} cx={PLANET.x} cy={PLANET.y} rx={Math.abs(PLANET.r * k * 1.6) + 1} ry={PLANET.r} />
      ))}
    </g>
    <circle cx={PLANET.x} cy={PLANET.y} r={PLANET.r} strokeWidth="1.2" />
    <circle cx={PLANET.x} cy={PLANET.y} r={PLANET.r + 7} stroke="rgb(var(--c-accent))" strokeWidth="1.6" opacity="0.7" />
    <circle cx={PLANET.x} cy={PLANET.y} r={PLANET.r + 18} stroke="rgb(var(--c-accent))" strokeWidth="0.6" opacity="0.3" />
  </svg>
);

const Backdrop: React.FC = () => (
  <div className="absolute inset-0 text-frame">
    <div className="absolute inset-0 opacity-[0.18]" style={{ background: 'radial-gradient(circle, rgb(var(--c-frame)) 0 0.8px, transparent 1.2px) 0 0 / 28px 28px' }} />
    <div className="sf-orbit absolute inset-0">
      <OrbitView />
    </div>
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

const READY_W = 272;
const READY_H = 36;

/** Short arcs that crackle off the bar, each at its own place and moment. */
const ARCS = [
  { x: 38, up: true, delay: 0.2 },
  { x: 96, up: false, delay: 1.1 },
  { x: 141, up: true, delay: 0.7 },
  { x: 199, up: false, delay: 1.6 },
  { x: 236, up: true, delay: 0.4 },
];

/**
 * The level is ready: the bar is charged. A train of chevrons runs along it, the readout's corners
 * lock on, and short arcs crackle off the bar now and then.
 */
const LevelReady: React.FC = () => {
  const mid = READY_H / 2;
  return (
    <svg viewBox={`0 0 ${READY_W} ${READY_H}`} preserveAspectRatio="none" fill="none" aria-hidden className="sf-ready">
      <defs>
        <clipPath id="sf-ready-bar">
          <rect x="6" y={mid - 4} width={READY_W - 12} height="8" />
        </clipPath>
      </defs>
      <g clipPath="url(#sf-ready-bar)">
        <g className="sf-chevrons">
          {Array.from({ length: 40 }, (_, i) => (
            <path key={i} d={`M${i * 14 - 280} ${mid - 3}l4 3-4 3`} stroke="rgb(var(--c-ink))" strokeWidth="1.6" />
          ))}
        </g>
      </g>
      <path className="sf-lock" d={`M2 ${mid - 9}V${mid - 13}H8M${READY_W - 8} ${mid - 13}H${READY_W - 2}V${mid - 9}M2 ${mid + 9}V${mid + 13}H8M${READY_W - 8} ${mid + 13}H${READY_W - 2}V${mid + 9}`} stroke="rgb(var(--c-accent))" strokeWidth="1.5" />
      {ARCS.map(({ x, up, delay }) => {
        const dir = up ? -1 : 1;
        const y0 = mid + dir * 4;
        return (
          <polyline
            key={x}
            className="sf-arc"
            style={{ animationDelay: `${delay}s` }}
            points={`${x},${y0} ${x + 3},${y0 + dir * 4} ${x - 1},${y0 + dir * 7} ${x + 4},${y0 + dir * 11}`}
            stroke="rgb(var(--c-frame-bright))"
            strokeWidth="1.2"
          />
        );
      })}
    </svg>
  );
};

/** A file code for a hero, four hex digits of the id's hash. */
const fileCode = (id: string) => {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return (hash & 0xffff).toString(16).toUpperCase().padStart(4, '0');
};

/**
 * The personnel file's tab over the focused hero card: a solid blue plate with the file code and a
 * cut corner, the level as a readout at the far end, a short graduated scale down the right edge.
 */
const HeroReadout: NonNullable<SettingArt['HeroReadout']> = ({ id, level }) => (
  <div className="sf-file" aria-hidden>
    <span className="sf-file__tab">ДОСЬЕ · {fileCode(id)}</span>
    <span className="sf-file__level">УР {String(level).padStart(2, '0')}</span>
    <span className="sf-file__scale" />
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
  // A ringed world, the far frontier.
  Emblem: GiRingedPlanet,
  Backdrop,
  LevelReady,
  HeroReadout,
};
