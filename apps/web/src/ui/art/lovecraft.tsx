import React from 'react';
import GiTentaclesSkull from '~icons/game-icons/tentacles-skull';
import type { SettingArt } from './types';

/**
 * Lovecraft ornament: New England in the 1920s, the night carriage to Arkham and the folios it
 * carries. Brass caps on the corners like an old folio's, Art Deco fans and stepped corners; behind
 * the screen a sea chart engraved in fine lines, its soundings closing on a point that should not
 * be there.
 */

/** A repeatable pseudo-random sequence, so the chart is drawn the same on every render. */
const random = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

/** A folio's brass corner cap, 24×24: a solid triangle with a bevelled edge and a rivet. */
const BrassCorner: React.FC = () => (
  <>
    <path d="M0 0H17L0 17Z" fill="currentColor" opacity="0.9" />
    <path d="M17 0 0 17" stroke="rgb(var(--c-bg-deep))" strokeWidth="0.8" opacity="0.6" />
    <path d="M14 1.5 1.5 14" stroke="rgb(255 240 200 / 0.35)" strokeWidth="0.7" />
    <circle cx="5" cy="5" r="1.4" fill="rgb(var(--c-bg-deep))" opacity="0.7" />
  </>
);

/** An Art Deco fan rising over the top edge of a major panel, 120×24, the edge along y = 20. */
const FanCrest: React.FC = () => (
  <>
    <path d="M6 20H40M80 20H114" stroke="currentColor" strokeWidth="1" />
    <path d="M10 17H38M82 17H110" stroke="currentColor" strokeWidth="0.6" opacity="0.6" />
    <path d="M40 20A20 20 0 0 1 80 20Z" fill="rgb(var(--c-surface))" stroke="currentColor" strokeWidth="1" />
    {Array.from({ length: 7 }, (_, i) => {
      const a = Math.PI * (1 - (i + 1) / 8);
      return <path key={i} d={`M60 20L${(60 + 18 * Math.cos(a)).toFixed(1)} ${(20 - 18 * Math.sin(a)).toFixed(1)}`} stroke="currentColor" strokeWidth="0.7" />;
    })}
    <path d="M52 20A8 8 0 0 1 68 20" stroke="currentColor" strokeWidth="0.8" />
    <circle cx="60" cy="20" r="2" fill="currentColor" />
  </>
);

/** A divider: a lozenge between tiered rules, as on a deco poster. */
const DecoRule: React.FC = () => (
  <svg width="64" height="12" viewBox="0 0 64 12" aria-hidden>
    <path d="M0 6H22M42 6H64" stroke="currentColor" strokeWidth="0.8" />
    <path d="M8 3H22M42 3H56M8 9H22M42 9H56" stroke="currentColor" strokeWidth="0.5" opacity="0.6" />
    <path d="M32 1 37 6 32 11 27 6Z" fill="none" stroke="currentColor" strokeWidth="0.9" />
    <path d="M32 4 34 6 32 8 30 6Z" fill="currentColor" />
  </svg>
);

const CHART_W = 1600;
const CHART_H = 1000;
/** Where the soundings close in: a seamount where no seamount is charted. */
const MARK = { x: 1210, y: 735 };

/**
 * An isobath round the mark: a closed line at roughly `r` from it, bent by a few slow waves of its
 * own so no two lines are alike, as on a surveyed chart.
 */
const isobath = (r: number, seed: number) => {
  const next = random(seed);
  const waves = [1, 2, 3, 5].map((k) => ({ k, amp: r * (0.02 + next() * 0.07) / Math.sqrt(k), phase: next() * Math.PI * 2 }));
  const points = Array.from({ length: 96 }, (_, i) => {
    const a = (i / 96) * Math.PI * 2;
    const radius = r + waves.reduce((sum, { k, amp, phase }) => sum + amp * Math.sin(k * a + phase), 0);
    return `${(MARK.x + Math.cos(a) * radius * 1.25).toFixed(1)} ${(MARK.y + Math.sin(a) * radius).toFixed(1)}`;
  });
  return `M${points.join('L')}Z`;
};

