import React from 'react';
import GiLaurels from '~icons/game-icons/laurels';
import type { SettingArt } from './types';

/**
 * Elden Ring ornament: the Lands Between under the Golden Order. Thin gilt hairlines, sprigs of the
 * Erdtree at the corners, the sigil of the Ring (a vertical axis through interlocking circles)
 * wreathed in its boughs over major panels; behind the screen a warm dark, motes of gold rising and
 * a leaf drifting down now and then.
 */

/** A repeatable pseudo-random sequence, so the seal and the motes are the same on every render. */
const random = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

const f = (n: number) => n.toFixed(1);

/**
 * Gilt in relief: lit from the upper left, its edge worn a little. Drawn with the backdrop and the
 * corners, so it is on whatever screen uses them; identical copies are harmless.
 */
const Filters: React.FC = () => (
  <defs>
    <filter id="er-gilt" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="2" seed="5" result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.6" xChannelSelector="R" yChannelSelector="G" result="worn" />
      <feGaussianBlur in="worn" stdDeviation="0.4" result="soft" />
      <feSpecularLighting in="soft" surfaceScale="2" specularConstant="1.2" specularExponent="18" lightingColor="#fff2c8" result="spec">
        <feDistantLight azimuth="235" elevation="50" />
      </feSpecularLighting>
      <feComposite in="spec" in2="worn" operator="in" result="gloss" />
      <feComposite in="worn" in2="gloss" operator="arithmetic" k2="0.85" k3="0.8" />
    </filter>
  </defs>
);

/* ------------------------------------------------------------------ Leaves of the Erdtree */

/** A leaf of the Erdtree at a point, pointing along `angle`, `size` long: two curves meeting at its tip. */
const leaf = (x: number, y: number, angle: number, size: number) => {
  const tx = x + Math.cos(angle) * size;
  const ty = y + Math.sin(angle) * size;
  const nx = -Math.sin(angle) * size * 0.36;
  const ny = Math.cos(angle) * size * 0.36;
  const mx = (x + tx) / 2;
  const my = (y + ty) / 2;
  return `M${f(x)} ${f(y)}Q${f(mx + nx)} ${f(my + ny)} ${f(tx)} ${f(ty)}Q${f(mx - nx)} ${f(my - ny)} ${f(x)} ${f(y)}Z`;
};

/**
 * Panel corner, 24×24: a hairline along each edge, and from the corner a sprig of the Erdtree — a
 * twig along each edge and one curling in between, small leaves on them.
 */
const SprigCorner: React.FC = () => (
  <>
    <Filters />
    <path d="M0.75 22V0.75H22" fill="none" stroke="currentColor" strokeWidth="1" />
    <path
      d="M1.6 1.6C6 2.6 9 5.4 12.4 4.8S18.2 2.8 21.6 4M1.6 1.6C2.6 6 5.4 9 4.8 12.4S2.8 18.2 4 21.6M1.6 1.6C4.8 4.6 7.2 6.8 8.8 9.2c.6 1.1-.2 2-1.2 1.4"
      fill="none"
      stroke="currentColor"
      strokeWidth="0.75"
      strokeLinecap="round"
    />
    <path d={leaf(12.4, 4.8, -0.5, 4.4) + leaf(4.8, 12.4, 2.07, 4.4) + leaf(17.4, 3.4, 0.5, 3.4) + leaf(3.4, 17.4, 1.07, 3.4) + leaf(6.2, 5.4, 0.15, 3.2) + leaf(5.4, 6.2, 1.42, 3.2)} fill="currentColor" />
  </>
);

/**
 * The sigil of the Ring, `r` across its great circle: a vertical axis through a great circle, a
 * smaller circle hung at its crown, two arcs crossing below like the lower halves of two more
 * circles, and a bar across. Drawn about the origin.
 */
