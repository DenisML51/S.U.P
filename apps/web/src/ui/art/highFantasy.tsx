import React from 'react';
import GiLaurelCrown from '~icons/game-icons/laurel-crown';
import type { SettingArt } from './types';

/**
 * High fantasy ornament: an astronomer's atlas bound as an illuminated book. Gilt double rules
 * whose corners open into curling vines and almond leaves, the eight-pointed star of Elvish
 * heraldry, astrolabe rings and a field of stars behind everything.
 *
 * Corner pieces are drawn ON the frame they decorate: their straight strokes coincide with the
 * frame's rules and the flourish grows inwards, so frame and ornament read as one.
 */

/** Almond leaf with a midrib, 9 units long, its base at the origin pointing along +x. */
const Leaf: React.FC<{ x: number; y: number; angle: number; scale?: number }> = ({ x, y, angle, scale = 1 }) => (
  <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`}>
    <path d="M0 0C2.5-2.4 6.5-2.4 9 0 6.5 2.4 2.5 2.4 0 0Z" fill="currentColor" />
    <path d="M0.8 0H8" stroke="rgb(var(--c-bg-deep))" strokeWidth="0.35" opacity="0.55" />
  </g>
);

/** Star polygon with `points` rays, as drawn in Elvish heraldry. */
export const starPath = (cx: number, cy: number, outer: number, inner: number, points = 8): string => {
  const step = Math.PI / points;
  return (
    Array.from({ length: points * 2 }, (_, i) => {
      const radius = i % 2 === 0 ? outer : inner;
      const angle = i * step - Math.PI / 2;
      return `${i === 0 ? 'M' : 'L'}${(cx + radius * Math.cos(angle)).toFixed(2)} ${(cy + radius * Math.sin(angle)).toFixed(2)}`;
    }).join('') + 'Z'
  );
};

/**
 * Panel corner, 32×32. The panel's 1px border runs along x = 0.5 and y = 0.5 of this box; the
 * corner thickens it near the corner, echoes the inner rule and sends a curl with a leaf inwards.
 */
const VineCorner: React.FC = () => (
  <>
    <path d="M0.75 22V0.75H22" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path d="M4.5 13V4.5H13" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.8" />
    <path d="M4.5 4.5C8.5 8.5 12 9.6 14.6 8.6 16.8 7.7 16.4 5 14.4 4.8 12.8 4.7 12.3 6.4 13.4 7.1" fill="none" stroke="currentColor" strokeWidth="0.8" />
    <path d="M4.5 4.5C8.5 8.5 9.6 12 8.6 14.6 7.7 16.8 5 16.4 4.8 14.4 4.7 12.8 6.4 12.3 7.1 13.4" fill="none" stroke="currentColor" strokeWidth="0.8" />
    <Leaf x={14.5} y={10.5} angle={30} scale={0.6} />
    <Leaf x={10.5} y={14.5} angle={60} scale={0.6} />
    <path d={starPath(0.75, 0.75, 3.6, 1.4)} fill="currentColor" />
  </>
);

/**
 * Medallion on the top edge of a major panel, 120×24, the edge running along y = 12: an
 * eight-pointed star in a gilt ring, tendrils running out along the edge and ending in leaves.
 */
const StarCrest: React.FC = () => (
  <>
    <path d="M47 12C40 12 37 7.5 31 7.8 26.5 8 25.5 12.6 29 13.4 31.6 14 32.8 11.4 31.4 10.2" fill="none" stroke="currentColor" strokeWidth="0.9" />
    <path d="M73 12C80 12 83 7.5 89 7.8 93.5 8 94.5 12.6 91 13.4 88.4 14 87.2 11.4 88.6 10.2" fill="none" stroke="currentColor" strokeWidth="0.9" />
    <path d="M47 12C42 14.5 36 16.5 24 15.5M73 12C78 14.5 84 16.5 96 15.5" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.7" />
    <Leaf x={24} y={15.5} angle={185} scale={0.85} />
    <Leaf x={96} y={15.5} angle={-5} scale={0.85} />
    <circle cx="60" cy="12" r="10.5" fill="rgb(var(--c-surface))" stroke="currentColor" strokeWidth="1" />
    <circle cx="60" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.6" />
    <path d={starPath(60, 12, 6.6, 2.5)} fill="currentColor" />
    <circle cx="60" cy="12" r="1.2" fill="rgb(var(--c-surface))" />
  </>
);

/** Divider mark: an eight-pointed star between two tendrils ending in leaves. */
const StarRule: React.FC = () => (
  <svg width="86" height="14" viewBox="0 0 86 14" aria-hidden>
    <path d="M6 7C14 7 20 4.5 26 7 30 8.6 33 7 35.5 7M80 7C72 7 66 4.5 60 7 56 8.6 53 7 50.5 7" fill="none" stroke="currentColor" strokeWidth="0.8" />
    <Leaf x={6} y={7} angle={180} scale={0.7} />
    <Leaf x={80} y={7} angle={0} scale={0.7} />
    <path d={starPath(43, 7, 6, 2.4)} fill="currentColor" />
    <circle cx="43" cy="7" r="1.1" fill="rgb(var(--c-bg-deep))" />
  </svg>
);

/** Distance of the screen-corner flourishes from the window edge, in px. */
const FRAME_OUTER = 18;
const FRAME_GAP = 5;

/**
 * Screen-corner flourish, 130×130: two short rules meeting at a star, a vine spiralling inwards
 * and tendrils along each rule that fade out rather than end abruptly.
 */
export const VineFrameCorner: React.FC = () => {
  const g = FRAME_GAP + 0.5;
  return (
    <svg width="130" height="130" viewBox="0 0 130 130" fill="none" aria-hidden>
      <defs>
        <linearGradient id="hf-fade-x" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0.4" stopColor="currentColor" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hf-fade-y" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0.4" stopColor="currentColor" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0.5 0.5H130" stroke="url(#hf-fade-x)" strokeWidth="1" />
      <path d="M0.5 0.5V130" stroke="url(#hf-fade-y)" strokeWidth="1" />
      <path d={`M${g} ${g}H110`} stroke="url(#hf-fade-x)" strokeWidth="0.6" opacity="0.6" />
      <path d={`M${g} ${g}V110`} stroke="url(#hf-fade-y)" strokeWidth="0.6" opacity="0.6" />

      {/* Main stem: from the joint, diagonally in, ending in a spiral. */}
      <path d="M6 6C16 14 24 20 30 30 34 37 42 42 50 40 57 38 57 29 50 28 45 27.5 43 32 46.5 34" stroke="currentColor" strokeWidth="1" />
      {/* Tendrils along each rule, curling at their ends. */}
      <path d="M8 6C24 7 36 11 46 18 52 22 58 20 58 15 58 10.5 53 10 52 13.5" stroke="currentColor" strokeWidth="0.8" />
      <path d="M6 8C7 24 11 36 18 46 22 52 20 58 15 58 10.5 58 10 53 13.5 52" stroke="currentColor" strokeWidth="0.8" />
      <path d="M58 15C70 13.5 82 10 96 9.5M15 58C13.5 70 10 82 9.5 96" stroke="currentColor" strokeWidth="0.7" opacity="0.8" />

      <Leaf x={22} y={9.5} angle={-20} scale={1.2} />
      <Leaf x={34} y={15} angle={30} scale={1.1} />
      <Leaf x={9.5} y={22} angle={110} scale={1.2} />
      <Leaf x={15} y={34} angle={60} scale={1.1} />
      <Leaf x={36} y={33} angle={-70} scale={1} />
      <Leaf x={33} y={36} angle={160} scale={1} />
      <Leaf x={96} y={9.5} angle={-8} scale={1} />
      <Leaf x={9.5} y={96} angle={98} scale={1} />

      <path d={starPath(3, 3, 7, 2.8)} fill="currentColor" />
      <circle cx="3" cy="3" r="1.4" fill="rgb(var(--c-bg-deep))" />
    </svg>
  );
};

/** Ticks of a graduated ring: a short one every `step` degrees, a long one every `major`. */
const ringTicks = (r: number, step: number, major: number, short: number, long: number) =>
  Array.from({ length: 360 / step }, (_, i) => {
    const angle = (i * step * Math.PI) / 180;
    const length = (i * step) % major === 0 ? long : short;
    const [c, s] = [Math.cos(angle), Math.sin(angle)];
    return `M${(r * c).toFixed(1)} ${(r * s).toFixed(1)}L${((r - length) * c).toFixed(1)} ${((r - length) * s).toFixed(1)}`;
  }).join('');

/** Twelve house glyphs of the zodiac ring are stars here: an atlas, not a horoscope. */
const RING_STARS = Array.from({ length: 12 }, (_, i) => {
  const angle = ((i * 30 + 15) * Math.PI) / 180;
  return starPath(Math.cos(angle) * 318, Math.sin(angle) * 318, 7, 2.6);
}).join('');

/**
 * An astrolabe, 760 units across, centred on the origin: graduated rings, the tilted ecliptic,
 * the rete's pointers. Shown large and half off-screen, it is the atlas the sheet is written in.
 */
const Astrolabe: React.FC = () => (
  <svg viewBox="-380 -380 760 760" fill="none" stroke="currentColor" aria-hidden className="h-full w-full">
    <circle r="372" strokeWidth="1" />
    <circle r="360" strokeWidth="0.6" />
    <path d={ringTicks(360, 2, 10, 6, 16)} strokeWidth="0.7" />
    <circle r="336" strokeWidth="0.6" />
    <path d={RING_STARS} fill="currentColor" stroke="none" />
    <circle r="300" strokeWidth="0.8" />
    <path d={ringTicks(300, 5, 30, 5, 12)} strokeWidth="0.6" />
    <circle r="220" strokeWidth="0.5" strokeDasharray="2 6" />
    <ellipse cx="40" cy="-30" rx="250" ry="200" transform="rotate(-23)" strokeWidth="0.7" />
    <circle r="140" strokeWidth="0.6" />
    <path d="M-372 0H372M0-372V372" strokeWidth="0.4" opacity="0.7" />
    <path d="M0 0L250-170M0 0L-120 290" strokeWidth="1.1" />
    <circle cx="250" cy="-170" r="4" fill="currentColor" stroke="none" />
    <circle r="10" strokeWidth="1" />
    <path d={starPath(0, 0, 9, 3.5)} fill="currentColor" stroke="none" />
  </svg>
);

/** A faint field of stars, as on an atlas of the sky. Three scattered layers, so it never tiles. */
const STARS =
  'radial-gradient(circle at 20% 30%, rgb(var(--c-frame-bright) / 0.7) 0 1px, transparent 1.5px) 0 0 / 173px 197px,' +
  'radial-gradient(circle at 70% 60%, rgb(var(--c-ink) / 0.45) 0 0.8px, transparent 1.3px) 0 0 / 89px 113px,' +
  'radial-gradient(circle at 40% 80%, rgb(var(--c-frame-bright) / 0.5) 0 1.4px, transparent 2px) 0 0 / 311px 277px';

/** Night sky over teal, the atlas's astrolabe turning slowly at the right edge, vines in the corners. */
const Backdrop: React.FC<{ frame?: boolean }> = ({ frame = true }) => (
  <div className="absolute inset-0 text-frame">
    <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 30% 0%, rgb(var(--c-surface-2) / 0.5), transparent 60%)' }} />
    <div className="absolute inset-0 opacity-60" style={{ background: STARS }} />
    <div className="ui-astrolabe absolute right-[-22vh] top-1/2 aspect-square h-[115vh] -translate-y-1/2 opacity-[0.16]">
      <Astrolabe />
    </div>
    {frame &&
      (['left-0 top-0', 'right-0 top-0 -scale-x-100', 'bottom-0 left-0 -scale-y-100', 'bottom-0 right-0 -scale-100'] as const).map(
      (position) => (
        <div key={position} className={`absolute ${position}`} style={{ margin: FRAME_OUTER }}>
          <VineFrameCorner />
        </div>
      ),
    )}
  </div>
);

/** Width and height of the level-up overlay; the bar runs along its middle. */
const READY_W = 272;
const READY_H = 36;

/** A stem winding along the bar: a sine of the given phase, as a smooth path. */
const vinePath = (phase: number): string => {
  const mid = READY_H / 2;
  const points = Array.from({ length: 69 }, (_, i) => {
    const x = 4 + i * 3.9;
    return [x, mid + Math.sin(x / 9 + phase) * 7 * Math.min(1, x / 40, (READY_W - x) / 40)] as const;
  });
  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');
};

/** Leaves on the crests of the two stems, each opening in turn as the vine grows past it. */
const VINE_LEAVES = Array.from({ length: 9 }, (_, i) => {
  const x = 22 + i * 28.3;
  const up = i % 2 === 0;
  return { x, y: READY_H / 2 + (up ? -7 : 7), angle: up ? -40 : 40, delay: 0.25 + (x / READY_W) * 1.5 };
});

/** Motes of light rising off the vine. */
const MOTES = [18, 54, 83, 121, 150, 187, 214, 248].map((x, i) => ({ x, delay: (i * 0.37) % 2.4 }));

/**
 * The level is ready: two golden vines grow along the experience bar and wind round it, leaves
 * open on them one after another, a glint of magic runs along the stems and motes of light drift up.
 */
const LevelReady: React.FC = () => (
  <svg viewBox={`0 0 ${READY_W} ${READY_H}`} preserveAspectRatio="none" fill="none" aria-hidden className="hf-ready">
    <defs>
      <linearGradient id="hf-vine-gold" x1="0" x2="1">
        <stop offset="0" stopColor="rgb(var(--c-frame))" />
        <stop offset="0.5" stopColor="rgb(var(--c-frame-bright))" />
        <stop offset="1" stopColor="rgb(var(--c-frame))" />
      </linearGradient>
    </defs>
    {[0, Math.PI].map((phase) => (
      <g key={phase}>
        <path className="hf-vine" d={vinePath(phase)} pathLength={100} stroke="url(#hf-vine-gold)" strokeWidth="1.3" />
        <path className="hf-vine-glint" d={vinePath(phase)} pathLength={100} strokeWidth="2.4" />
      </g>
    ))}
    {VINE_LEAVES.map(({ x, y, angle, delay }) => (
      <g key={x} transform={`translate(${x} ${y}) rotate(${angle})`}>
        <path
          className="hf-leaf"
          style={{ animationDelay: `${delay}s` }}
          d="M0 0C2.2-2.2 5.8-2.2 8 0 5.8 2.2 2.2 2.2 0 0Z"
          fill="rgb(var(--c-frame-bright))"
        />
      </g>
    ))}
    {MOTES.map(({ x, delay }) => (
      <circle key={x} className="hf-mote" style={{ animationDelay: `${delay}s` }} cx={x} cy={READY_H / 2} r="1.2" fill="rgb(255 236 180)" />
    ))}
  </svg>
);

export const HIGH_FANTASY_ART: SettingArt = {
  corner: { viewBox: '0 0 32 32', art: <VineCorner /> },
  crest: { viewBox: '0 0 120 24', art: <StarCrest /> },
  ruleMark: <StarRule />,
  // Four-pointed star of illuminated ledgers.
  bullet: (filled) => (
    <path d="M7 0.8 8.4 5.6 13.2 7 8.4 8.4 7 13.2 5.6 8.4 0.8 7 5.6 5.6Z" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="0.9" strokeLinejoin="round" />
  ),
  // A crowned laurel wreath: the glory of the old tales.
  Emblem: GiLaurelCrown,
  Backdrop,
  LevelReady,
};
