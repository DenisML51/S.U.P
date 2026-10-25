import React from 'react';
import GiLaurels from '~icons/game-icons/laurels';
import type { SettingArt } from './types';

/**
 * Elden Ring ornament: the Lands Between under the Golden Order. Thin gilt hairlines, sprigs of the
 * Erdtree at the corners, the sigil of the Ring (a vertical axis through interlocking circles)
 * wreathed in its boughs over major panels; behind the screen the map of the Lands Between engraved
 * in gold — coast and lake, woods and marshes, cliffs, mountains and a volcano, castles and the walled
 * capital, roads and sites of grace — the fog of the unexplored drifting over it, a leaf drifting down now and then.
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

type Point = [number, number];

/** A line through points, smoothed: each point becomes the control of a curve between its neighbours' midpoints. */
const smooth = (points: Point[], closed = false) => {
  if (closed) {
    const mid = (i: number): Point => {
      const [x, y] = points[i % points.length];
      const [nx, ny] = points[(i + 1) % points.length];
      return [(x + nx) / 2, (y + ny) / 2];
    };
    let d = `M${f(mid(0)[0])} ${f(mid(0)[1])}`;
    for (let i = 1; i <= points.length; i++) {
      const [x, y] = points[i % points.length];
      const [mx, my] = mid(i);
      d += `Q${f(x)} ${f(y)} ${f(mx)} ${f(my)}`;
    }
    return `${d}Z`;
  }
  let d = `M${f(points[0][0])} ${f(points[0][1])}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i];
    const [nx, ny] = points[i + 1];
    d += `Q${f(x)} ${f(y)} ${f((x + nx) / 2)} ${f((y + ny) / 2)}`;
  }
  const [lx, ly] = points[points.length - 1];
  return `${d}L${f(lx)} ${f(ly)}`;
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

/**
 * Screen corner, 120×120: the border of the map — a heavy rule and a hairline inside it, fading out
 * along each edge, and in the corner a small leaf drawn in outline with its midrib.
 */
const ScreenCorner: React.FC = () => (
  <svg width="120" height="120" viewBox="0 0 120 120" fill="none" aria-hidden>
    <defs>
      <linearGradient id="er-fade-x" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0.25" stopColor="currentColor" />
        <stop offset="1" stopColor="currentColor" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="er-fade-y" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0.25" stopColor="currentColor" />
        <stop offset="1" stopColor="currentColor" stopOpacity="0" />
      </linearGradient>
    </defs>
    <path d="M1 1H120" stroke="url(#er-fade-x)" strokeWidth="1.2" />
    <path d="M1 1V120" stroke="url(#er-fade-y)" strokeWidth="1.2" />
    <path d="M6 6H96" stroke="url(#er-fade-x)" strokeWidth="0.5" />
    <path d="M6 6V96" stroke="url(#er-fade-y)" strokeWidth="0.5" />
    <path d={leaf(11, 11, Math.PI / 4, 22)} stroke="currentColor" strokeWidth="0.7" />
    <path d="M11 11 26.5 26.5" stroke="currentColor" strokeWidth="0.5" />
    <circle cx="1.5" cy="1.5" r="1.5" fill="currentColor" />
  </svg>
);

/* ------------------------------------------------------------------ The map of the Lands Between */

const MAP_W = 1600;
const MAP_H = 1000;

/**
 * A rough outline made a coastline: every edge is split again and again, its middle pushed aside by
 * chance in proportion to its length, so the line frays into bays and headlands at every scale.
 */
const fray = (outline: Point[], seed: number, rounds = 5, rough = 0.32) => {
  const next = random(seed);
  let points = outline;
  for (let round = 0; round < rounds; round++) {
    const split: Point[] = [];
    points.forEach(([x, y], i) => {
      const [nx, ny] = points[(i + 1) % points.length];
      const length = Math.hypot(nx - x, ny - y);
      const push = (next() - 0.5) * length * rough;
      split.push([x, y], [(x + nx) / 2 + (-(ny - y) / length) * push, (y + ny) / 2 + ((nx - x) / length) * push]);
    });
    points = split;
  }
  return smooth(points, true);
};

/** The land: the coast of the mainland with the Weeping Peninsula hanging from it, the sea to the west. */
const LAND = fray(
  [
    [560, -400], [540, -40], [510, 60], [440, 130], [480, 220], [410, 300], [440, 390], [370, 470], [430, 550], [530, 610], [570, 690],
    [530, 770], [580, 850], [650, 880], [690, 1000], [720, 1400], [820, 1400], [860, 1000], [880, 900], [950, 860], [1010, 940], [1040, 1400],
    [2400, 1400], [2400, -400],
  ],
  2024,
);

/** The lake of Liurnia in the north of the land. */
const LAKE = fray(
  [[600, 190], [700, 150], [810, 180], [850, 260], [800, 330], [690, 350], [610, 310]],
  311,
  4,
  0.28,
);

/** The cliffs of the plateau round the capital, as a line along their brink. */
const CLIFFS: Point[] = Array.from({ length: 60 }, (_, i) => {
  const t = i / 59;
  const a = Math.PI * (0.95 - t * 1.05);
  return [1250 + Math.cos(a) * 330 + Math.sin(t * 19) * 6, 300 + Math.sin(a) * 210 + Math.cos(t * 23) * 5];
});

/** Hachures down the cliffs: short strokes falling away from the brink, longer and shorter in turn. */
const HACHURES = CLIFFS.slice(0, -1)
  .flatMap(([x, y], i) => {
    const [nx, ny] = CLIFFS[i + 1];
    const length = Math.hypot(nx - x, ny - y);
    const [ox, oy] = [(ny - y) / length, -(nx - x) / length];
    return [0, 0.33, 0.66].map((t, j) => {
      const px = x + (nx - x) * t;
      const py = y + (ny - y) * t;
      const reach = 10 + ((i * 3 + j) % 3) * 5;
      return `M${f(px)} ${f(py)}l${f(-ox * reach)} ${f(-oy * reach)}`;
    });
  })
  .join('');

/** Woods of Limgrave: clumps of small trees, a crown on a stem each, as map-makers mark them. */
const WOODS = (() => {
  const next = random(88);
  let d = '';
  // Clumps of trees, each a scatter round its own centre.
  const clumps: Point[] = [[640, 600], [760, 590], [700, 700], [800, 740], [620, 760]];
  for (const [cx, cy] of clumps) {
    for (let i = 0; i < 16; i++) {
      const a = next() * Math.PI * 2;
      const reach = Math.sqrt(next()) * 42;
      const x = cx + Math.cos(a) * reach * 1.4;
      const y = cy + Math.sin(a) * reach;
      const r = 1.8 + next() * 1.4;
      d += `M${f(x - r)} ${f(y)}a${f(r)} ${f(r)} 0 1 1 ${f(2 * r)} 0M${f(x)} ${f(y)}v${f(r * 0.9)}`;
    }
  }
  return d;
})();

/** The dragon peaks of Caelid: a peak drawn for each, its far side hatched in shadow. */
const PEAKS = (() => {
  const next = random(530);
  let d = '';
  for (let i = 0; i < 9; i++) {
    const x = 1360 + (i % 3) * 52 + next() * 22;
    const y = 560 + Math.floor(i / 3) * 40 + next() * 12;
    const h = 22 + next() * 16;
    const w = 18 + next() * 8;
    d += `M${f(x - w)} ${f(y)}L${f(x)} ${f(y - h)}L${f(x + w)} ${f(y)}`;
    // Shadow on the far face: strokes from its edge down towards the foot of the ridge line.
    for (let k = 1; k <= 3; k++) {
      const t = k / 4;
      d += `M${f(x + w * t)} ${f(y - h * (1 - t))}L${f(x + w * t * 0.45)} ${f(Math.min(y, y - h * (1 - t) + h * t * 0.55))}`;
    }
  }
  return d;
})();

/** The sea marked as old charts mark it: a few short strokes of swell, scattered. */
const SWELL = (() => {
  const next = random(902);
  let d = '';
  for (let i = 0; i < 22; i++) {
    const x = 40 + next() * 300;
    const y = 220 + next() * 720;
    d += `M${f(x)} ${f(y)}q6 -4 12 0t12 0`;
  }
  return d;
})();

/** Roads between the sites of grace, from the peninsula north to the capital and east to Caelid. */
const ROADS =
  'M760 990C750 940 770 900 740 860S700 780 690 720 650 640 640 580 600 470 640 420 760 400 860 420 1000 430 1110 380' +
  'M690 720C760 700 860 690 960 700S1160 730 1300 760';

/** Sites of grace along the roads. */
const GRACES: Point[] = [[752, 930], [690, 720], [645, 560], [860, 420], [1110, 380], [960, 700], [1300, 760]];

/** The river that drains the lake westwards to the sea, winding. */
const RIVER = 'M606 292C584 300 566 322 548 334S512 344 498 362 470 388 444 398';

/** The capital's walls as a map draws a great city: two rings of wall, towers on the outer, a dome in the middle. */
const CAPITAL = (() => {
  const wall = (r: number, seed: number) => fray(Array.from({ length: 10 }, (_, i): Point => [Math.cos((i / 10) * Math.PI * 2) * r, Math.sin((i / 10) * Math.PI * 2) * r * 0.7]), seed, 3, 0.12);
  const towers = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    const [x, y] = [Math.cos(a) * 48, Math.sin(a) * 48 * 0.7];
    return `M${f(x - 2.5)} ${f(y + 3)}V${f(y - 3)}H${f(x + 2.5)}V${f(y + 3)}`;
  }).join('');
  const dome = 'M-12 0A12 12 0 0 1 12 0ZM0 -12V-24M-3 -20H3M-18 0H18';
  return { walls: wall(48, 61) + wall(30, 62), towers, dome };
})();

/** A castle on the coast of Limgrave: a crenellated wall between two towers with pointed roofs, a gate in it. */
const CASTLE = 'M-16 0V-12h4v-4h4v4h4v-4h4v4h4v-4h4v4h4V0' + 'M-24 0V-24l4 -8 4 8V0M16 0V-28l4 -9 4 9V0' + 'M-3 0v-6a3 3 0 0 1 6 0v6M-28 0H28';

/** The academy on its island in the lake: the island's shore, a tower with a spire and a ring about it. */
const ACADEMY = {
  island: fray(Array.from({ length: 7 }, (_, i): Point => [Math.cos((i / 7) * Math.PI * 2) * 20, Math.sin((i / 7) * Math.PI * 2) * 12]), 73, 3, 0.2),
  tower: 'M-4 2V-18l4 -10 4 10V2M-8 -10H8M-4 -4H4',
};

/** A volcano with smoke rising from its crater, its far slope hatched. */
const VOLCANO =
  'M-40 0L-12 -40H12L40 0M-12 -40A12 3.5 0 0 0 12 -40' +
  'M2 -44C-6 -54 8 -60 0 -72S8 -88 -2 -100M-6 -44C-14 -52 -6 -60 -14 -68' +
  'M18 -28 10 -6M26 -18 20 -2M14 -36 4 -16';

/** The mountaintops of the giants: tall peaks, snow lying down to a ragged line on each. */
const SNOW_PEAKS = (() => {
  const next = random(1201);
  let d = '';
  for (let i = 0; i < 7; i++) {
    const x = 1300 + i * 38 + next() * 18;
    const y = 190 + (i % 2) * 30 + next() * 10;
    const h = 52 + next() * 26;
    const w = 26 + next() * 10;
    d += `M${f(x - w)} ${f(y)}L${f(x)} ${f(y - h)}L${f(x + w)} ${f(y)}`;
    // The snow line, a zig-zag across the peak a third of the way down.
    const sy = y - h * 0.62;
    const sw = w * 0.38;
    d += `M${f(x - sw)} ${f(sy)}l${f(sw * 0.4)} 5l${f(sw * 0.35)} -4l${f(sw * 0.45)} 6l${f(sw * 0.4)} -5l${f(sw * 0.4)} 4`;
  }
  return d;
})();

/** The scarlet rot's marshes in Caelid: tufts of reed over a line of standing water, scattered. */
const MARSH = (() => {
  const next = random(4004);
  let d = '';
  for (let i = 0; i < 26; i++) {
    const x = 1150 + next() * 300;
    const y = 830 + next() * 110;
    d += `M${f(x)} ${f(y)}h14M${f(x + 3)} ${f(y)}v-5M${f(x + 7)} ${f(y)}v-8M${f(x + 11)} ${f(y)}v-5`;
  }
  return d;
})();

/** The names of the lands and places, as the map sets them: spaced capitals, the lesser smaller. */
const NAMES: { x: number; y: number; size: number; text: string }[] = [
  { x: 720, y: 650, size: 22, text: 'Лимгрейв' },
  { x: 700, y: 262, size: 15, text: 'Озеро Лиурния' },
  { x: 770, y: 925, size: 12, text: 'Полуостров Плача' },
  { x: 1460, y: 768, size: 22, text: 'Каэлид' },
  { x: 1300, y: 805, size: 11, text: 'Топи алой гнили' },
  { x: 1110, y: 285, size: 16, text: 'Плато Альтус' },
  { x: 1250, y: 395, size: 13, text: 'Лейнделл, Королевская столица' },
  { x: 940, y: 225, size: 11, text: 'Гора Гельмир' },
  { x: 1420, y: 262, size: 13, text: 'Вершины Великанов' },
  { x: 530, y: 545, size: 11, text: 'Грозовая Завеса' },
  { x: 1440, y: 680, size: 11, text: 'Драконьи пики' },
];

/**
 * The map of the Lands Between as the Tarnished carry it, engraved in gold on the dark: the coast
 * with the sea lined along it and its swell marked as old charts do; the lake of Liurnia with the
 * academy on its island and the river out of it; a castle on the coast of Limgrave among its woods;
 * the plateau's cliffs hatched, a smoking volcano, the snowy mountaintops of the giants; the walled
 * capital; mountains and the rot's marshes in Caelid; roads in dashes, the sites of grace, the names
 * of the lands — and the marker of where you stand.
 */
const LandsMap: React.FC<{ names?: boolean }> = ({ names = true }) => (
  <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} preserveAspectRatio="xMidYMid slice" fill="none" stroke="currentColor" strokeLinecap="round" aria-hidden className="h-full w-full">
    <defs>
      <clipPath id="er-map-lake">
        <path d={LAKE} />
      </clipPath>
    </defs>
    {/* The sea lined along the coast: each pair of strokes, the dark one inside the gold, leaves two fine lines. */}
    {[54, 36, 20].map((w) => (
      <g key={w}>
        <path d={LAND} strokeWidth={w + 1} opacity={0.5} />
        <path d={LAND} strokeWidth={w} stroke="rgb(var(--c-bg))" />
      </g>
    ))}
    <path d={SWELL} strokeWidth="0.6" opacity="0.6" />
    <path d={LAND} fill="rgb(var(--c-bg))" stroke="none" />
    <path d={LAND} strokeWidth="1.3" />
    <g clipPath="url(#er-map-lake)">
      {[40, 24, 10].map((w) => (
        <g key={w}>
          <path d={LAKE} strokeWidth={w + 1} opacity={0.5} />
          <path d={LAKE} strokeWidth={w} stroke="rgb(var(--c-bg))" />
        </g>
      ))}
    </g>
    <path d={LAKE} strokeWidth="1" />
    <path d={RIVER} strokeWidth="4.2" />
    <path d={RIVER} strokeWidth="2.8" stroke="rgb(var(--c-bg))" />
    <g transform="translate(790 205)">
      <path d={ACADEMY.island} fill="rgb(var(--c-bg))" strokeWidth="0.9" />
      <path d={ACADEMY.tower} strokeWidth="0.9" />
    </g>
    <path d={smooth(CLIFFS)} strokeWidth="1.1" />
    <path d={HACHURES} strokeWidth="0.6" opacity="0.8" />
    <path d={WOODS} strokeWidth="0.6" opacity="0.75" />
    <path d={PEAKS} strokeWidth="0.8" opacity="0.85" />
    <path d={SNOW_PEAKS} strokeWidth="0.9" opacity="0.9" />
    <path d={MARSH} strokeWidth="0.6" opacity="0.75" />
    <g transform="translate(940 205)">
      <path d={VOLCANO} strokeWidth="0.9" />
    </g>
    <g transform="translate(520 520)">
      <path d={CASTLE} strokeWidth="0.9" />
    </g>
    <g transform="translate(1250 330)">
      <path d={CAPITAL.walls} strokeWidth="0.9" />
      <path d={CAPITAL.towers} strokeWidth="0.8" />
      <path d={CAPITAL.dome} strokeWidth="0.9" />
    </g>
    <path d={ROADS} strokeWidth="0.9" strokeDasharray="6 7" opacity="0.85" />
    {GRACES.map(([x, y], i) => (
      <g key={i} transform={`translate(${x} ${y})`} className="er-map__grace" style={{ animationDelay: `${-i * 1.3}s` }}>
        <circle r="2.4" fill="currentColor" stroke="none" />
        <path d={Array.from({ length: 8 }, (_, k) => {
          const a = (k / 8) * Math.PI * 2;
          const outer = k % 2 ? 7 : 10;
          return `M${f(Math.cos(a) * 4.5)} ${f(Math.sin(a) * 4.5)}L${f(Math.cos(a) * outer)} ${f(Math.sin(a) * outer)}`;
        }).join('')} strokeWidth="0.8" />
      </g>
    ))}
    <g transform="translate(700 800)" className="er-map__you">
      <circle r="14" strokeWidth="0.8" className="er-map__you-ring" />
      <path d="M0 -8 6 7 0 3 -6 7Z" fill="currentColor" stroke="none" />
    </g>
    {names &&
      NAMES.map(({ x, y, size, text }) => (
        <text
          key={text}
          x={x}
          y={y}
          textAnchor="middle"
          fontSize={size}
          className="er-map__name"
          fill="currentColor"
          stroke="none"
        >
          {text}
        </text>
      ))}
    {names && (
      <g className="er-map__name" fill="currentColor" stroke="none" textAnchor="middle">
        <text x="200" y="150" fontSize="30">
          Междуземье
        </text>
        <path d="M80 168H320M110 176H290" stroke="currentColor" strokeWidth="0.6" fill="none" />
      </g>
    )}
  </svg>
);

/** Motes of gold rising through the dark, each on its own drift and time. */
const MOTES = (() => {
  const next = random(617);
  return Array.from({ length: 8 }, () => ({
    left: `${(next() * 100).toFixed(1)}%`,
    size: 1 + Math.round(next() * 1.5),
    duration: `${(16 + next() * 16).toFixed(1)}s`,
    delay: `${(-next() * 32).toFixed(1)}s`,
    drift: `${Math.round((next() - 0.5) * 90)}px`,
  }));
})();

/** Leaves of the Erdtree drifting down, each on its own time, drift and tumble. */
const LEAVES = (() => {
  const next = random(2203);
  return Array.from({ length: 13 }, () => ({
    left: `${(4 + next() * 92).toFixed(1)}%`,
    size: 4 + Math.round(next() * 3),
    duration: `${(20 + next() * 18).toFixed(1)}s`,
    delay: `${(-next() * 40).toFixed(1)}s`,
    drift: `${Math.round(-60 - next() * 150)}px`,
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
 * Behind the interface: a warm depth of grace, and the leaves of the Erdtree drifting down through
 * it, each tumbling in perspective as it falls.
 */
const Backdrop: React.FC<{ frame?: boolean }> = () => (
  <div className="absolute inset-0 overflow-hidden text-frame">
    <svg width="0" height="0" aria-hidden>
      <defs>
        <linearGradient id="er-leaf-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgb(255 234 170)" />
          <stop offset="1" stopColor="rgb(202 148 70)" />
        </linearGradient>
      </defs>
    </svg>
    <div className="er-sky absolute inset-0" />
    <div className="er-grace-soft absolute inset-0" />
    {LEAVES.map(({ left, size, duration, delay, drift, spin }) => (
      <span key={left + delay} className="er-leaf-fall" style={{ animationDuration: duration, animationDelay: delay, ['--drift' as string]: drift }}>
        <span className="er-leaf" style={{ left, width: size * 1.3, height: size * 1.9, animationDuration: spin, animationDelay: delay }}>
          <Leaf />
        </span>
      </span>
    ))}
    <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 240px 30px rgb(6 4 2 / 0.82)' }} />
    <div className="er-grain absolute inset-[-10%]" />
  </div>
);

const READY_W = 272;
const READY_H = 36;

/**
 * The level is ready, as at a site of grace: gold light runs along the bar, and above its middle a
 * grace kindles, its wisps curling up, motes rising from it.
 */
const LevelReady: React.FC = () => {
  const mid = READY_H / 2;
  return (
    <svg viewBox={`0 0 ${READY_W} ${READY_H}`} preserveAspectRatio="xMidYMid meet" fill="none" aria-hidden className="er-ready">
      <defs>
        <clipPath id="er-ready-bar">
          <rect x="6" y={mid - 3} width={READY_W - 12} height="6" />
        </clipPath>
        <linearGradient id="er-ready-light" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="rgb(var(--c-grace))" stopOpacity="0" />
          <stop offset="0.5" stopColor="rgb(255 246 214)" stopOpacity="0.95" />
          <stop offset="1" stopColor="rgb(var(--c-grace))" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="er-ready-flame">
          <stop offset="0" stopColor="rgb(255 248 220)" />
          <stop offset="0.4" stopColor="rgb(var(--c-grace))" stopOpacity="0.8" />
          <stop offset="1" stopColor="rgb(var(--c-grace))" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g clipPath="url(#er-ready-bar)">
        <rect className="er-ready__light" x="-90" y={mid - 3} width="90" height="6" fill="url(#er-ready-light)" />
      </g>
      <g transform={`translate(${READY_W / 2} ${mid - 5})`}>
        <ellipse className="er-ready__flame" rx="9" ry="7" fill="url(#er-ready-flame)" />
        <path className="er-ready__wisp" d="M0 0C-2 -4 2 -7 0 -11" stroke="rgb(var(--c-grace))" strokeWidth="0.7" strokeLinecap="round" />
        <path className="er-ready__wisp er-ready__wisp--late" d="M-2 0C-5 -3 -3 -6 -5 -10" stroke="rgb(var(--c-grace))" strokeWidth="0.6" strokeLinecap="round" />
        <path className="er-ready__wisp er-ready__wisp--later" d="M2 0C5 -3 3 -6 5 -9" stroke="rgb(var(--c-grace))" strokeWidth="0.6" strokeLinecap="round" />
      </g>
    </svg>
  );
};

/**
 * The sigil of the Ring round the world card's emblem, large and fine; looked at, its lines draw
 * themselves in gold one after another.
 */
const WorldSigil: React.FC = () => (
  <svg viewBox="-110 -140 220 280" fill="none" aria-hidden className="er-sigil">
    <g className="er-sigil__lines">
      <RingSigil r={96} strokeWidth={0.9} />
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
const HeroReadout: NonNullable<SettingArt['HeroReadout']> = ({ level }) => (
  <div className="er-readout" aria-hidden>
    <span className="er-readout__title">Погасший</span>
    <span className="er-readout__level">Уровень {level}</span>
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