const RingSigil: React.FC<{ r: number; strokeWidth?: number }> = ({ r, strokeWidth = 1 }) => (
  <g fill="none" stroke="currentColor" strokeWidth={strokeWidth}>
    <path d={`M0 ${f(-r * 1.32)}V${f(r * 1.32)}`} />
    <circle r={r} />
    <circle cy={f(-r * 0.52)} r={f(r * 0.48)} />
    <path d={`M${f(-r * 0.98)} ${f(r * 0.2)}A${f(r * 0.86)} ${f(r * 0.86)} 0 0 0 ${f(r * 0.62)} ${f(r * 0.78)}`} />
    <path d={`M${f(r * 0.98)} ${f(r * 0.2)}A${f(r * 0.86)} ${f(r * 0.86)} 0 0 1 ${f(-r * 0.62)} ${f(r * 0.78)}`} />
    <path d={`M${f(-r * 0.62)} ${f(r * 0.08)}H${f(r * 0.62)}`} />
  </g>
);

/** One side of the crest's garland: a bough laid along the edge, its twigs curling up, leaves on them. */
const GARLAND = {
  wood: 'M49.5 15.6C43.5 18.6 36 19.6 28 18.8S12 16.4 2.5 18.6M40.6 18.6C39.2 15.6 36.8 14.2 33.6 14.4M27 18.7C25.2 15.8 22.2 15 19 15.8M14.6 17.2C13.2 15 11.2 14.2 8.6 14.6',
  leaves:
    leaf(33.6, 14.4, -2.7, 4.6) + leaf(19, 15.8, -2.8, 4.4) + leaf(8.6, 14.6, -2.9, 3.6) + leaf(44.6, 17.6, 2.3, 3.8) + leaf(35.4, 19.4, 2.6, 3.6) + leaf(23, 18.4, 2.75, 3.4) + leaf(10.4, 17, 2.9, 3),
};

/**
 * The sigil standing on the top edge of a major panel, 120×24, the edge along y = 20, wreathed: a
 * bough of the Erdtree runs out from it along the edge each way, twigs curling up, leaves on them.
 */
const SigilCrest: React.FC = () => (
  <>
    {[0, 1].map((side) => (
      <g key={side} transform={side ? 'matrix(-1 0 0 1 120 0)' : undefined}>
        <path d={GARLAND.wood} fill="none" stroke="currentColor" strokeWidth="0.85" strokeLinecap="round" />
        <path d={GARLAND.leaves} fill="currentColor" />
      </g>
    ))}
    <circle cx="60" cy="13" r="10.5" fill="rgb(var(--c-surface))" />
    <g transform="translate(60 13)">
      <RingSigil r={8.4} strokeWidth={0.9} />
    </g>
  </>
);

/** A sprig either side of a divider's sigil, leaves along it, running out thin. */
const SPRIG = {
  wood: 'M43 9.4C37 10.8 29 11 19 9.8S7 8.6 1 9.4',
  leaves: leaf(35, 10.5, -2.55, 4.4) + leaf(28, 10.8, 2.65, 4) + leaf(20.5, 10, -2.7, 3.6) + leaf(13, 9.3, 2.8, 3.2) + leaf(6.5, 8.9, -2.9, 2.6),
};

/** A divider: a sprig of the Erdtree running out each way from the sigil small between them. */
const SigilRule: React.FC = () => (
  <svg width="100" height="20" viewBox="0 0 100 20" aria-hidden>
    {[0, 1].map((side) => (
      <g key={side} transform={side ? 'matrix(-1 0 0 1 100 0)' : undefined}>
        <path d={SPRIG.wood} fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
        <path d={SPRIG.leaves} fill="currentColor" />
      </g>
    ))}
    <g transform="translate(50 10)">
      <RingSigil r={5.4} strokeWidth={0.8} />
    </g>
  </svg>
);

/** A sprig laid along the top edge of the screen corner, running out thin: leaves on both sides of it. */
const EDGE_SPRIG = {
  wood: 'M56 13C72 12.2 88 13.4 104 12.6S128 12.4 140 13',
  leaves: leaf(66, 12.6, -2.75, 7) + leaf(74, 12.8, 2.8, 6.6) + leaf(86, 12.9, -2.85, 6) + leaf(95, 12.8, 2.85, 5.4) + leaf(106, 12.6, -2.9, 4.6) + leaf(115, 12.5, 2.9, 4) + leaf(125, 12.6, -2.95, 3.2),
};

