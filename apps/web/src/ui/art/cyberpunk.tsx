import React from 'react';
import GiCyberEye from '~icons/game-icons/cyber-eye';
import type { SettingArt } from './types';

/**
 * Cyberpunk ornament: a merc's optics in a neon city (Cyberpunk 2077). Panes are cut at opposite
 * corners and marked with hazard stripes; the art is a slashed divider, a slanted-bar bullet, the
 * cyber-eye emblem, and behind the screen the reticle of an optic implant and the brackets of
 * the HUD.
 */

/** Points of a polar position, rounded for the path. */
const polar = (r: number, degrees: number) => {
  const a = ((degrees - 90) * Math.PI) / 180;
  return [(r * Math.cos(a)).toFixed(1), (r * Math.sin(a)).toFixed(1)] as const;
};

/** An arc of a ring from one bearing to another, in degrees. */
const arc = (r: number, from: number, to: number) => {
  const [x1, y1] = polar(r, from);
  const [x2, y2] = polar(r, to);
  return `M${x1} ${y1}A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`;
};

/** Ticks round a ring: a short one every `step` degrees, a long one every `major`. */
const ticks = (r: number, step: number, major: number, short: number, long: number) =>
  Array.from({ length: 360 / step }, (_, i) => {
    const length = (i * step) % major === 0 ? long : short;
    const [x1, y1] = polar(r, i * step);
    const [x2, y2] = polar(r - length, i * step);
    return `M${x1} ${y1}L${x2} ${y2}`;
  }).join('');

/**
 * The reticle of an optic implant, 760 units across, centred on the origin: a broken outer ring
 * with a range scale, a segmented ring that turns, the lens rings and the crosshair with its
 * range marks. Shown large and half off-screen, it is the eye the city is seen through.
 */
const OpticReticle: React.FC = () => (
  <svg viewBox="-380 -380 760 760" fill="none" stroke="currentColor" aria-hidden className="h-full w-full">
    <path d={`${arc(372, 8, 82)}${arc(372, 98, 172)}${arc(372, 188, 262)}${arc(372, 278, 352)}`} strokeWidth="1.4" />
    <path d={ticks(360, 2, 10, 5, 14)} strokeWidth="0.7" />
    <circle r="340" strokeWidth="0.5" strokeDasharray="1 5" />
    <g className="cp-reticle-turn">
      {Array.from({ length: 12 }, (_, i) => (
        <path key={i} d={arc(312, i * 30 + 3, i * 30 + (i % 3 === 0 ? 27 : 18))} strokeWidth={i % 3 === 0 ? 6 : 2} />
      ))}
    </g>
    <circle r="282" strokeWidth="0.8" />
    <path d={ticks(282, 5, 45, 4, 12)} strokeWidth="0.6" />
    <circle r="200" strokeWidth="0.5" strokeDasharray="12 6" />
    <circle r="132" strokeWidth="1" />
    <path d={`${arc(118, 20, 70)}${arc(118, 110, 160)}${arc(118, 200, 250)}${arc(118, 290, 340)}`} strokeWidth="3" />
    <circle r="40" strokeWidth="0.8" />
    <path d="M-372 0H-150M150 0H372M0-372V-150M0 150V372" strokeWidth="0.6" />
    <path d="M-60 0H-14M14 0H60M0-60V-14M0 14V60" strokeWidth="1.4" />
    <path d={[230, 250, 270].map((r) => `M${-r} -8V8M${r} -8V8M-8 ${r}H8`).join('')} strokeWidth="1" />
    <path d="M-5 -5H5V5H-5Z" fill="currentColor" stroke="none" />
  </svg>
);

/** Bearings along the heading strip, every 15°, with the cardinal points named. */
const BEARINGS = Array.from({ length: 13 }, (_, i) => {
  const degrees = (i * 15 + 270) % 360;
  return { x: 10 + i * 40, label: ({ 0: 'N', 90: 'E', 180: 'S', 270: 'W' } as Record<number, string>)[degrees] ?? String(degrees) };
});