/** The isobaths, shallowing towards the mark; every fifth is a heavier, labelled one. */
const ISOBATHS = Array.from({ length: 22 }, (_, i) => ({ d: isobath(24 + i * i * 2.4 + i * 14, 300 + i), major: i % 5 === 0 }));

/** Depth soundings in fathoms, scattered over the sea, deeper away from the mark. */
const SOUNDINGS = (() => {
  const next = random(808);
  return Array.from({ length: 70 }, () => {
    const x = next() * CHART_W;
    const y = next() * CHART_H;
    const distance = Math.hypot((x - MARK.x) / 1.25, y - MARK.y);
    return { x, y, depth: Math.max(3, Math.round(distance / 4 + next() * 40)) };
  });
})();

/** A ship's course across the chart: legs between timed fixes, the last leg ending at the mark. */
const FIXES = [
  { x: 300, y: 120, time: '23.III · 18:40' },
  { x: 560, y: 210, time: '24.III · 02:15' },
  { x: 820, y: 380, time: '24.III · 09:50' },
  { x: 1020, y: 560, time: '24.III · 16:05' },
];
const COURSE = [...FIXES, MARK];

/** A compass rose of sixteen points engraved in line, the north marked with a lozenge. */
const CompassRose: React.FC<{ x: number; y: number; r: number }> = ({ x, y, r }) => (
  <g transform={`translate(${x} ${y})`} strokeWidth="0.8">
    <circle r={r} />
    <circle r={r * 0.92} strokeWidth="0.4" />
    <path d={Array.from({ length: 64 }, (_, i) => {
      const a = (i * Math.PI) / 32;
      const inner = i % 4 === 0 ? r * 0.84 : r * 0.88;
      return `M${(Math.sin(a) * r * 0.92).toFixed(1)} ${(-Math.cos(a) * r * 0.92).toFixed(1)}L${(Math.sin(a) * inner).toFixed(1)} ${(-Math.cos(a) * inner).toFixed(1)}`;
    }).join('')} strokeWidth="0.5" />
    {Array.from({ length: 16 }, (_, i) => {
      const a = (i * Math.PI) / 8;
      const length = i % 4 === 0 ? r * 0.8 : i % 2 === 0 ? r * 0.55 : r * 0.38;
      const half = i % 4 === 0 ? 0.11 : 0.16;
      const tip = `${(Math.sin(a) * length).toFixed(1)} ${(-Math.cos(a) * length).toFixed(1)}`;
      const left = `${(Math.sin(a - half) * length * 0.22).toFixed(1)} ${(-Math.cos(a - half) * length * 0.22).toFixed(1)}`;
      const right = `${(Math.sin(a + half) * length * 0.22).toFixed(1)} ${(-Math.cos(a + half) * length * 0.22).toFixed(1)}`;
      return <path key={i} d={`M0 0L${left}L${tip}L${right}Z`} strokeWidth={i % 4 === 0 ? 0.8 : 0.5} />;
    })}
    <path d={`M0 ${-r * 1.02}L${r * 0.05} ${-r * 1.12}L0 ${-r * 1.22}L${-r * 0.05} ${-r * 1.12}Z`} fill="currentColor" />
  </g>
);

/**
 * A surveyor's chart of a stretch of the South Pacific, engraved in fine lines: isobaths closing
 * in on a point where the soundings rise out of deep water, depths in fathoms, a compass rose, and
 * a ship's course whose last fix is the point itself — 47°9′ S, 126°43′ W.
 */