/**
 * Screen corner, 170×170: the gilt frame of the screen as the Order would set it — a heavy rule and
 * a hairline inside it, running along each edge and fading out; across the corner a bracket bowed
 * towards it with a lozenge in its lap; and laid along each edge from there a sprig of the Erdtree,
 * leaves on both sides, thinning as it runs out.
 */
const ScreenCorner: React.FC = () => (
  <svg width="170" height="170" viewBox="0 0 170 170" fill="none" aria-hidden>
    <defs>
      {/* In user space: a gradient sized to a straight line's own box would have no height and draw nothing. */}
      <linearGradient id="er-fade-x" gradientUnits="userSpaceOnUse" x1="0" x2="170" y1="0" y2="0">
        <stop offset="0.2" stopColor="currentColor" />
        <stop offset="1" stopColor="currentColor" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="er-fade-y" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="0" y2="170">
        <stop offset="0.2" stopColor="currentColor" />
        <stop offset="1" stopColor="currentColor" stopOpacity="0" />
      </linearGradient>
    </defs>
    <path d="M1 1H170" stroke="url(#er-fade-x)" strokeWidth="1.4" />
    <path d="M1 1V170" stroke="url(#er-fade-y)" strokeWidth="1.4" />
    <path d="M6 6H150" stroke="url(#er-fade-x)" strokeWidth="0.5" />
    <path d="M6 6V150" stroke="url(#er-fade-y)" strokeWidth="0.5" />
    {/* The bracket across the corner, bowed towards it, its ends turned in; the lozenge in its lap. */}
    <path d="M10 52C10 28 28 10 52 10" stroke="currentColor" strokeWidth="1" />
    <path d="M16 50C16 31 31 16 50 16" stroke="currentColor" strokeWidth="0.5" />
    <path d="M52 10c3 0 4 2.4 2.4 4M10 52c0 3 2.4 4 4 2.4" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
    <path d="M22 13.5 30.5 22 22 30.5 13.5 22Z" stroke="currentColor" strokeWidth="0.8" />
    <path d="M22 18.5 25.5 22 22 25.5 18.5 22Z" fill="currentColor" />
    <circle cx="1.5" cy="1.5" r="1.8" fill="currentColor" />
    {/* A sprig along each edge, the one down the side the mirror of the one along the top. */}
    {[undefined, 'matrix(0 1 1 0 0 0)'].map((transform) => (
      <g key={transform ?? 'top'} transform={transform}>
        <path d={EDGE_SPRIG.wood} stroke="url(#er-fade-x)" strokeWidth="0.8" strokeLinecap="round" />
        <path d={EDGE_SPRIG.leaves} fill="url(#er-fade-x)" />
      </g>
    ))}
  </svg>
);

interface RootSpec {
  /** Where it starts, on a 400×200 strip, and the way it sets off (radians, 0 = right, -π/2 = up). */
  x: number;
  y: number;
  angle: number;
  length: number;
  /** Half-width at the start. */
  width: number;
  /** How it winds: the size of its turns, and where in them it starts. */
  wind: number;
  phase: number;
  /** How hard the tip curls, and which way (sign). */
  curl: number;
}

/**
 * The roots of the Erdtree along the foot of the frame, on a 400×200 strip: thick as small trunks
 * where they come in from the sides and up from below, winding over and under one another along
 * the bottom, their tips curling.
 */
const ROOTS: RootSpec[] = [
  { x: -40, y: 168, angle: -0.04, length: 330, width: 15, wind: 0.32, phase: 0, curl: -1.9 },
  { x: 440, y: 176, angle: Math.PI + 0.04, length: 320, width: 14, wind: 0.34, phase: 2.4, curl: 2 },
  { x: -30, y: 196, angle: -0.12, length: 250, width: 11, wind: 0.4, phase: 4.6, curl: -2.4 },
  { x: 430, y: 200, angle: Math.PI + 0.14, length: 230, width: 10, wind: 0.42, phase: 1.1, curl: 2.3 },
  { x: 150, y: 222, angle: -0.6, length: 170, width: 10, wind: 0.5, phase: 3.3, curl: -2.6 },
  { x: 270, y: 224, angle: -2.6, length: 160, width: 9, wind: 0.5, phase: 5.8, curl: 2.6 },
];

