import React from 'react';
import GiCandleSkull from '~icons/game-icons/candle-skull';
import type { SettingArt } from './types';

/**
 * Dark fantasy ornament: a hunter's reliquary (Bloodborne's Yharnam, the Imperium's iron, Dragon
 * Age's tooled leather). Tarnished brass engraved in double rules, gothic spikes and rivets at the
 * corners, a pointed arch over major panels, the cross pattée and daggers; behind the screen a
 * great rose window, moonlight falling through its coloured glass in shafts, candlelight, fog,
 * dust and embers.
 */

/**
 * Filters that turn the vector ornament into worked material (see dark-fantasy-material.css):
 * brass in relief, lit from the upper left, its edge worn uneven; and the hand-cut wobble of an
 * engraving. Drawn with every panel corner and with the backdrop, so they are on whatever screen
 * uses them; identical copies are harmless.
 */
const MaterialFilters: React.FC = () => (
  <defs>
    <filter id="df-brass" x="-15%" y="-15%" width="130%" height="130%" colorInterpolationFilters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="4" result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.9" xChannelSelector="R" yChannelSelector="G" result="worn" />
      <feGaussianBlur in="worn" stdDeviation="0.5" result="soft" />
      <feSpecularLighting in="soft" surfaceScale="2.4" specularConstant="1.1" specularExponent="16" lightingColor="#fff0cf" result="spec">
        <feDistantLight azimuth="225" elevation="46" />
      </feSpecularLighting>
      <feComposite in="spec" in2="worn" operator="in" result="gloss" />
      <feComposite in="worn" in2="gloss" operator="arithmetic" k2="0.8" k3="0.9" />
    </filter>
    <filter id="df-etch" x="-2%" y="-2%" width="104%" height="104%">
      <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="8" />
      <feDisplacementMap in="SourceGraphic" scale="5" />
    </filter>
  </defs>
);

/**
 * Engraved corner, 24×24, drawn on the panel's rim: the rim thickens into the corner, a fine rule
 * runs inside it, and across the corner hangs a cusped arch of tracery, as in the head of a gothic
 * window: its point is a spearhead aimed into the panel, two crockets sit on its curves, a rivet
 * holds the corner.
 */
const GothicCorner: React.FC = () => (
  <>
    <MaterialFilters />
    <path d="M0.75 19V0.75H19" fill="none" stroke="currentColor" strokeWidth="1.6" />
    <path d="M4.25 14.5V4.25H14.5" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.7" />
    {/* The cusped arch across the corner, its point turned into the panel. */}
    <path d="M4.25 17.5C7.6 17.5 10.2 14.6 10.2 10.2 14.6 10.2 17.5 7.6 17.5 4.25" fill="none" stroke="currentColor" strokeWidth="0.9" />
    <path d="M10.2 10.2 13.4 11.6 15.6 15.6 11.6 13.4Z" fill="currentColor" />
    <circle cx="6.9" cy="15.9" r="0.95" fill="currentColor" />
    <circle cx="15.9" cy="6.9" r="0.95" fill="currentColor" />
    <circle cx="2.6" cy="2.6" r="1.5" fill="currentColor" />
    <circle cx="2.6" cy="2.6" r="0.6" fill="rgb(var(--c-bg-deep))" />
  </>
);

/**
 * A reliquary's gable standing on the top edge of a major panel, 120×24, the edge along y = 20:
 * a pointed arch with crockets climbing its sides and a finial, a traceried window in it (two
 * lights under an oculus with a drop of blood set in it), and the rim running out to pinnacles.
 */