const Chart: React.FC = () => (
  <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="xMidYMid slice" fill="none" stroke="currentColor" aria-hidden className="h-full w-full">
    {/* A graticule, as on any chart. */}
    <path d={[200, 600, 1000, 1400].map((x) => `M${x} 0V${CHART_H}`).join('') + [250, 750].map((y) => `M0 ${y}H${CHART_W}`).join('')} strokeWidth="0.5" strokeDasharray="2 10" />
    <g className="lc-chart__isobaths">
      {ISOBATHS.map(({ d, major }, i) => (
        <path key={i} d={d} strokeWidth={major ? 0.9 : 0.45} opacity={major ? 1 : 0.8} />
      ))}
    </g>
    <g fill="currentColor" stroke="none" fontSize="11" className="lc-chart__soundings">
      {SOUNDINGS.map(({ x, y, depth }, i) => (
        <text key={i} x={x.toFixed(0)} y={y.toFixed(0)}>
          {depth}
        </text>
      ))}
    </g>
    <path d={`M${COURSE.map(({ x, y }) => `${x} ${y}`).join('L')}`} strokeWidth="0.9" strokeDasharray="10 6" />
    {FIXES.map(({ x, y, time }) => (
      <g key={time} transform={`translate(${x} ${y})`}>
        <circle r="4" strokeWidth="0.8" />
        <path d="M-7 0H7M0-7V7" strokeWidth="0.5" />
        <text x="10" y="-8" fill="currentColor" stroke="none" fontSize="12" className="lc-chart__note">
          {time}
        </text>
      </g>
    ))}
    <g transform={`translate(${MARK.x} ${MARK.y})`} className="lc-chart__mark">
      <circle r="9" strokeWidth="1" />
      <path d="M-14 -14 14 14M14 -14 -14 14" strokeWidth="1" />
      <text x="20" y="-14" fill="currentColor" stroke="none" fontSize="14" className="lc-chart__note">
        47°9′ S · 126°43′ W
      </text>
    </g>
    <CompassRose x={1170} y={230} r={110} />
  </svg>
);

interface TentacleSpec {
  /** Base, on a 400×400 box, and the direction it rises in (radians, 0 = right, -π/2 = up). */
  x: number;
  y: number;
  angle: number;
  length: number;
  width: number;
  /** How hard the tip coils, and which way (sign). */
  curl: number;
  phase: number;
}

/** Points along a tentacle's spine, its half-width at each and the unit normal. */
const SAMPLES = 64;

/**
 * The outline, suckers and hatching of one tentacle at time `t`, as path data. The spine bends more
 * towards the tip, so the tip coils into a spiral; the whole arm sways and the coil tightens and
 * loosens slowly. Hatching (the engraver's shade) runs across the upper side, suckers along the
 * lower side, shrinking towards the tip.
 */