/** The heading strip across the top of the optics: a scale of bearings, a yellow caret at its middle. */
const Heading: React.FC = () => (
  <svg width="500" height="34" viewBox="0 0 500 34" fill="none" aria-hidden className="cp-heading">
    <path d={Array.from({ length: 61 }, (_, i) => `M${10 + i * 8} ${i % 5 === 0 ? 14 : 18}V22`).join('')} stroke="currentColor" strokeWidth="1" />
    <path d="M10 22H490" stroke="currentColor" strokeWidth="0.6" opacity="0.6" />
    {BEARINGS.map(({ x, label }) => (
      <text key={x} x={x} y="10" textAnchor="middle" fill="currentColor" fontSize="9" letterSpacing="1">
        {label}
      </text>
    ))}
    <path d="M250 25 245 33H255Z" fill="rgb(var(--c-accent))" />
  </svg>
);

/** The vitals of the optics down the left edge: a label, a value and a bar of cells. */
const STATUS = [
  { label: 'NET', value: 'ONLINE', cells: 4 },
  { label: 'SIG', value: '-42 DB', cells: 3 },
  { label: 'RAM', value: '12/16', cells: 3 },
  { label: 'OPT', value: 'KRS·2', cells: 4 },
  { label: 'THREAT', value: 'LOW', cells: 1 },
];

const Status: React.FC = () => (
  <div className="cp-status">
    {STATUS.map(({ label, value, cells }) => (
      <div key={label} className="cp-status__row">
        <span className="cp-status__label">{label}</span>
        <span className="cp-status__value">{value}</span>
        <span className="cp-status__cells">
          {Array.from({ length: 4 }, (_, i) => (
            <i key={i} data-on={i < cells || undefined} />
          ))}
        </span>
      </div>
    ))}
  </div>
);

/** A dump of the data stream scrolling up the lower left, in faint hex. */
const DUMP = Array.from({ length: 14 }, (_, row) =>
  Array.from({ length: 6 }, (_, col) => ((row * 7919 + col * 104729) % 65536).toString(16).toUpperCase().padStart(4, '0')).join(' '),
);

const Dump: React.FC = () => (
  <div className="cp-dump">
    <div className="cp-dump__scroll">
      {[...DUMP, ...DUMP].map((line, i) => (
        <div key={i}>
          <span>{(0x7f00 + (i % DUMP.length) * 16).toString(16).toUpperCase()}</span> {line}
        </div>
      ))}
    </div>
  </div>
);

/** The range finder down the right edge: metres marked every ten, a caret on the target. */
const Range: React.FC = () => (
  <svg width="44" height="260" viewBox="0 0 44 260" fill="none" aria-hidden className="cp-range">
    <path d={Array.from({ length: 51 }, (_, i) => `M${i % 5 === 0 ? 26 : 32} ${5 + i * 5}H38`).join('')} stroke="currentColor" strokeWidth="1" />
    <path d="M38 5V255" stroke="currentColor" strokeWidth="0.6" opacity="0.6" />
    {Array.from({ length: 11 }, (_, i) => (
      <text key={i} x="22" y={8 + i * 25} textAnchor="end" fill="currentColor" fontSize="8">
        {100 - i * 10}
      </text>
    ))}
    <path className="cp-range__caret" d="M44 120 39 125 44 130Z" fill="rgb(var(--c-accent))" />
  </svg>
);

/**
 * The displacement map of a tube's bulge: red and green carry the horizontal and vertical shift,
 * growing with the square of the distance from the centre, so the picture's edges bow outwards.
 * Drawn once, on first use.
 */
let tubeMap: string | undefined;
const tubeMapUrl = () => {
  if (tubeMap) return tubeMap;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) return '';
  const image = context.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = ((x + 0.5) / size) * 2 - 1;
      const ny = ((y + 0.5) / size) * 2 - 1;
      const r2 = nx * nx + ny * ny;
      const i = (y * size + x) * 4;
      image.data[i] = Math.round(255 * (0.5 + (nx * r2) / 4));
      image.data[i + 1] = Math.round(255 * (0.5 + (ny * r2) / 4));
      image.data[i + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  tubeMap = canvas.toDataURL();
  return tubeMap;
};