const ArchCrest: React.FC = () => (
  <>
    <path d="M12 20H42M78 20H108" stroke="currentColor" strokeWidth="1.8" opacity="0.8" />
    <path d="M20 22.6H42M78 22.6H100" stroke="currentColor" strokeWidth="0.6" opacity="0.55" />
    {/* Pinnacles where the rim ends. */}
    <path d="M12 20 9.5 17.6 12 13.2 14.5 17.6ZM108 20 105.5 17.6 108 13.2 110.5 17.6Z" fill="currentColor" opacity="0.85" />
    {/* The gable, its window, its crockets and its finial. */}
    <path d="M42 20C47.5 19.4 54 13 60 2.6 66 13 72.5 19.4 78 20Z" fill="rgb(var(--c-surface))" stroke="currentColor" strokeWidth="1" />
    <path d="M48.5 20C52 18.8 56.6 14.4 60 8.4 63.4 14.4 68 18.8 71.5 20" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.75" />
    <path d="M60 15.6V20M54.6 20V18.4C54.6 17 56 15.8 57.3 15.4M65.4 20V18.4C65.4 17 64 15.8 62.7 15.4" fill="none" stroke="currentColor" strokeWidth="0.55" opacity="0.75" />
    <circle cx="60" cy="13.1" r="2.3" fill="none" stroke="currentColor" strokeWidth="0.6" />
    <circle cx="60" cy="13.1" r="1.1" fill="rgb(var(--c-accent))" />
    {[
      [47.2, 17.6],
      [51.8, 13.9],
      [55.6, 9.4],
      [64.4, 9.4],
      [68.2, 13.9],
      [72.8, 17.6],
    ].map(([x, y]) => (
      <path key={x} d={`M${x} ${y}c-1.2-0.4-1.6-1.6-0.8-2.3 0.6-0.5 1.4-0.1 1.3 0.6`} fill="none" stroke="currentColor" strokeWidth="0.7" />
    ))}
    <path d="M60 2.8V0.4M58.6 1.5H61.4" stroke="currentColor" strokeWidth="0.9" />
  </>
);

/** The cross pattée of a knightly order, the centre of a divider, between two short rules. */
const CrossRule: React.FC = () => (
  <svg width="58" height="14" viewBox="0 0 58 14" aria-hidden>
    <path d="M0 7H20M38 7H58" stroke="currentColor" strokeWidth="0.8" />
    <path d="M17 7 20 5.5V8.5ZM41 7 38 5.5V8.5Z" fill="currentColor" />
    <path d="M27.2 1h3.6L30 5.2 35 4.6v4.8L30 8.8 30.8 13h-3.6L28 8.8 23 9.4V4.6l5 .6Z" fill="currentColor" />
  </svg>
);

/** A repeatable pseudo-random sequence, so the embers rise the same on every render. */
const random = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

/** Points of a polar position, rounded for the path. */
const polar = (r: number, degrees: number) => {
  const a = ((degrees - 90) * Math.PI) / 180;
  return [(r * Math.cos(a)).toFixed(1), (r * Math.sin(a)).toFixed(1)] as const;
};

/**
 * One light of the rose, pointing up from the centre, 12 of them turned round it: a lancet divided
 * by a mullion into two smaller lancets, an oculus in the head of the arch.
 */
const LIGHT =
  'M-34 -146L-58 -248C-58 -292 -22 -318 0 -330 22 -318 58 -292 58 -248L34 -146Z' +
  'M-27 -156 -48 -246C-48 -284 -18 -306 0 -316 18 -306 48 -284 48 -246L27 -156' +
  'M0 -154V-252' +
  'M-22 -166-38 -232C-38 -250 -26 -262 -18 -266 -10 -262 -4 -252 -4 -236V-166' +
  'M22 -166 38 -232C38 -250 26 -262 18 -266 10 -262 4 -252 4 -236V-166';

/** A cusped trefoil between the heads of two lights. */
const Trefoil: React.FC<{ angle: number }> = ({ angle }) => (
  <g transform={`rotate(${angle}) translate(0 -310)`}>
    <circle cx="0" cy="-8" r="7" />
    <circle cx="-7" cy="4" r="7" />
    <circle cx="7" cy="4" r="7" />
  </g>
);

/**
 * A gothic rose window, 760 units across, centred on the origin, engraved in fine lines: a double
 * rim set with roundels, twelve divided lancets round a cusped ring, a six-petalled rose at the
 * heart with the cross of the order in it.
 */