/**
 * One root as a tapering shape: its spine winds this way and that in turns of two sizes, and curls
 * at the tip; the outline stands off the spine by the root's width, thinning to the tip. Along it
 * runs the grain of the bark, two lines inside the outline that run out before the tip.
 */
const root = ({ x, y, angle, length, width, wind, phase, curl }: RootSpec) => {
  const SAMPLES = 72;
  const step = length / SAMPLES;
  const spine: { x: number; y: number; nx: number; ny: number; w: number }[] = [];
  let px = x;
  let py = y;
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    const theta = angle + wind * Math.sin(phase + t * 6) * (1 - t * 0.4) + wind * 0.4 * Math.sin(phase * 2 + t * 14) + curl * t ** 3.4;
    spine.push({ x: px, y: py, nx: -Math.sin(theta), ny: Math.cos(theta), w: width * (1 - t) ** 0.75 + 0.6 });
    px += Math.cos(theta) * step;
    py += Math.sin(theta) * step;
  }
  const side = (k: number, from = 0, to = SAMPLES) =>
    spine.slice(from, to + 1).map((p) => `${f(p.x + p.nx * p.w * k)} ${f(p.y + p.ny * p.w * k)}`);
  const outline = `M${side(1).join('L')}L${side(-1).reverse().join('L')}Z`;
  const grain = `M${side(0.45, 0, 54).join('L')}M${side(-0.3, 4, 46).join('L')}M${side(0.05, 10, 30).join('L')}`;
  return { outline, grain };
};

const ROOT_PATHS = ROOTS.map(root);

/**
 * The roots of the Erdtree along the foot of the frame, as the kraken rises at Lovecraft's: small
 * trunks outlined in gold over the dark, winding over and under one another, the grain of the bark
 * along them.
 */
const Roots: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 400 200" fill="none" stroke="currentColor" strokeLinejoin="round" aria-hidden className={className}>
    {ROOT_PATHS.map(({ outline, grain }, i) => (
      <g key={i}>
        <path d={outline} fill="rgb(var(--c-bg-deep))" strokeWidth="1.2" />
        <path d={grain} strokeWidth="0.55" opacity="0.65" />
      </g>
    ))}
  </svg>
);

/**
 * Motes of gold rising through the dark at three depths: far ones many, fine and slow to cross the
 * screen; nearer ones fewer and larger; the nearest few big, soft and out of focus, drifting most.
 */
const MOTE_DEPTHS = [
  { depth: 'far', count: 10, size: [1, 1.6], time: [26, 40] },
  { depth: 'mid', count: 8, size: [1.8, 2.8], time: [18, 28] },
  { depth: 'near', count: 3, size: [5, 9], time: [14, 22] },
] as const;

const MOTES = (() => {
  const next = random(617);
  return MOTE_DEPTHS.flatMap(({ depth, count, size, time }) =>
    Array.from({ length: count }, () => ({
      depth,
      left: `${(next() * 100).toFixed(1)}%`,
      size: size[0] + next() * (size[1] - size[0]),
      duration: `${(time[0] + next() * (time[1] - time[0])).toFixed(1)}s`,
      delay: `${(-next() * time[1]).toFixed(1)}s`,
      // Which way it drifts as it rises; how far is the depth's (fixed in the keyframes, so the
      // compositor can run them).
      side: next() < 0.5 ? 'l' : 'r',
    })),
  );
})();

