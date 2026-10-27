import React, { useEffect, useId, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { TableCheck, TableDie } from '@itd/schema';
import { GameIcon } from './GameIcon';
import { DieGlyph, RollingDie } from './RollingDie';
import { OUTCOME_LABEL, checkOutcome, outcomeSucceeded } from './checkOutcome';
import { Astrolabe, STARS } from './art/highFantasy';
import { useSettingArt } from './ornaments';
import { cx } from './primitives';
import { useSetting } from './theme/SettingScope';
import type { Theme } from './theme/settings';

/**
 * A throw laid out as a game lays out a check: what is checked over a framed plate, the number to
 * reach at the plate's head, the dice tumbling in its middle and the outcome under them, the
 * modifier on cards below and the total under a rule. Each setting has its own plate — Fable's gilt
 * arch, the grimdark's tome, the Lands Between's bare veil, a starship's readout — lit softly along
 * its edges, and its own weather behind it.
 */

type Plate = 'arch' | 'fable' | 'tome' | 'veil' | 'hud' | 'cut' | 'deco';

const PLATE: Record<Theme, Plate> = {
  fable: 'fable',
  'high-fantasy': 'arch',
  service: 'arch',
  'elden-ring': 'veil',
  'dark-fantasy': 'tome',
  'sci-fi': 'hud',
  cyberpunk: 'cut',
  lovecraft: 'deco',
};

const ARCH = 'M38 122 C38 52 104 22 180 22 C256 22 322 52 322 122 L322 346 C322 410 256 438 180 438 C104 438 38 410 38 346 Z';

/** The plate's outline on a 360 × 460 grid. */
const OUTLINE: Record<Plate, string> = {
  arch: ARCH,
  fable: 'M58 24 L302 24 Q336 24 336 58 L336 402 Q336 436 302 436 L58 436 Q24 436 24 402 L24 58 Q24 24 58 24 Z',
  tome: 'M40 34 L320 34 L320 432 L40 432 Z',
  veil: 'M0 18 L360 18 L360 442 L0 442 Z',
  hud: 'M64 30 L296 30 L324 58 L324 404 L296 432 L64 432 L36 404 L36 58 Z',
  cut: 'M74 24 L286 24 L316 54 L316 404 L286 434 L74 434 L44 404 L44 54 Z',
  deco: 'M48 96 L48 432 L312 432 L312 96 L290 96 L290 70 L262 70 L262 46 L226 46 L226 24 L134 24 L134 46 L98 46 L98 70 L70 70 L70 96 Z',
};

/** Where the rule between the target and the dice runs. */
const BAND_Y = 172;
/** The middle of the dice. */
const DICE_Y = 278;

const mirrorX = 'matrix(-1 0 0 1 360 0)';
const mirrorY = 'matrix(1 0 0 -1 0 460)';
const mirrorXY = 'matrix(-1 0 0 -1 360 460)';

/** The same flourish at the four corners of the plate. */
const Corners: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>
    <g>{children}</g>
    <g transform={mirrorX}>{children}</g>
    <g transform={mirrorY}>{children}</g>
    <g transform={mirrorXY}>{children}</g>
  </>
);

/** A four-pointed sparkle, Fable's mark. */
const spark = (x: number, y: number, r: number) =>
  `M${x} ${y - r} Q${x + r * 0.16} ${y - r * 0.16} ${x + r} ${y} Q${x + r * 0.16} ${y + r * 0.16} ${x} ${y + r} Q${x - r * 0.16} ${y + r * 0.16} ${x - r} ${y} Q${x - r * 0.16} ${y - r * 0.16} ${x} ${y - r} Z`;