const RoseWindow: React.FC = () => (
  <svg viewBox="-380 -380 760 760" fill="none" stroke="currentColor" aria-hidden className="h-full w-full">
    <circle r="374" strokeWidth="1.4" />
    <circle r="364" strokeWidth="0.6" />
    {Array.from({ length: 36 }, (_, i) => {
      const [x, y] = polar(350, i * 10);
      return (
        <g key={i}>
          <circle cx={x} cy={y} r="10" strokeWidth="0.8" />
          <circle cx={x} cy={y} r="3" strokeWidth="0.6" />
        </g>
      );
    })}
    <circle r="336" strokeWidth="1" />
    <circle r="330" strokeWidth="0.5" />
    {Array.from({ length: 12 }, (_, i) => (
      <path key={i} d={LIGHT} transform={`rotate(${i * 30})`} strokeWidth="0.9" />
    ))}
    {Array.from({ length: 12 }, (_, i) => (
      <circle key={i} cx={polar(284, i * 30)[0]} cy={polar(284, i * 30)[1]} r="10" strokeWidth="0.7" />
    ))}
    {Array.from({ length: 12 }, (_, i) => (
      <Trefoil key={i} angle={i * 30 + 15} />
    ))}
    {/* The cusped ring the lights stand on. */}
    <circle r="140" strokeWidth="1.1" />
    <circle r="128" strokeWidth="0.6" />
    {Array.from({ length: 24 }, (_, i) => {
      const [x1, y1] = polar(128, i * 15);
      const [x2, y2] = polar(128, i * 15 + 15);
      return <path key={i} d={`M${x1} ${y1}A16 16 0 0 0 ${x2} ${y2}`} strokeWidth="0.6" />;
    })}
    {Array.from({ length: 12 }, (_, i) => {
      const [x1, y1] = polar(62, i * 30);
      const [x2, y2] = polar(110, i * 30);
      return <path key={i} d={`M${x1} ${y1}L${x2} ${y2}`} strokeWidth="0.6" />;
    })}
    {/* The heart: six petals drawn by circles through the centre, the cross of the order. */}
    <circle r="62" strokeWidth="1" />
    {Array.from({ length: 6 }, (_, i) => {
      const [x, y] = polar(31, i * 60);
      return <circle key={i} cx={x} cy={y} r="31" strokeWidth="0.6" />;
    })}
    <path d="M-4 -26h8l-2 16 16-2v8l-16-2 2 16h-8l2-16-16 2v-8l16 2Z" strokeWidth="1" />
  </svg>
);

/** Embers rising through the dark, each on its own drift and time. */
const EMBERS = (() => {
  const next = random(57);
  return Array.from({ length: 14 }, () => ({
    left: `${(next() * 100).toFixed(1)}%`,
    size: 1 + Math.round(next() * 1.5),
    duration: `${(18 + next() * 16).toFixed(1)}s`,
    delay: `${(-next() * 34).toFixed(1)}s`,
    drift: `${Math.round((next() - 0.5) * 90)}px`,
  }));
})();

/**
 * Screen corner, 120×120: an engraved double rule fading out along each edge, a pointed arch of
 * tracery across the corner with a spike pointing in, a rivet where the rules meet.
 */
const ScreenCorner: React.FC = () => (
  <svg width="120" height="120" viewBox="0 0 120 120" fill="none" aria-hidden>
    <defs>
      <linearGradient id="df-fade-x" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0.35" stopColor="currentColor" />
        <stop offset="1" stopColor="currentColor" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="df-fade-y" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0.35" stopColor="currentColor" />
        <stop offset="1" stopColor="currentColor" stopOpacity="0" />
      </linearGradient>
    </defs>
    <path d="M0.75 0.75H120" stroke="url(#df-fade-x)" strokeWidth="1.5" />
    <path d="M0.75 0.75V120" stroke="url(#df-fade-y)" strokeWidth="1.5" />
    <path d="M6 6H100" stroke="url(#df-fade-x)" strokeWidth="0.7" opacity="0.7" />
    <path d="M6 6V100" stroke="url(#df-fade-y)" strokeWidth="0.7" opacity="0.7" />
    <path d="M6 54C6 30 18 14 30 10 34 9 42 7 54 6" stroke="currentColor" strokeWidth="1" />
    <path d="M6 40C8 26 16 16 26 13M13 26C16 20 20 16 26 13" stroke="currentColor" strokeWidth="0.7" opacity="0.8" />
    <circle cx="19" cy="19" r="4" stroke="currentColor" strokeWidth="0.8" />
    <path d="M22 22 34 34 26 30 30 26Z" fill="currentColor" />
    <path d="M54 6 58 3.5 62 6 58 8.5ZM6 54 3.5 58 6 62 8.5 58Z" fill="currentColor" />
    <circle cx="3" cy="3" r="2.2" fill="currentColor" />
    <circle cx="3" cy="3" r="0.8" fill="rgb(var(--c-bg-deep))" />
  </svg>
);