/** Leaves of the Erdtree drifting down, each on its own time, drift and tumble. */
const LEAVES = (() => {
  const next = random(2203);
  return Array.from({ length: 6 }, () => ({
    left: `${(4 + next() * 92).toFixed(1)}%`,
    size: 4 + Math.round(next() * 3),
    duration: `${(22 + next() * 18).toFixed(1)}s`,
    delay: `${(-next() * 40).toFixed(1)}s`,
    // How far aside it drifts as it falls: a little or a long way.
    reach: next() < 0.5 ? 'short' : 'long',
    spin: `${(4 + next() * 3.5).toFixed(1)}s`,
  }));
})();

/** A single falling leaf: a smooth blade with a midrib, lit gold. */
const Leaf: React.FC = () => (
  <svg viewBox="-6 -9 12 18" className="er-leaf-svg" aria-hidden>
    <path className="er-leaf-blade" d="M0 -8.4C3.5 -5.2 4 2.8 0 8.4C-4 2.8 -3.5 -5.2 0 -8.4Z" />
    <path className="er-leaf-vein" d="M0 -7.2V7.2" />
  </svg>
);

/**
 * Behind the interface: a near-black dark, and light falling into it from high at the right in
 * slow shafts, as the Erdtree's light falls through its crown; a faint haze drifting; motes of gold rising at three depths and leaves of the tree
 * drifting down through it; darkness at the edges and the screen set in a gilt frame at its corners.
 */
const Backdrop: React.FC<{ frame?: boolean }> = ({ frame = true }) => (
  <div className="absolute inset-0 overflow-hidden text-frame">
    <svg width="0" height="0" className="absolute" aria-hidden>
      <defs>
        <linearGradient id="er-leaf-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgb(255 234 170)" />
          <stop offset="1" stopColor="rgb(202 148 70)" />
        </linearGradient>
      </defs>
    </svg>
    <svg width="0" height="0" className="absolute" aria-hidden>
      <Filters />
    </svg>
    <div className="er-depth absolute inset-0" />
    <div className="er-haze absolute inset-[-20%]" />
    <Roots className="er-roots absolute inset-x-0 bottom-0 w-full" />
    <div className="er-shafts absolute inset-0">
      <i />
      <i />
    </div>
    {/* One animation to a mote, on fixed keyframes: rising and drifting its own way. */}
    {MOTES.map(({ depth, left, size, duration, delay, side }) => (
      <i
        key={left + delay}
        className={`er-mote er-mote--${depth} er-mote--${side}`}
        style={{ left, width: size, height: size, animationDuration: duration, animationDelay: delay }}
      />
    ))}
    {LEAVES.map(({ left, size, duration, delay, reach, spin }) => (
      <span key={left + delay} className={`er-leaf-fall er-leaf-fall--${reach}`} style={{ animationDuration: duration, animationDelay: delay }}>
        <span className="er-leaf" style={{ left, width: size * 1.3, height: size * 1.9, animationDuration: spin, animationDelay: delay }}>
          <Leaf />
        </span>
      </span>
    ))}
    <div className="er-vignette absolute inset-0" />
    <div className="er-grain absolute inset-[-10%]" />
    {frame &&
      (['left-0 top-0', 'right-0 top-0 -scale-x-100', 'bottom-0 left-0 -scale-y-100', 'bottom-0 right-0 -scale-100'] as const).map((position) => (
        <div key={position} className={`er-screen-corner absolute m-4 ${position}`}>
          <ScreenCorner />
        </div>
      ))}
  </div>
);

/** Runes rising off the bar when a level can be taken: where along it, and when. */
const READY_RUNES = (() => {
  const next = random(808);
  return Array.from({ length: 16 }, (_, i) => ({
    left: `${(3 + (i / 15) * 94 + (next() - 0.5) * 4).toFixed(1)}%`,
    delay: `${(-next() * 2.8).toFixed(2)}s`,
    duration: `${(2.2 + next() * 1.2).toFixed(2)}s`,
  }));
})();

/**
 * The level is ready, as runes are held enough to rest at grace and grow: liquid gold runs slowly
 * along the whole bar, the bar breathes a warm light, runes rise off it all along and fade, and at
 * its end a lozenge of gold pulses. Laid out in the bar's own width, so it reads on any bar.
 */