const tentacle = ({ x, y, angle, length, width, curl, phase }: TentacleSpec, t: number) => {
  const step = length / SAMPLES;
  const breathe = 1 + 0.18 * Math.sin(t * 0.45 + phase);
  const spine: { x: number; y: number; nx: number; ny: number; w: number }[] = [];
  let px = x;
  let py = y;
  for (let i = 0; i <= SAMPLES; i++) {
    const s = i / SAMPLES;
    const theta = angle + curl * breathe * s ** 2.6 + 0.35 * Math.sin(t * 0.6 + phase + s * 2.4) * s;
    const w = width * (1 - s) ** 0.85 + 0.6;
    spine.push({ x: px, y: py, nx: -Math.sin(theta), ny: Math.cos(theta), w });
    px += Math.cos(theta) * step;
    py += Math.sin(theta) * step;
  }
  const side = Math.sign(curl) || 1;
  const left = spine.map((p) => `${(p.x + p.nx * p.w).toFixed(1)} ${(p.y + p.ny * p.w).toFixed(1)}`);
  const right = spine.map((p) => `${(p.x - p.nx * p.w).toFixed(1)} ${(p.y - p.ny * p.w).toFixed(1)}`).reverse();
  const outline = `M${left.join('L')}L${right.join('L')}Z`;
  let hatching = '';
  let band = '';
  let suckers = '';
  spine.forEach((p, i) => {
    if (i < 2 || i > SAMPLES - 3) return;
    // The shaded side faces away from the coil; the suckers' band is on the other.
    const hx = p.nx * -side;
    const hy = p.ny * -side;
    const tx = p.ny;
    const ty = -p.nx;
    // Hatching: strokes slanted along the arm, longer and shorter in turn, as a burin would cut them.
    const reach = 0.28 + 0.22 * Math.abs(Math.sin(i * 1.9));
    hatching += `M${(p.x + hx * p.w * 0.95).toFixed(1)} ${(p.y + hy * p.w * 0.95).toFixed(1)}L${(p.x + hx * p.w * reach + tx * p.w * 0.3).toFixed(1)} ${(p.y + hy * p.w * reach + ty * p.w * 0.3).toFixed(1)}`;
    // The edge of the suckers' band, a second line along the underside.
    band += `${i === 2 ? 'M' : 'L'}${(p.x - hx * p.w * 0.18).toFixed(1)} ${(p.y - hy * p.w * 0.18).toFixed(1)}`;
    // Suckers in two staggered rows, shrinking towards the tip.
    if (i % 2 === 0 && p.w > 2) {
      const r = p.w * 0.2;
      const depth = i % 4 === 0 ? 0.45 : 0.72;
      const cx = p.x - hx * p.w * depth;
      const cy = p.y - hy * p.w * depth;
      suckers += `M${(cx - r).toFixed(1)} ${cy.toFixed(1)}a${r.toFixed(1)} ${(r * 0.8).toFixed(1)} 0 1 0 ${(2 * r).toFixed(1)} 0a${r.toFixed(1)} ${(r * 0.8).toFixed(1)} 0 1 0 ${(-2 * r).toFixed(1)} 0`;
      suckers += `M${cx.toFixed(1)} ${cy.toFixed(1)}h0.01`;
    }
  });
  return { outline, hatching: hatching + band, suckers };
};

/** The arms rising out of the sea at a corner of the chart, on a 400×400 box, base at the bottom left. */
const ARMS: TentacleSpec[] = [
  { x: 30, y: 440, angle: -1.32, length: 440, width: 30, curl: 4.4, phase: 0 },
  { x: 170, y: 450, angle: -1.12, length: 330, width: 22, curl: -4, phase: 2.1 },
  { x: -30, y: 330, angle: -0.5, length: 280, width: 18, curl: 4.8, phase: 4.2 },
];

/**
 * A kraken rising from the lower margin of the chart, as engravers drew them: arms in line, shaded with hatching,
 * suckers on their undersides, coiling and swaying slowly. Each frame rewrites the paths directly;
 * nothing moves while the setting is hidden or motion is reduced.
 */