/** The filter that bows the picture behind the glass (`.cp-tube`); sized to whatever it is laid on. */
const TubeWarp: React.FC = () => {
  const [map, setMap] = React.useState<string>();
  React.useEffect(() => setMap(tubeMapUrl()), []);
  if (!map) return null;
  return (
    <svg width="0" height="0" className="absolute" aria-hidden>
      <filter id="cp-tube-warp" x="0" y="0" width="1" height="1" primitiveUnits="objectBoundingBox" colorInterpolationFilters="sRGB">
        <feImage href={map} x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="map" />
        <feDisplacementMap in="SourceGraphic" in2="map" scale="0.09" xChannelSelector="R" yChannelSelector="G" />
        {/* The phosphor's soft bloom, which also smooths the shifted pixels. */}
        <feGaussianBlur stdDeviation="0.0005" />
      </filter>
    </svg>
  );
};

/**
 * Night in the neon city, seen through optics: a red haze rising, a cold cyan light from above,
 * the implant's reticle turning half out of sight at the right, scan lines over everything, now
 * and then a band of the picture tears.
 * The optics' HUD sits in the free margins — heading at the top, vitals and the data stream at the
 * left, the range finder and the recording mark at the right — and is left out where the screen
 * has a HUD of its own (combat). The picture under the glass bows out like a tube's; the interface
 * over it stays flat.
 */
const Backdrop: React.FC<{ frame?: boolean }> = ({ frame = true }) => (
  <div className="absolute inset-0 text-frame">
    <TubeWarp />
    <div className="cp-haze absolute inset-0" />
    <div className="cp-tube absolute inset-0">
      <div className="absolute right-0 top-1/2 aspect-square h-[104%] -translate-y-1/2 translate-x-[40%] opacity-[0.22]">
        <OpticReticle />
      </div>
      {frame && (
        <div className="cp-hud">
          <div className="absolute left-1/2 top-5 -translate-x-1/2">
            <Heading />
          </div>
          <div className="absolute left-24 top-[12%]">
            <Status />
          </div>
          <div className="absolute bottom-[17%] left-24">
            <Dump />
          </div>
          <div className="absolute right-24 top-[17%]">
            <Range />
          </div>
          <div className="cp-rec absolute right-24 top-[11%]">
            <i /> REC 00:24:17
          </div>
        </div>
      )}
      <div className="cp-tear absolute inset-x-0 top-[38%] h-[3%]" />
    </div>
    <div className="cp-scanlines absolute inset-0" />
    <div className="cp-vignette absolute inset-0" />
  </div>
);

/** A short code for a hero, the way a scanner tags a target: four hex digits of the id's hash. */
const targetCode = (id: string) => {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return (hash & 0xffff).toString(16).toUpperCase().padStart(4, '0');
};

/**
 * A scanner's readout round the focused hero card: lock brackets standing off its corners and a
 * terminal line at each — the target's code, its level, its vitals and the link with a cursor.
 */
const HeroReadout: NonNullable<SettingArt['HeroReadout']> = ({ id, level, hp, maxHp }) => (
  <div className="cp-readout" aria-hidden>
    <span className="cp-readout__line cp-readout__line--tl">&gt; TARGET 0x{targetCode(id)}</span>
    <span className="cp-readout__line cp-readout__line--tr">LVL {String(level).padStart(2, '0')}</span>
    <span className="cp-readout__line cp-readout__line--bl">
      BIO {hp}/{maxHp} · {maxHp > 0 ? Math.round((hp / maxHp) * 100) : 0}%
    </span>
    <span className="cp-readout__line cp-readout__line--br">
      LINK OK<span className="cp-readout__cursor">_</span>
    </span>
  </div>
);

const READY_W = 272;
const READY_H = 36;

/** Bars of the overload readout over the experience bar. */
const SEGMENTS = Array.from({ length: 26 }, (_, i) => ({ x: 6 + i * 10, delay: (i * 0.045).toFixed(2) }));