/**
 * Shafts of moonlight falling from the rose window across the nave, fanning out from its heart:
 * the angle each falls at, how wide it is where it leaves the glass, and when it brightens.
 */
const RAYS = [
  { angle: -9, width: 16, delay: 0 },
  { angle: 4, width: 24, delay: -4 },
  { angle: 16, width: 13, delay: -9 },
  { angle: 27, width: 20, delay: -2 },
  { angle: 39, width: 11, delay: -7 },
];

/** Dust turning slowly in the moonlight, where the shafts cross the nave. */
const MOTES = (() => {
  const next = random(91);
  return Array.from({ length: 26 }, () => ({
    left: `${(18 + next() * 60).toFixed(1)}%`,
    top: `${(28 + next() * 60).toFixed(1)}%`,
    size: 1 + Math.round(next() * 1.4),
    duration: `${(14 + next() * 14).toFixed(1)}s`,
    delay: `${(-next() * 28).toFixed(1)}s`,
    dx: `${Math.round((next() - 0.3) * 70)}px`,
    dy: `${Math.round((next() - 0.5) * 50)}px`,
  }));
})();

/**
 * Inside a cathedral at night. A great rose window stands half out of sight at the left: the moon
 * behind it, clouds passing, its coloured glass turning slowly through crimson, amber and cobalt,
 * a gleam running round its tracery; shafts of cold light fall from it across the nave with dust
 * turning in them. Candlelight breathes low, fog drifts along the floor in two layers, embers
 * rise, the dark presses in from the edges and an engraved frame closes the screen.
 */
const Backdrop: React.FC<{ frame?: boolean }> = ({ frame = true }) => (
  <div className="absolute inset-0 text-frame">
    <svg width="0" height="0" className="absolute" aria-hidden>
      <MaterialFilters />
    </svg>
    <div className="df-stone absolute inset-0" />
    <div className="df-candlelight absolute inset-0" />
    <div className="df-rose absolute left-0 top-1/2 aspect-square h-[100%] -translate-x-[34%] -translate-y-1/2">
      <div className="df-rose__moon absolute inset-0" />
      <div className="df-rose__glass absolute inset-[3%] rounded-full" />
      <div className="df-rose__lines absolute inset-0">
        <RoseWindow />
      </div>
      <div className="df-rose__gleam absolute inset-0">
        <RoseWindow />
      </div>
      {RAYS.map(({ angle, width, delay }) => (
        <span
          key={angle}
          className="df-ray"
          style={{ ['--ray-angle' as string]: `${angle}deg`, ['--ray-width' as string]: `${width}%`, animationDelay: `${delay}s` }}
        >
          <span className="df-ray__beam" />
        </span>
      ))}
    </div>
    {MOTES.map(({ left, top, size, duration, delay, dx, dy }) => (
      <span
        key={`${left}${top}`}
        className="df-mote"
        style={{ left, top, width: size, height: size, animationDuration: duration, animationDelay: delay, ['--dx' as string]: dx, ['--dy' as string]: dy }}
      />
    ))}
    <div className="ui-fog df-fog--back absolute inset-x-[-25%] bottom-[-4%] h-[34%]" />
    <div className="ui-fog absolute inset-x-[-20%] bottom-[-8%] h-[40%]" />
    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-accent/15 to-transparent" />
    {EMBERS.map(({ left, size, duration, delay, drift }) => (
      <span
        key={left}
        className="df-ember"
        style={{ left, width: size, height: size, animationDuration: duration, animationDelay: delay, ['--drift' as string]: drift }}
      />
    ))}
    <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 200px 60px rgb(0 0 0 / 0.85)' }} />
    <div className="df-flicker absolute inset-0" />
    <div className="df-grain absolute inset-[-10%]" />
    {frame &&
      (['left-0 top-0', 'right-0 top-0 -scale-x-100', 'bottom-0 left-0 -scale-y-100', 'bottom-0 right-0 -scale-100'] as const).map(
        (position) => (
          <div key={position} className={`absolute m-4 ${position}`}>
            <ScreenCorner />
          </div>
        ),
      )}
  </div>
);