const Kraken: React.FC<{ className?: string }> = ({ className }) => {
  const svg = React.useRef<SVGSVGElement>(null);
  React.useEffect(() => {
    const root = svg.current;
    if (!root) return;
    const paths = ARMS.map((_, i) => ({
      outline: root.querySelector<SVGPathElement>(`[data-arm="${i}"][data-part="outline"]`),
      hatching: root.querySelector<SVGPathElement>(`[data-arm="${i}"][data-part="hatching"]`),
      suckers: root.querySelector<SVGPathElement>(`[data-arm="${i}"][data-part="suckers"]`),
    }));
    const draw = (t: number) =>
      ARMS.forEach((arm, i) => {
        const { outline, hatching, suckers } = tentacle(arm, t);
        paths[i].outline?.setAttribute('d', outline);
        paths[i].hatching?.setAttribute('d', hatching);
        paths[i].suckers?.setAttribute('d', suckers);
      });
    draw(0);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // The backdrops of every setting stay mounted and cross-fade; only the visible one moves.
    const scope = root.closest<HTMLElement>('[data-setting]');
    let frame = 0;
    let last = 0;
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (now - last < 33) return;
      last = now;
      if (scope && getComputedStyle(scope).opacity === '0') return;
      draw(now / 1000);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <svg ref={svg} viewBox="0 0 400 400" fill="none" stroke="currentColor" aria-hidden className={className}>
      {ARMS.map((_, i) => (
        <g key={i}>
          <path data-arm={i} data-part="outline" fill="rgb(var(--c-bg))" strokeWidth="1.2" />
          <path data-arm={i} data-part="hatching" strokeWidth="0.6" opacity="0.8" />
          <path data-arm={i} data-part="suckers" strokeWidth="0.7" />
        </g>
      ))}
    </svg>
  );
};

/**
 * Screen corner, 120×120: the corner of the chart's border, as engraved on old sea charts — a
 * heavy outer rule, a thin inner one, between them the scale of minutes in alternate dark and pale
 * blocks, the whole border fading out into the dark along each edge.
 */
const ScreenCorner: React.FC = () => (
  <svg width="120" height="120" viewBox="0 0 120 120" fill="none" aria-hidden>
    <defs>
      <linearGradient id="lc-fade-x" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0.3" stopColor="currentColor" />
        <stop offset="1" stopColor="currentColor" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="lc-fade-y" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0.3" stopColor="currentColor" />
        <stop offset="1" stopColor="currentColor" stopOpacity="0" />
      </linearGradient>
    </defs>
    <path d="M1 1H120M1 9H120" stroke="url(#lc-fade-x)" />
    <path d="M1 1V120M9 1V120" stroke="url(#lc-fade-y)" />
    <path d="M1 1H120" stroke="url(#lc-fade-x)" strokeWidth="1.4" />
    <path d="M1 1V120" stroke="url(#lc-fade-y)" strokeWidth="1.4" />
    {/* The scale of minutes: every other block filled. */}
    <path d={Array.from({ length: 7 }, (_, i) => `M${13 + i * 16} 2.5h8v5h-8Z`).join('')} fill="url(#lc-fade-x)" stroke="none" />
    <path d={Array.from({ length: 7 }, (_, i) => `M2.5 ${13 + i * 16}h5v8h-5Z`).join('')} fill="url(#lc-fade-y)" stroke="none" />
    <path d="M1 1h8v8H1Z" fill="currentColor" />
    <path d="M14 14V40M14 14H40" stroke="currentColor" strokeWidth="0.5" opacity="0.6" />
  </svg>
);

/**
 * The night carriage after the lamps are turned low: dark green leather, and laid under everything
 * a sea chart engraved in fine lines, its soundings closing on a point no ship should sail to; fog
 * along the floor, darkness at the edges, deco brass in the corners.
 */
const Backdrop: React.FC<{ frame?: boolean }> = ({ frame = true }) => (
  <div className="absolute inset-0 overflow-hidden text-frame">
    <div className="lc-glow absolute inset-0" />
    <div className="absolute inset-0 opacity-[0.3]">
      <Chart />
    </div>
    <Kraken className="lc-kraken absolute bottom-0 left-0 aspect-square w-[min(36vw,54vh,50%)]" />
    <div className="lc-haze absolute inset-[-10%]" />
    <div className="lc-fog absolute inset-x-[-20%] bottom-[-6%] h-[38%]" />
    <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 220px 70px rgb(0 0 0 / 0.88)' }} />
    {frame &&
      (['left-0 top-0', 'right-0 top-0 -scale-x-100', 'bottom-0 left-0 -scale-y-100', 'bottom-0 right-0 -scale-100'] as const).map(
        (position) => (
          <div key={position} className={`lc-screen-corner absolute m-4 ${position}`}>
            <ScreenCorner />
          </div>
        ),
      )}
  </div>
);

const READY_W = 272;
const READY_H = 36;

/**
 * The level is ready: light moves through the bar as through deep water, and above its middle an
 * eye slowly opens, looks one way and the other, and closes.
 */
const LevelReady: React.FC = () => {
  const mid = READY_H / 2;
  return (
    <svg viewBox={`0 0 ${READY_W} ${READY_H}`} preserveAspectRatio="xMidYMid meet" fill="none" aria-hidden className="lc-ready">
      <defs>
        <clipPath id="lc-ready-bar">
          <rect x="6" y={mid - 3} width={READY_W - 12} height="6" />
        </clipPath>
        <linearGradient id="lc-ready-caustic" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="rgb(var(--c-eldritch))" stopOpacity="0" />
          <stop offset="0.5" stopColor="rgb(var(--c-eldritch))" stopOpacity="0.9" />
          <stop offset="1" stopColor="rgb(var(--c-eldritch))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g clipPath="url(#lc-ready-bar)">
        <rect className="lc-caustic" x="-80" y={mid - 3} width="80" height="6" fill="url(#lc-ready-caustic)" />
        <rect className="lc-caustic lc-caustic--late" x="-50" y={mid - 3} width="50" height="6" fill="url(#lc-ready-caustic)" />
      </g>
      <g className="lc-eye" transform={`translate(${READY_W / 2} ${mid - 11})`}>
        <path d="M-11 0C-5-6 5-6 11 0C5 6-5 6-11 0Z" fill="rgb(var(--c-bg-deep))" stroke="rgb(var(--c-frame-bright))" strokeWidth="0.8" />
        <path className="lc-eye__pupil" d="M0-4C1.3-1.5 1.3 1.5 0 4C-1.3 1.5-1.3-1.5 0-4Z" fill="rgb(var(--c-eldritch))" />
      </g>
    </svg>
  );
};

/** Beads strung between the cartouche's two ovals. */
const BEADS = Array.from({ length: 36 }, (_, i) => {
  const a = (i / 36) * Math.PI * 2;
  return { x: (Math.cos(a) * 66).toFixed(1), y: (Math.sin(a) * 87).toFixed(1) };
});

/**
 * An ex-libris cartouche round the world card's emblem, as pasted inside the cover of an old book:
 * a double oval strung with beads, a deco fan above and below, a lozenge at each side.
 */
const WorldSigil: React.FC = () => (
  <svg viewBox="-110 -110 220 220" fill="none" stroke="currentColor" aria-hidden className="lc-sigil">
    <ellipse rx="72" ry="94" strokeWidth="1.1" />
    <ellipse rx="60" ry="80" strokeWidth="0.6" />
    {BEADS.map(({ x, y }, i) => (
      <circle key={i} cx={x} cy={y} r="1.1" fill="currentColor" stroke="none" />
    ))}
    {[-1, 1].map((dir) => (
      <g key={dir} transform={`scale(1 ${dir})`}>
        <path d="M-22 -94A22 22 0 0 1 22 -94" strokeWidth="0.8" />
        {Array.from({ length: 7 }, (_, i) => {
          const a = Math.PI * ((i + 1) / 8);
          return <path key={i} d={`M0 -94L${(-Math.cos(a) * 20).toFixed(1)} ${(-94 - Math.sin(a) * 20).toFixed(1)}`} strokeWidth="0.6" />;
        })}
        <path d="M-40 -96H-26M26 -96H40M-36 -100H-28M28 -100H36" strokeWidth="0.6" />
      </g>
    ))}
    {[-1, 1].map((dir) => (
      <path key={dir} d={`M${dir * 72} -6L${dir * 80} 0L${dir * 72} 6L${dir * 64} 0Z`} fill="rgb(var(--c-bg))" strokeWidth="0.8" />
    ))}
  </svg>
);

/** An isobath-like closed line round the origin at about `r`, bent by slow waves of its own. */
const contour = (r: number) => {
  const waves = [2, 3, 5].map((k) => ({ k, amp: (r * (0.04 + Math.random() * 0.08)) / Math.sqrt(k), phase: Math.random() * Math.PI * 2 }));
  const points = Array.from({ length: 72 }, (_, i) => {
    const a = (i / 72) * Math.PI * 2;
    const radius = r + waves.reduce((sum, { k, amp, phase }) => sum + amp * Math.sin(k * a + phase), 0);
    return `${(Math.cos(a) * radius * 1.2).toFixed(1)} ${(Math.sin(a) * radius).toFixed(1)}`;
  });
  return `M${points.join('L')}Z`;
};

/**
 * Something stirs under the sea: rings like the chart's isobaths spread out from the chosen card one
 * after another, uneven, as over a thing rising in deep water.
 */
const Flourish: React.FC<{ x: number; y: number }> = ({ x, y }) => {
  const rings = React.useMemo(() => Array.from({ length: 7 }, (_, i) => contour(56 + i * 7)), []);
  return (
    <svg className="lc-ripples" style={{ left: x, top: y }} viewBox="-200 -200 400 400" fill="none" aria-hidden>
      {rings.map((d, i) => (
        <path key={i} d={d} style={{ animationDelay: `${i * 0.11}s` }} />
      ))}
    </svg>
  );
};

/** A short number for a hero, the way a conductor marks a seat: three digits of the id's hash. */
const seatNumber = (id: string) => {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return String(hash % 1000).padStart(3, '0');
};

/**
 * A railway ticket tucked against the focused hero card: the line, the carriage (the hero's level)
 * and the seat, punched by the conductor.
 */
const HeroReadout: NonNullable<SettingArt['HeroReadout']> = ({ id, level }) => (
  <div className="lc-ticket" aria-hidden>
    <span className="lc-ticket__line">Аркхем — Иннсмут</span>
    <span className="lc-ticket__seat">
      Вагон {level} · Место {seatNumber(id)}
    </span>
  </div>
);

/** Hour marks of the watch's dial: twelve, the quarters longer. */
const WATCH_TICKS = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2;
  const inner = i % 3 === 0 ? 17 : 19;
  const at = (r: number) => `${(30 + r * Math.sin(a)).toFixed(2)} ${(46 - r * Math.cos(a)).toFixed(2)}`;
  return `M${at(inner)}L${at(21)}`;
}).join('');