/**
 * The level is ready: the bar overloads. Its cells flash in a running wave, the bar tears into
 * red and cyan copies for an instant, and an "UPGRADE" tag blinks over it.
 */
const LevelReady: React.FC = () => {
  const mid = READY_H / 2;
  return (
    <svg viewBox={`0 0 ${READY_W} ${READY_H}`} preserveAspectRatio="none" fill="none" aria-hidden className="cp-ready">
      {SEGMENTS.map(({ x, delay }) => (
        <rect key={x} className="cp-cell" style={{ animationDelay: `${delay}s` }} x={x} y={mid - 4} width="7" height="8" fill="rgb(var(--c-accent))" />
      ))}
      <rect className="cp-split cp-split--red" x="6" y={mid - 4} width={READY_W - 12} height="8" fill="rgb(var(--c-frame-bright))" />
      <rect className="cp-split cp-split--cyan" x="6" y={mid - 4} width={READY_W - 12} height="8" fill="rgb(var(--c-neon))" />
      <path className="cp-tag" d={`M${READY_W - 70} ${mid - 13}H${READY_W - 4}M4 ${mid + 13}H70`} stroke="rgb(var(--c-accent))" strokeWidth="2" />
    </svg>
  );
};

/**
 * A targeting reticle round the world card's emblem: segments of a ring that lock on in turn as the
 * card is looked at, with range ticks and four bracket marks.
 */
const WorldSigil: React.FC = () => (
  <svg viewBox="-110 -110 220 220" fill="none" aria-hidden className="cp-sigil">
    <g className="cp-sigil__ring">
      {Array.from({ length: 8 }, (_, i) => (
        <path key={i} className="cp-sigil__seg" style={{ animationDelay: `${i * 0.08}s` }} d={arc(92, i * 45 + 4, i * 45 + 36)} stroke="currentColor" strokeWidth={i % 2 ? 1.2 : 3} />
      ))}
    </g>
    <path d={ticks(80, 6, 30, 3, 8)} stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
    <path d="M-104 -20V-30H-94M94 -30H104V-20M104 20V30H94M-94 30H-104V20" stroke="rgb(var(--c-neon))" strokeWidth="1.2" className="cp-sigil__lock" />
  </svg>
);

/**
 * The level on a data shard: a black chip with a cut corner and a red hairline, gold contacts along
 * its foot, a yellow label strip and the number burnt in large.
 */
const StatusLevel: NonNullable<SettingArt['StatusLevel']> = ({ level }) => (
  <span className="cp-shard">
    <svg className="ui-level__art" viewBox="0 0 60 84" preserveAspectRatio="none" aria-hidden>
      <path className="cp-shard__body" d="M1 1H45L59 15V75H1Z" />
      <path className="cp-shard__pins" d="M8 76h5v7h-5ZM17 76h5v7h-5ZM26 76h5v7h-5ZM35 76h5v7h-5ZM44 76h5v7h-5Z" />
      <path className="cp-shard__notch" d="M1 46h4v10H1Z" />
    </svg>
    <span className="cp-shard__tag">LVL</span>
    <span className="cp-shard__level ui-numeric">{String(level).padStart(2, '0')}</span>
  </span>
);

export const CYBERPUNK_ART: SettingArt = {
  ruleMark: (
    <svg width="40" height="8" viewBox="0 0 40 8" aria-hidden>
      <path d="M0 4h10M30 4h10" stroke="currentColor" strokeWidth="1" />
      <path d="M14 8 18 0h3l-4 8ZM20 8 24 0h3l-4 8Z" fill="rgb(var(--c-accent))" />
    </svg>
  ),
  // A slanted bar, like the HUD's markers.
  bullet: (filled) => (
    <path d="M5 2.5h5L8 11.5H3Z" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="0.9" strokeLinejoin="round" />
  ),
  // An optic implant: the street sees through chrome.
  Emblem: GiCyberEye,
  Backdrop,
  LevelReady,
  WorldSigil,
  HeroReadout,
  StatusLevel,
};