const LevelReady: React.FC = () => (
  <span className="er-ready" aria-hidden>
    <span className="er-ready__bar">
      <i className="er-ready__sheen" />
    </span>
    {READY_RUNES.map(({ left, delay, duration }) => (
      <i key={left} className="er-ready__rune" style={{ left, animationDelay: delay, animationDuration: duration }} />
    ))}
    <i className="er-ready__key" />
  </span>
);

/** An arch pointed at the top: two arcs of `radius` struck from the far springers, on jambs down to `foot`. */
const pointedArch = (half: number, spring: number, foot: number, radius: number) => {
  const apex = spring - Math.sqrt(radius ** 2 - (radius - half) ** 2);
  return `M${-half} ${foot}V${spring}A${radius} ${radius} 0 0 1 0 ${f(apex)}A${radius} ${radius} 0 0 1 ${half} ${spring}V${foot}`;
};

/** A sprig climbing a jamb of the arch, leaves on both sides, thinning as it rises. */
const JAMB_SPRIG = {
  wood: 'M-80 66C-79 44-81 22-80 0S-79 -24-80 -34',
  leaves: Array.from({ length: 6 }, (_, i) => {
    const y = 58 - i * 17;
    const side = i % 2 ? 1 : -1;
    return leaf(-80, y, -Math.PI / 2 + side * 0.55, 9 - i * 0.8);
  }).join(''),
};

/** The fog of a boss's gate: pale swirls, thick and thin by turns, on a tile that repeats seamlessly. */
const GATE_FOG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='320'%3E%3Cfilter id='f' x='0' y='0' width='100%25' height='100%25'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.011 0.016' numOctaves='3' seed='4' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 0.97 0 0 0 0 0.9 0 0 0 2.6 -1'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23f)'/%3E%3C/svg%3E";

/** The doorway of the world card's arch, as a mask the size of the arch's box. */
const DOOR_MASK = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='-100 -150 200 230' preserveAspectRatio='none'><path fill='white' d='${pointedArch(64, -36, 66, 96)}Z'/></svg>`,
)}")`;

/**
 * Round the world card's emblem, a gilt arch pointed as the doors of the royal capital are: a double
 * hairline on its jambs and arch, a lozenge for its keystone, a sprig of the Erdtree climbing each
 * jamb, a step under it; and inside, rising from its foot, the light of a grace. When the world is
 * chosen, the doorway fills with the wall of fog that stands before a boss.
 */
const WorldSigil: React.FC = () => (
  <>
    {/* The fog is laid over the doorway as page layers, not drawn in the arch, so it rises on the compositor. */}
    <span className="er-arch__fog" style={{ maskImage: DOOR_MASK, WebkitMaskImage: DOOR_MASK, ['--fog' as string]: `url("${GATE_FOG}")` }}>
      <i />
      <i />
    </span>
    <WorldArch />
  </>
);

const WorldArch: React.FC = () => (
  <svg viewBox="-100 -150 200 230" fill="none" aria-hidden className="er-arch">
    <defs>
      <radialGradient id="er-arch-grace" cx="0" cy="66" r="110" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 66) scale(1 1.3) translate(0 -66)">
        <stop offset="0" stopColor="rgb(255 226 160)" stopOpacity="0.55" />
        <stop offset="0.4" stopColor="rgb(255 200 110)" stopOpacity="0.16" />
        <stop offset="1" stopColor="rgb(255 200 110)" stopOpacity="0" />
      </radialGradient>
    </defs>
    <path d={`${pointedArch(64, -36, 66, 96)}Z`} fill="url(#er-arch-grace)" className="er-arch__grace" />
    <g stroke="currentColor" className="er-arch__lines">
      <path d={pointedArch(70, -36, 66, 104)} strokeWidth="1.3" />
      <path d={pointedArch(64, -36, 66, 96)} strokeWidth="0.5" />
      <path d="M-90 66H90M-84 72H84" strokeWidth="0.8" />
      {[-1, 1].map((side) => (
        <g key={side} transform={side > 0 ? 'scale(-1 1)' : undefined}>
          <path d={JAMB_SPRIG.wood} strokeWidth="0.7" strokeLinecap="round" />
          <path d={JAMB_SPRIG.leaves} fill="currentColor" stroke="none" />
          <path d="M-70 -36H-58" strokeWidth="0.7" />
        </g>
      ))}
    </g>
    <g transform={`translate(0 ${f(-36 - Math.sqrt(104 ** 2 - 34 ** 2))})`} className="er-arch__key">
      <path d="M0 -9 7 0 0 9 -7 0Z" fill="rgb(var(--c-bg))" stroke="currentColor" strokeWidth="0.9" />
      <path d="M0 -4 3 0 0 4 -3 0Z" fill="currentColor" />
      <path d="M0 -9V-20" stroke="currentColor" strokeWidth="0.7" />
    </g>
  </svg>
);