/**
 * The level on a conductor's pocket watch: a brass case with its bow and crown, a yellowed dial
 * with hour marks, the number in its middle and a pointer on the rim creeping round by the level,
 * twenty to the full turn.
 */
const StatusLevel: NonNullable<SettingArt['StatusLevel']> = ({ level }) => (
  <span className="lc-watch">
    <svg className="ui-level__art" viewBox="0 0 60 74" aria-hidden>
      <circle className="lc-watch__bow" cx="30" cy="8" r="6" />
      <path className="lc-watch__crown" d="M26 12h8v6h-8Z" />
      <circle className="lc-watch__case" cx="30" cy="46" r="27" />
      <circle className="lc-watch__dial" cx="30" cy="46" r="22.5" />
      <path className="lc-watch__ticks" d={WATCH_TICKS} />
      <path
        className="lc-watch__hand"
        d="M30 25.5l2 6.5h-4Z"
        transform={`rotate(${(Math.min(level, 20) / 20) * 360} 30 46)`}
      />
    </svg>
    <span className="lc-watch__level ui-numeric">{level}</span>
  </span>
);

export const LOVECRAFT_ART: SettingArt = {
  corner: { viewBox: '0 0 24 24', art: <BrassCorner /> },
  crest: { viewBox: '0 0 120 24', art: <FanCrest /> },
  ruleMark: <DecoRule />,
  // A small lozenge, as in a deco border.
  bullet: (filled) => (
    <path d="M7 2.5 11.5 7 7 11.5 2.5 7Z" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="0.9" strokeLinejoin="round" />
  ),
  // What sleeps under the sea and dreams.
  Emblem: GiTentaclesSkull,
  Backdrop,
  LevelReady,
  WorldSigil,
  HeroReadout,
  StatusLevel,
  Flourish,
};