/** High fantasy: hooks curling out of the corners, a band of knots across. */
const ArchOrnaments: React.FC = () => (
  <>
    <Corners>
      <path d="M38 140 C18 140 4 126 4 106 C4 90 16 82 26 88 C34 93 32 104 24 105" className="ui-check__hair" />
      <path d="M50 84 C34 70 36 48 54 38" className="ui-check__hair" />
      <circle cx="24" cy="105" r="2.6" className="ui-check__dot" />
    </Corners>
    <path d={`M30 ${BAND_Y - 6} L330 ${BAND_Y - 6} M30 ${BAND_Y + 6} L330 ${BAND_Y + 6}`} className="ui-check__hair" />
    <path
      d={Array.from({ length: 25 }, (_, i) => {
        const x = 42.5 + i * 11;
        return `M${x} ${BAND_Y} L${x + 5.5} ${BAND_Y - 4} L${x + 11} ${BAND_Y} L${x + 5.5} ${BAND_Y + 4} Z`;
      }).join(' ')}
      className="ui-check__knot"
    />
    {[28, 332].map((x) => (
      <circle key={x} cx={x} cy={BAND_Y} r="6" className="ui-check__stud" />
    ))}
    <path d="M180 10 L186 18 L180 26 L174 18 Z" className="ui-check__stud" />
  </>
);

/**
 * Fable: a pane of the storybook's sea-green glass with no frame round it — a gilt hairline over and
 * under it that fades out at its ends, the setting's own medallion crest on top and sparkle corners,
 * its sparkle rule under the difficulty.
 */
const FableOrnaments: React.FC = () => {
  const art = useSettingArt();
  return (
    <>
      {[24, 436].map((y) => (
        <g key={y}>
          <rect x="30" y={y - 0.6} width="300" height="1.2" className="ui-check__gilt-fade" />
          {y === 436 && <path d={spark(180, y, 7)} className="ui-check__spark" />}
        </g>
      ))}
      {art.crest && (
        <svg x="96" y="9" width="168" height="34" viewBox={art.crest.viewBox} className="ui-check__art">
          {art.crest.art}
        </svg>
      )}
      {art.corner && (
        <Corners>
          <svg x="29" y="29" width="40" height="40" viewBox={art.corner.viewBox} className="ui-check__art">
            {art.corner.art}
          </svg>
        </Corners>
      )}
      <rect x="70" y={BAND_Y + 6.4} width="220" height="0.8" className="ui-check__gilt-fade ui-check__gilt-fade--faint" />
      <g transform={`translate(151 ${BAND_Y - 7})`} className="ui-check__art">
        {art.ruleMark}
      </g>
    </>
  );
};

/** The grimdark's tome: the setting's own gothic corners and arched crest, a cross on the rule. */
const TomeOrnaments: React.FC = () => {
  const art = useSettingArt();
  return (
    <>
      <path d="M50 44 L310 44 L310 422 L50 422 Z" className="ui-check__inner-line" />
      {art.corner && (
        <Corners>
          <svg x="30" y="24" width="46" height="46" viewBox={art.corner.viewBox} className="ui-check__art">
            {art.corner.art}
          </svg>
        </Corners>
      )}
      {art.crest && (
        <svg x="70" y="-6" width="220" height="44" viewBox={art.crest.viewBox} className="ui-check__art">
          {art.crest.art}
        </svg>
      )}
      <path d={`M58 ${BAND_Y} L150 ${BAND_Y} M210 ${BAND_Y} L302 ${BAND_Y}`} className="ui-check__hair" />
      <g transform={`translate(151 ${BAND_Y - 7})`} className="ui-check__art">
        {art.ruleMark}
      </g>
    </>
  );
};

/** The Lands Between: no frame at all — gilt hairlines fading out at both ends, a lozenge on each. */
const VeilOrnaments: React.FC<{ id: string }> = ({ id }) => (
  <>
    <defs>
      <linearGradient id={`${id}-fade`} x1="0" x2="1">
        <stop offset="0" stopColor="currentColor" stopOpacity="0" />
        <stop offset="0.5" stopColor="currentColor" stopOpacity="1" />
        <stop offset="1" stopColor="currentColor" stopOpacity="0" />
      </linearGradient>
    </defs>
    {[18, 24, BAND_Y, 436, 442].map((y) => (
      <rect key={y} x="10" y={y - 0.5} width="340" height={y === 24 || y === 436 ? 0.6 : 1.2} fill={`url(#${id}-fade)`} className="ui-check__veil-line" />
    ))}
    {[21, BAND_Y, 439].map((y) => (
      <path key={y} d={`M180 ${y - 6} L185 ${y} L180 ${y + 6} L175 ${y} Z`} className="ui-check__stud" />
    ))}
  </>
);