/**
 * The world is chosen as a region is entered: a burst of gold light at the card, a ring of it
 * spreading, and across the middle of the screen the name of the land in gilt capitals between
 * hairlines.
 */
const Flourish: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <>
    <div className="er-burst" style={{ left: x, top: y }} />
    <div className="er-banner">
      <span className="er-banner__name">Междуземье</span>
    </div>
  </>
);

/**
 * The focused hero card is lit as one resting at grace: gold light wells up under it, and over it a
 * caption names them as the Lands Between do — Tarnished, with their level.
 */
const HeroReadout: NonNullable<SettingArt['HeroReadout']> = ({ level, age }) => (
  <div className="er-readout" aria-hidden>
    <span className="er-readout__title">Погасший</span>
    <span className="er-readout__level">{age !== undefined ? `${age} лет` : `Уровень ${level}`}</span>
  </div>
);

/** Rivets of gold set round the seal's rim. */
const MEDALLION_STUDS = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
  return { x: 30 + Math.cos(a) * 26.8, y: 34 + Math.sin(a) * 26.8 };
});

/**
 * The level as a seal of the Golden Order: a coin of gold, its face dark and sunk behind a bevel,
 * the sigil of the Elden Ring struck faint upon it, rivets round the rim and the rank in Roman
 * numerals of light at the centre.
 */
const StatusLevel: NonNullable<SettingArt['StatusLevel']> = ({ level }) => (
  <span className="er-medallion">
    <svg className="ui-level__art" viewBox="0 0 60 70" aria-hidden>
      <circle className="er-medallion__rim" cx="30" cy="34" r="29" />
      <circle className="er-medallion__bezel" cx="30" cy="34" r="25.3" />
      <circle className="er-medallion__face" cx="30" cy="34" r="24.3" />
      <g transform="translate(30 34)" className="er-medallion__sigil">
        <RingSigil r={15} strokeWidth={0.7} />
      </g>
      {MEDALLION_STUDS.map(({ x, y }, i) => (
        <circle key={i} className="er-medallion__stud" cx={f(x)} cy={f(y)} r="1" />
      ))}
    </svg>
    <span className="er-medallion__level ui-numeric">{level}</span>
  </span>
);

export const ELDEN_RING_ART: SettingArt = {
  corner: { viewBox: '0 0 24 24', art: <SprigCorner /> },
  crest: { viewBox: '0 0 120 24', art: <SigilCrest /> },
  ruleMark: <SigilRule />,
  // A leaf of the Erdtree, its midrib showing when the entry is active.
  bullet: (filled) => (
    <>
      <path d="M7 1.2C10.6 3.8 10.8 9.4 7 12.8 3.2 9.4 3.4 3.8 7 1.2Z" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="0.9" strokeLinejoin="round" />
      {filled && <path d="M7 3.4V11.6" stroke="rgb(var(--c-bg-deep))" strokeWidth="0.6" opacity="0.6" />}
    </>
  ),
  // The laurel wreath of a victor of the Order.
  Emblem: GiLaurels,
  Backdrop,
  LevelReady,
  WorldSigil,
  Flourish,
  HeroReadout,
  StatusLevel,
};
