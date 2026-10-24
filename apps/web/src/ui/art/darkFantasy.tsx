import React from 'react';
import GiCandleSkull from '~icons/game-icons/candle-skull';
import type { SettingArt } from './types';

/**
 * Dark fantasy ornament: a hunter's reliquary (Bloodborne's Yharnam, the Imperium's iron, Dragon
 * Age's tooled leather). Tarnished brass engraved in double rules, gothic spikes and rivets at the
 * corners, a pointed arch over major panels, the cross pattée and daggers; behind the screen a
 * great rose window engraved in brass, candlelight, fog and embers.
 */

/** Engraved corner, 24×24: a double rule, a spike pointing inwards, a rivet where the rules meet. */
const GothicCorner: React.FC = () => (
  <>
    <path d="M0.75 17V0.75H17" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path d="M4.5 10V4.5H10" fill="none" stroke="currentColor" strokeWidth="0.7" opacity="0.75" />
    <path d="M4.5 4.5 11.5 8.2 8.2 11.5Z" fill="currentColor" />
    <circle cx="2.6" cy="2.6" r="1.5" fill="currentColor" />
    <circle cx="2.6" cy="2.6" r="0.6" fill="rgb(var(--c-bg-deep))" />
  </>
);

/** A pointed arch rising over the top edge of a major panel, 120×24, the edge along y = 20. */
const ArchCrest: React.FC = () => (
  <>
    <path d="M14 20H44M76 20H106" stroke="currentColor" strokeWidth="2.2" opacity="0.7" />
    <path d="M14 20 10 17.5 14 15M106 20 110 17.5 106 15" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.7" />
    <path d="M44 20C48 20 54 14 60 3 66 14 72 20 76 20Z" fill="rgb(var(--c-surface))" stroke="currentColor" strokeWidth="1" />
    <path d="M50 20C53 19 57 15 60 9 63 15 67 19 70 20" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.7" />
    <path d="M60 11.5V20M56.5 15H63.5" stroke="rgb(var(--c-accent))" strokeWidth="1.4" />
    <circle cx="60" cy="1.6" r="1.6" fill="currentColor" />
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
 * Inside a cathedral at night: a great rose window engraved in brass, half out of sight at the
 * left, candlelight breathing behind it; fog along the floor, embers rising, the dark pressing in
 * from the edges and an engraved frame closing the screen.
 */
const Backdrop: React.FC<{ frame?: boolean }> = ({ frame = true }) => (
  <div className="absolute inset-0 text-frame">
    <div className="df-candlelight absolute inset-0" />
    <div className="absolute left-0 top-1/2 aspect-square h-[100%] -translate-x-[34%] -translate-y-1/2 opacity-[0.26]">
      <RoseWindow />
    </div>
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
 * The focused hero card set like a relic: a pointed brass arch rises over its top edge and a wax
 * seal is pressed on its corner, as the card comes forward.
 */
const HeroReadout: NonNullable<SettingArt['HeroReadout']> = () => (
  <>
    <svg className="df-arch" viewBox="0 0 120 24" aria-hidden>
      <ArchCrest />
    </svg>
    <Seal />
  </>
);

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
};