/** A starship's readout: brackets standing off the corners, tick ladders, a reticle round the dice. */
const HudOrnaments: React.FC = () => (
  <>
    <Corners>
      <path d="M22 70 L22 16 L76 16" className="ui-check__hair" />
      <path d="M22 16 L30 16 L22 24 Z" className="ui-check__stud" />
    </Corners>
    {[36, 324].map((x) => (
      <path
        key={x}
        d={Array.from({ length: 13 }, (_, i) => `M${x} ${206 + i * 12} L${x + (x < 180 ? -(i % 4 ? 5 : 10) : i % 4 ? 5 : 10)} ${206 + i * 12}`).join(' ')}
        className="ui-check__hair ui-check__hair--thin"
      />
    ))}
    <path d={`M36 ${BAND_Y} L148 ${BAND_Y} M212 ${BAND_Y} L324 ${BAND_Y}`} className="ui-check__hair ui-check__hair--thin" />
    {[156, 166, 176, 186, 196].map((x, i) => (
      <rect key={x} x={x} y={BAND_Y - 2.5} width="7" height="5" className={cx('ui-check__segment', i < 3 && 'ui-check__segment--on')} />
    ))}
    {/* The reticle: a ring with four ticks, an arc turning round it. */}
    <circle cx="180" cy={DICE_Y} r="76" className="ui-check__hair ui-check__hair--thin" />
    {[0, 90, 180, 270].map((turn) => (
      <path key={turn} d={`M180 ${DICE_Y - 84} L180 ${DICE_Y - 70}`} transform={`rotate(${turn} 180 ${DICE_Y})`} className="ui-check__hair" />
    ))}
    <circle cx="180" cy={DICE_Y} r="86" className="ui-check__reticle-arc" style={{ transformOrigin: `180px ${DICE_Y}px` }} />
    <path d="M128 30 L140 18 L220 18 L232 30" className="ui-check__hair" />
  </>
);

const CutOrnaments: React.FC = () => (
  <>
    {[44, 316].map((x) => (
      <path
        key={x}
        d={Array.from({ length: 9 }, (_, i) => `M${x} ${210 + i * 18} L${x + (x < 180 ? -8 : 8)} ${210 + i * 18}`).join(' ')}
        className="ui-check__hair"
      />
    ))}
    <Corners>
      <path d="M60 14 L30 14 L30 44" className="ui-check__hair" />
    </Corners>
    <path d={`M44 ${BAND_Y} L150 ${BAND_Y} M210 ${BAND_Y} L316 ${BAND_Y}`} className="ui-check__hair" />
    <path d={`M156 ${BAND_Y - 4} L204 ${BAND_Y - 4} L204 ${BAND_Y + 4} L156 ${BAND_Y + 4} Z`} className="ui-check__stud" />
    <path
      d={Array.from({ length: 5 }, (_, i) => `M${250 + i * 9} 24 L${262 + i * 9} 24 L${254 + i * 9} 34 L${242 + i * 9} 34 Z`).join(' ')}
      className="ui-check__stud"
    />
  </>
);

const DecoOrnaments: React.FC = () => (
  <>
    <path
      d={Array.from({ length: 11 }, (_, i) => {
        const a = Math.PI * (0.12 + (i * 0.76) / 10);
        return `M${180 - Math.cos(a) * 30} ${BAND_Y - 10 - Math.sin(a) * 30} L${180 - Math.cos(a) * 112} ${BAND_Y - 10 - Math.sin(a) * 112}`;
      }).join(' ')}
      className="ui-check__hair ui-check__rays"
    />
    <path d={`M48 ${BAND_Y - 6} L312 ${BAND_Y - 6} M48 ${BAND_Y} L312 ${BAND_Y} M48 ${BAND_Y + 6} L312 ${BAND_Y + 6}`} className="ui-check__hair" />
    <Corners>
      <path d="M48 432 L30 450 M48 412 L20 440" className="ui-check__hair" />
    </Corners>
  </>
);

/**
 * The light along the plate's edge: a soft halo round the line and a glow gathering inside it, so
 * the plate reads as lit glass rather than a drawn outline.
 */