const READY_W = 272;
const READY_H = 36;

/** Rune strokes that burn into view over the bar, one after another, in the gap between the
    plaque's label and its figures. */
const RUNES = ['M0 0V9M0 2 4 0M0 5 4 3', 'M2 0V9M0 3 4 6M0 6 4 3', 'M0 0V9M0 0 4 4 0 9'];

/** Where drops of blood gather under the bar and fall. */
const DRIPS = [{ x: 52, delay: 0.3 }, { x: 131, delay: 1.4 }, { x: 207, delay: 0.9 }];

/**
 * The level is ready: the blood in the bar seethes — a dark wave rolls along it, drops gather and
 * fall from its underside — and runes burn into view above it, glowing like embers.
 */
const LevelReady: React.FC = () => {
  const mid = READY_H / 2;
  const wave = Array.from({ length: 41 }, (_, i) => {
    const x = i * 13.6 - 272;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${(mid - 2 + Math.sin((i * 2 * Math.PI) / 5) * 1.6).toFixed(1)}`;
  }).join('');
  return (
    <svg viewBox={`0 0 ${READY_W} ${READY_H}`} preserveAspectRatio="none" fill="none" aria-hidden className="df-ready">
      <defs>
        <clipPath id="df-ready-bar">
          <rect x="6" y={mid - 4} width={READY_W - 12} height="8" />
        </clipPath>
        <linearGradient id="df-ready-blood" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="rgb(190 40 30)" />
          <stop offset="1" stopColor="rgb(70 6 6)" />
        </linearGradient>
      </defs>
      <g clipPath="url(#df-ready-bar)">
        <path className="df-wave" d={`${wave}V${mid + 6}H-272Z`} fill="url(#df-ready-blood)" />
      </g>
      {DRIPS.map(({ x, delay }) => (
        <path
          key={x}
          className="df-drip"
          style={{ animationDelay: `${delay}s` }}
          d={`M${x} ${mid + 3}c-1.4 2.6-2 3.6-2 4.6a2 2 0 0 0 4 0c0-1-0.6-2-2-4.6Z`}
          fill="rgb(150 22 18)"
        />
      ))}
      {RUNES.map((d, i) => (
        <path
          key={d}
          className="df-rune"
          style={{ animationDelay: `${i * 0.9}s` }}
          transform={`translate(${124 + i * 22} 1)`}
          d={d}
          stroke="rgb(var(--c-candle))"
          strokeWidth="1"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
};

/** Glyphs of the ring round the world card's emblem, 4×9 each, drawn as strokes. */
const SIGIL_RUNES = [
  'M0 0V9M0 2 4 0M0 5 4 3',
  'M0 0 3 9 6 0M1 4H5',
  'M0 0V9M0 0 4 4 0 9',
  'M2 0V9M0 3 4 6M0 6 4 3',
  'M0 9 2 0 4 9M0 5H4',
  'M0 0H4V4H0V9',
  'M0 0 4 9M4 0 0 9',
  'M2 0V9M0 0H4M0 9H4',
  'M0 0V9H4',
  'M0 4 2 0 4 4 2 9Z',
  'M0 9V0L4 5V0',
  'M2 0V9M2 3 0 0M2 3 4 0',
];

/**
 * Runes set in a ring round the world card's emblem, with no circle drawn: faint until the card is
 * looked at, then they burn one after another like embers while the ring turns slowly.
 */
const WorldSigil: React.FC = () => (
  <svg viewBox="-110 -110 220 220" fill="none" aria-hidden className="df-sigil">
    <g className="df-sigil__ring">
      {SIGIL_RUNES.map((d, i) => {
        const angle = (i * 360) / SIGIL_RUNES.length;
        return (
          <g key={d} transform={`rotate(${angle}) translate(-2 -92)`}>
            <path className="df-sigil__rune" style={{ animationDelay: `${i * 0.22}s` }} d={d} stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );
      })}
    </g>
  </svg>
);

/** The choice is answered in stone: the rose window's tracery draws itself round the chosen card in candlelight and fades. */
const Flourish: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <div className="df-flourish" style={{ left: x, top: y }}>
    <RoseWindow />
  </div>
);

/**
 * The focused hero card is sealed like a relic: a wax
 * seal is pressed on its corner, as the card comes forward.
 */
const HeroReadout: NonNullable<SettingArt['HeroReadout']> = () => <Seal />;

/** A wax seal on the card's corner, two ribbon tails under it, the cross of the order stamped in; it lands with a thud. */
const Seal: React.FC = () => (
  <div className="df-seal" aria-hidden>
    <span className="df-seal__ribbon" />
    <span className="df-seal__wax">
      <svg viewBox="0 0 24 24" width="22" height="22">
        <path d="M10.2 3h3.6L13 8.2 18 7.6v4.8L13 11.8 13.8 21h-3.6L11 11.8 6 12.4V7.6l5 .6Z" fill="currentColor" />
      </svg>
    </span>
  </div>
);

/** The serrated edge of a hunter's badge: a saw's teeth round a disc, raked one way. */
const BADGE_EDGE =
  Array.from({ length: 20 }, (_, i) => {
    const a = (i / 20) * Math.PI * 2;
    const b = a + (Math.PI * 2) / 20 * 0.8;
    const point = (angle: number, r: number) => `${(28 + r * Math.sin(angle)).toFixed(2)} ${(52 - r * Math.cos(angle)).toFixed(2)}`;
    return `${i === 0 ? 'M' : 'L'}${point(a, 22)}L${point(b, 26.5)}`;
  }).join('') + 'Z';

/**
 * The level on a hunter's badge: a serrated brass disc hung from a ribbon of the order's colours,
 * the number struck into its dark centre.
 */
const StatusLevel: NonNullable<SettingArt['StatusLevel']> = ({ level }) => (
  <span className="df-badge">
    <svg className="ui-level__art" viewBox="0 0 56 80" aria-hidden>
      <path className="df-badge__ribbon" d="M14 0H42V24L28 30 14 24Z" />
      <path className="df-badge__stripe" d="M25 0H31V27.5L28 29 25 27.5Z" />
      <path className="df-badge__edge" d={BADGE_EDGE} />
      <circle className="df-badge__ring" cx="28" cy="52" r="19" />
      <circle className="df-badge__face" cx="28" cy="52" r="16" />
    </svg>
    <span className="df-badge__level ui-numeric">{level}</span>
  </span>
);

export const DARK_FANTASY_ART: SettingArt = {
  corner: { viewBox: '0 0 24 24', art: <GothicCorner /> },
  crest: { viewBox: '0 0 120 24', art: <ArchCrest /> },
  ruleMark: <CrossRule />,
  // Narrow dagger cross.
  bullet: (filled) => (
    <path d="M7 0.5 8 4.5 11.5 5.5 8 6.5 7 13.5 6 6.5 2.5 5.5 6 4.5Z" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="0.9" strokeLinejoin="round" />
  ),
  // A skull with a candle on it: memento mori.
  Emblem: GiCandleSkull,
  Backdrop,
  LevelReady,
  WorldSigil,
  Flourish,
  HeroReadout,
  StatusLevel,
};