const EdgeLight: React.FC<{ id: string; d: string }> = ({ id, d }) => (
  <>
    <defs>
      <filter id={`${id}-halo`} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="5" />
      </filter>
      <filter id={`${id}-rim`} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="16" />
      </filter>
      <clipPath id={`${id}-inside`}>
        <path d={d} />
      </clipPath>
    </defs>
    <g clipPath={`url(#${id}-inside)`}>
      <path d={d} className="ui-check__rim" filter={`url(#${id}-rim)`} />
    </g>
    <path d={d} className="ui-check__halo" filter={`url(#${id}-halo)`} />
  </>
);

/** The plate itself, drawn in as it appears. */
const Frame: React.FC<{ plate: Plate }> = ({ plate }) => {
  const id = useId().replace(/:/g, '');
  const still = !!useReducedMotion();
  const d = OUTLINE[plate];
  const draw = still
    ? {}
    : { initial: { pathLength: 0, opacity: 0 }, animate: { pathLength: 1, opacity: 1 }, transition: { duration: 1, ease: [0.4, 0, 0.2, 1] as const } };
  return (
    <svg viewBox="0 0 360 460" className="ui-check__frame" aria-hidden>
      <defs>
        <linearGradient id={`${id}-fade`} x1="0" x2="1">
          <stop offset="0" stopColor="rgb(var(--c-frame-bright))" stopOpacity="0" />
          <stop offset="0.5" stopColor="rgb(255 241 200)" />
          <stop offset="1" stopColor="rgb(var(--c-frame-bright))" stopOpacity="0" />
        </linearGradient>
      </defs>
      {plate !== 'veil' && <EdgeLight id={id} d={d} />}
      {plate !== 'veil' && plate !== 'fable' && <motion.path d={d} className="ui-check__line" {...draw} />}
      {(plate === 'arch' || plate === 'cut' || plate === 'deco' || plate === 'hud') && (
        <path d={d} className="ui-check__inner" transform="translate(180 230) scale(0.95 0.965) translate(-180 -230)" />
      )}
      <motion.g
        initial={still ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: still ? 0 : 0.45 }}
        style={plate === 'fable' ? ({ '--gilt-fade': `url(#${id}-fade)` } as React.CSSProperties) : undefined}
      >
        {plate === 'arch' && <ArchOrnaments />}
        {plate === 'fable' && <FableOrnaments />}
        {plate === 'tome' && <TomeOrnaments />}
        {plate === 'veil' && <VeilOrnaments id={id} />}
        {plate === 'hud' && <HudOrnaments />}
        {plate === 'cut' && <CutOrnaments />}
        {plate === 'deco' && <DecoOrnaments />}
      </motion.g>
    </svg>
  );
};

/** A repeatable pseudo-random sequence, so the weather is the same on every render. */
const random = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

/** Motes adrift: their place, size, softness and the beat they keep. */
const motes = (count: number, seed: number) => {
  const next = random(seed);
  return Array.from({ length: count }, () => ({
    x: next() * 100,
    y: next() * 100,
    size: 1.5 + next() * 4.5,
    blur: next() < 0.35 ? 1 + next() * 2.5 : 0,
    delay: -next() * 8,
    duration: 6 + next() * 7,
  }));
};
const DUST = motes(34, 7);
const RISING = motes(26, 31);

const Motes: React.FC<{ list: ReturnType<typeof motes> }> = ({ list }) => (
  <>
    {list.map((mote, i) => (
      <span
        key={i}
        className="ui-check-aura__mote"
        style={{
          left: `${mote.x}%`,
          top: `${mote.y}%`,
          width: mote.size,
          height: mote.size,
          filter: mote.blur ? `blur(${mote.blur}px)` : undefined,
          animationDelay: `${mote.delay}s`,
          animationDuration: `${mote.duration}s`,
        }}
      />
    ))}
  </>
);

/** A four-pointed star of the atlas. */
const starPoint = (x: number, y: number, r: number) =>
  `M${x} ${y - r} L${x + r * 0.28} ${y - r * 0.28} L${x + r} ${y} L${x + r * 0.28} ${y + r * 0.28} L${x} ${y + r} L${x - r * 0.28} ${y + r * 0.28} L${x - r} ${y} L${x - r * 0.28} ${y - r * 0.28} Z`;

/** Constellations round the plate, in the margins where the plate leaves the sky. */
const CONSTELLATIONS: { stars: [number, number][] }[] = [
  { stars: [[34, 96], [58, 70], [86, 82], [104, 52]] },
  { stars: [[300, 60], [326, 92], [356, 84], [372, 118], [348, 140]] },
  { stars: [[30, 330], [52, 360], [40, 398], [72, 420]] },
  { stars: [[318, 380], [350, 362], [372, 396], [342, 430]] },
  { stars: [[150, 488], [184, 500], [222, 486], [250, 504]] },
];

/** The setting's weather behind a moment (a check's plate, a new level): half-seen, so the table shows through. */
export const SettingAura: React.FC<{ setting: Theme }> = ({ setting }) => {
  const id = useId().replace(/:/g, '');
  switch (setting) {
    case 'lovecraft':
      // The table of Lovecraft keeps a check bare: nothing behind the plate.
      return null;
    case 'high-fantasy':
    case 'service':
      // The atlas of the sky the setting's screens are drawn on: its astrolabe turning slowly round
      // the plate, a field of stars, constellations lit star by star.
      return (
        <span className="ui-check-aura ui-check-aura--sky" aria-hidden>
          <span className="ui-check-aura__stars" style={{ background: STARS }} />
          <span className="ui-check-aura__astrolabe">
            <Astrolabe />
          </span>
          <svg viewBox="0 0 400 520" preserveAspectRatio="xMidYMid meet" className="ui-check-aura__constellations">
            {CONSTELLATIONS.map((c, i) => (
              <g key={i}>
                <path d={`M${c.stars.map(([x, y]) => `${x} ${y}`).join(' L')}`} className="ui-check-aura__lines" style={{ animationDelay: `${i * 0.6}s` }} />
                {c.stars.map(([x, y], j) => (
                  <path key={j} d={starPoint(x, y, j === 0 ? 4.2 : 2.8)} className="ui-check-aura__star" style={{ animationDelay: `${-(i * 1.3 + j * 0.7)}s` }} />
                ))}
              </g>
            ))}
          </svg>
        </span>
      );
    case 'elden-ring':
      // Grace: a golden haze, motes of it rising slowly.
      return (
        <span className="ui-check-aura ui-check-aura--grace" aria-hidden>
          <Motes list={RISING} />
        </span>
      );
    case 'sci-fi':
      // A projection's glow over a faint grid of points, its scanlines.
      return <span className="ui-check-aura ui-check-aura--holo" aria-hidden />;
    case 'cyberpunk':
      return (
        <span className="ui-check-aura ui-check-aura--neon" aria-hidden>
          <span className="ui-check-aura__bands" />
        </span>
      );
    case 'dark-fantasy':
      // Smoke curling from below, embers rising through it, a fire's red light under it all.
      return (
        <span className="ui-check-aura ui-check-aura--embers" aria-hidden>
          <svg viewBox="0 0 400 520" preserveAspectRatio="none">
            <defs>
              <filter id={`${id}-smoke`} x="-20%" y="-20%" width="140%" height="140%">
                <feTurbulence type="fractalNoise" baseFrequency="0.011 0.02" numOctaves="4" seed="21">
                  <animate attributeName="baseFrequency" dur="16s" values="0.011 0.02;0.015 0.016;0.011 0.02" repeatCount="indefinite" />
                </feTurbulence>
                <feColorMatrix values="0 0 0 0 0.08  0 0 0 0 0.05  0 0 0 0 0.04  0 0 0 1.4 -0.45" />
                <feGaussianBlur stdDeviation="2" />
              </filter>
              <radialGradient id={`${id}-clear`} cx="50%" cy="48%" r="50%">
                <stop offset="0.3" stopColor="#000" />
                <stop offset="0.62" stopColor="#fff" />
                <stop offset="0.98" stopColor="#000" />
              </radialGradient>
              <mask id={`${id}-edges`}>
                <rect width="400" height="520" fill={`url(#${id}-clear)`} />
              </mask>
            </defs>
            <rect width="400" height="520" filter={`url(#${id}-smoke)`} mask={`url(#${id}-edges)`} className="ui-check-aura__smoke" />
          </svg>
          <Motes list={RISING} />
        </span>
      );
    default:
      // Fable's fairy dust drifting in a shaft of light.
      return (
        <span className="ui-check-aura ui-check-aura--dust" aria-hidden>
          <span className="ui-check-aura__shaft" />
          <Motes list={DUST} />
        </span>
      );
  }
};

/** The edge of a die on the plate: large alone, smaller as the handful grows. */
const dieSize = (count: number) => (count <= 1 ? '7.5rem' : count <= 2 ? '5.5rem' : count <= 4 ? '4rem' : count <= 8 ? '2.9rem' : '2.2rem');

const STAGGER_MS = 120;

const signed = (n: number) => (n >= 0 ? `+${n}` : `−${-n}`);

/** One source of a bonus, on its own card: an ability, proficiency, a feature. */
export interface CheckPart {
  label: string;
  value: number;
  icon: string;
}

export const CheckPanel: React.FC<{
  /** What is checked, or the throw's formula. */
  title: string;
  /** Who threw and how ("Бросок мастера · 1d20 + 5"). */
  subtitle?: string;
  /** The thrown dice; none while the plate waits for the player's click. */
  dice: TableDie[];
  check: TableCheck | null;
  /** Where the bonus comes from; one card for the whole modifier when not told. */
  parts?: CheckPart[];
  /** The plate waits for a throw: the die is a button. */
  onRoll?: () => void;
  /** Two dice for a call with advantage or disadvantage. */
  pair?: 'advantage' | 'disadvantage';
  className?: string;
}> = ({ title, subtitle, dice, check, parts, onRoll, pair, className }) => {
  const setting = useSetting();
  const plate = PLATE[setting];
  /**
   * The throw's beats: the dice in the air; down, showing what they rolled; the kept die swelling
   * and settling as its number becomes the total with every bonus; then, only then, the verdict.
   */
  const [phase, setPhase] = useState<'air' | 'natural' | 'pulse' | 'verdict'>('air');
  const [swapped, setSwapped] = useState(false);
  const landed = phase === 'verdict';
  const waiting = !!onRoll && dice.length === 0;
  const outcome = check && !waiting ? checkOutcome(check) : null;
  const size = dieSize(waiting ? (pair ? 2 : 1) : dice.length);
  const counted = dice.filter((die) => !die.dropped).reduce((sum, die) => sum + die.value, 0);
  const total = check?.total ?? counted;
  const bonus = check?.bonus ?? 0;
  // A throw against a target takes its outcome's colour, on the dice and the total.
  const tone = outcome ? (outcomeSucceeded(outcome) ? 'success' : 'danger') : undefined;
  // The die that takes the total: the one that counts, when it alone counts and a bonus changes it.
  const kept = dice.filter((die) => !die.dropped);
  const swapIndex = kept.length === 1 && bonus !== 0 && check ? dice.indexOf(kept[0]!) : -1;

  useEffect(() => {
    if (phase === 'natural') {
      const timer = window.setTimeout(() => setPhase(swapIndex >= 0 ? 'pulse' : 'verdict'), 650);
      return () => window.clearTimeout(timer);
    }
    if (phase === 'pulse') {
      const swap = window.setTimeout(() => setSwapped(true), 300);
      const done = window.setTimeout(() => setPhase('verdict'), 800);
      return () => {
        window.clearTimeout(swap);
        window.clearTimeout(done);
      };
    }
  }, [phase, swapIndex]);

  const cards: CheckPart[] = parts ?? (bonus !== 0 ? [{ label: 'Модификатор', value: bonus, icon: 'rolling-dices' }] : []);

  return (
    <div className={cx('ui-check', `ui-check--${plate}`, className)} data-landed={landed || undefined} data-outcome={landed ? outcome ?? undefined : undefined}>
      <SettingAura setting={setting} />
      <motion.div
        className="ui-check__head"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1 }}
      >
        <div className="ui-check__title ui-display">{title}</div>
        {subtitle && <div className="ui-check__subtitle">{subtitle}</div>}
      </motion.div>

      <motion.div
        className="ui-check__plate-box"
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="ui-check__glass" style={{ clipPath: `path('${OUTLINE[plate]}')` }} aria-hidden />
        <Frame plate={plate} />
        <div className="ui-check__target">
          {check?.target !== undefined ? (
            <>
              <span className="ui-check__target-label">{check.under ? 'Навык' : 'Сложность'}</span>
              <span className="ui-check__target-value ui-display ui-numeric">{check.target}</span>
            </>
          ) : (
            <span className="ui-check__target-label">Бросок</span>
          )}
        </div>
        <div className="ui-check__dice">
          {waiting && (
            <button type="button" className="ui-check__die-button" onClick={onRoll} aria-label="Бросить кубик">
              {Array.from({ length: pair ? 2 : 1 }, (_, i) => (
                <span key={i} style={{ width: size, height: size }} className="ui-check__idle-die">
                  <DieGlyph sides={20} spin={0.5} phase={i * 1.7} />
                </span>
              ))}
            </button>
          )}
          {dice.map((die, index) => (
            <motion.span
              key={index}
              className="inline-flex"
              initial={false}
              animate={index === swapIndex && phase === 'pulse' ? { scale: [1, 1.22, 1] } : { scale: 1 }}
              transition={{ duration: 0.65, times: [0, 0.45, 1], ease: 'easeInOut' }}
            >
              <RollingDie
                sides={die.sides}
                value={index === swapIndex && swapped ? total : (die.label ?? die.value)}
                dropped={die.dropped}
                size={size}
                delay={index * STAGGER_MS}
                phase={index * 1.3 + die.sides * 0.1}
                tone={
                  die.label
                    ? undefined
                    : die.value === die.sides && die.sides > 2
                      ? 'success'
                      : die.value === 1
                        ? 'danger'
                        : landed
                          ? tone
                          : undefined
                }
                onLanded={index === dice.length - 1 ? () => setPhase('natural') : undefined}
              />
            </motion.span>
          ))}
        </div>
        {/* The verdict, written on the plate with no box round it; the Lands Between let its light ring out. */}
        <div className="ui-check__verdict-row">
          <motion.span
            key={landed ? 'landed' : 'rolling'}
            className={cx(
              'ui-check__verdict',
              waiting && 'ui-check__verdict--prompt',
              landed && outcome && (outcomeSucceeded(outcome) ? 'ui-check__verdict--success' : 'ui-check__verdict--failure'),
            )}
            initial={landed ? { opacity: 0, scale: 1.18, filter: 'blur(6px)' } : { opacity: 0 }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={landed ? { duration: 0.7, ease: [0.22, 1, 0.36, 1] } : { duration: 0.3, delay: 0.4 }}
          >
            {waiting
              ? pair === 'advantage'
                ? 'Нажмите на кубики · преимущество'
                : pair === 'disadvantage'
                  ? 'Нажмите на кубики · помеха'
                  : 'Нажмите на кубик'
              : landed
                ? outcome
                  ? OUTCOME_LABEL[outcome]
                  : `Итог ${total}`
                : // While the dice are in the air, nothing: the plate waits for them.
                  ''}
            {landed && outcome && <span className="ui-check__verdict-echo">{OUTCOME_LABEL[outcome]}</span>}
          </motion.span>
        </div>
      </motion.div>

      {cards.length > 0 && (
        <div className="ui-check__cards">
          {cards.map((card, i) => (
            <motion.span
              key={card.label}
              className="ui-check__card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.35 + i * 0.08 }}
            >
              <span className="ui-check__card-value ui-numeric">{signed(card.value)}</span>
              <GameIcon name={card.icon} kind="ability" size={34} className="ui-check__card-icon" />
              <span className="ui-check__card-label">{card.label}</span>
            </motion.span>
          ))}
        </div>
      )}

      <motion.div
        className="ui-check__total"
        initial={{ opacity: 0 }}
        animate={{ opacity: landed || waiting ? 1 : 0.55 }}
        transition={{ duration: 0.4 }}
      >
        <span>{waiting ? 'Общий бонус' : 'Итог'}</span>
        <motion.span
          className={cx('ui-check__total-value ui-numeric', landed && tone && `ui-check__total-value--${tone}`)}
          initial={false}
          animate={landed || waiting ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }}
          transition={{ type: 'spring', stiffness: 420, damping: 18 }}
        >
          {waiting ? signed(bonus) : total}
        </motion.span>
      </motion.div>
    </div>
  );
};
