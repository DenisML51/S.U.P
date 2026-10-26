import React, { useId } from 'react';
import GiFairy from '~icons/game-icons/fairy';
import type { SettingArt } from './types';

/**
 * Fable ornament: Albion as the game draws its HUD — no frames, only light. The mark of everything
 * is the four-pointed sparkle (the quest's star, the fairy's dust); gilt hairlines that fade out at
 * their ends, round plates, a diamond for a count. Behind the screen a storybook glade: a cave of
 * trees and giant mushrooms opening onto sunlit hills and a castle in the haze, the sun's rays
 * coming through, fireflies drifting up out of the grass.
 */

/** A repeatable pseudo-random sequence, so the dust and the motes lie the same on every render. */
const random = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

const f = (n: number) => n.toFixed(1);

/**
 * The sparkle: a four-pointed star with its sides drawn in, centred at (x, y), `r` from the centre
 * to a point; `waist` is how far the sides come in (smaller is thinner).
 */
export const sparkle = (x: number, y: number, r: number, waist = 0.16) => {
  const w = r * waist;
  return `M${f(x)} ${f(y - r)}Q${f(x + w)} ${f(y - w)} ${f(x + r)} ${f(y)}Q${f(x + w)} ${f(y + w)} ${f(x)} ${f(y + r)}Q${f(x - w)} ${f(y + w)} ${f(x - r)} ${f(y)}Q${f(x - w)} ${f(y - w)} ${f(x)} ${f(y - r)}Z`;
};

/** A panel's corner, 24×24: a sparkle on the corner, gilt hairlines leaving it along both edges. */
const SparkleCorner: React.FC = () => (
  <>
    <defs>
      <linearGradient id="fb-corner-x" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="currentColor" />
        <stop offset="1" stopColor="currentColor" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="fb-corner-y" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="currentColor" />
        <stop offset="1" stopColor="currentColor" stopOpacity="0" />
      </linearGradient>
    </defs>
    <path d="M9 1.5H24" stroke="url(#fb-corner-x)" strokeWidth="0.8" />
    <path d="M1.5 9V24" stroke="url(#fb-corner-y)" strokeWidth="0.8" />
    <path d={sparkle(4.5, 4.5, 4.5, 0.14)} fill="currentColor" />
  </>
);

/**
 * The crest on a major panel, 120×24, its middle on the panel's edge: a medallion with the sparkle
 * in it, gilt tendrils curling away to both sides and fading, beads between — the ornament the game
 * hangs under the name of a choice.
 */
const MedallionCrest: React.FC = () => (
  <>
    <defs>
      <linearGradient id="fb-crest-fade" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="currentColor" stopOpacity="0" />
        <stop offset="0.38" stopColor="currentColor" />
        <stop offset="0.62" stopColor="currentColor" />
        <stop offset="1" stopColor="currentColor" stopOpacity="0" />
      </linearGradient>
    </defs>
    <g stroke="url(#fb-crest-fade)" strokeWidth="0.9" fill="none" strokeLinecap="round">
      <path d="M2 12H44C38 12 36 7 40 6S45 9 42 10" />
      <path d="M118 12H76C82 12 84 7 80 6S75 9 78 10" />
      <path d="M22 12C26 15 31 16 35 14" opacity="0.7" />
      <path d="M98 12C94 15 89 16 85 14" opacity="0.7" />
    </g>
    <circle cx="47.5" cy="12" r="1.2" fill="currentColor" />
    <circle cx="72.5" cy="12" r="1.2" fill="currentColor" />
    <circle cx="60" cy="12" r="9.5" fill="rgb(var(--c-surface))" stroke="currentColor" strokeWidth="1" />
    <circle cx="60" cy="12" r="7.6" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.55" />
    <path d={sparkle(60, 12, 6.2, 0.15)} fill="currentColor" />
  </>
);

/** A divider's centre: beads either side of a sparkle, as under the name of a choice. */
const SparkleRule: React.FC = () => (
  <svg width="58" height="14" viewBox="0 0 58 14" aria-hidden>
    <circle cx="13" cy="7" r="1.1" fill="currentColor" opacity="0.7" />
    <circle cx="20" cy="7" r="1.6" fill="currentColor" />
    <path d={sparkle(29, 7, 6.5, 0.15)} fill="currentColor" />
    <circle cx="38" cy="7" r="1.6" fill="currentColor" />
    <circle cx="45" cy="7" r="1.1" fill="currentColor" opacity="0.7" />
  </svg>
);

/**
 * Screen corner, 140×140: a gilt tendril curling out of the corner and fading along both edges, a
 * sparkle where it turns.
 */
const ScreenCorner: React.FC = () => (
  <svg width="140" height="140" viewBox="0 0 140 140" fill="none" aria-hidden>
    <defs>
      <linearGradient id="fb-screen-x" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0.2" stopColor="currentColor" />
        <stop offset="1" stopColor="currentColor" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="fb-screen-y" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0.2" stopColor="currentColor" />
        <stop offset="1" stopColor="currentColor" stopOpacity="0" />
      </linearGradient>
    </defs>
    <path d="M24 4H140" stroke="url(#fb-screen-x)" />
    <path d="M4 24V140" stroke="url(#fb-screen-y)" />
    <path d="M30 10C48 10 58 18 58 30S48 44 40 40S34 28 42 26" stroke="url(#fb-screen-x)" strokeLinecap="round" />
    <path d="M10 30C10 48 18 58 30 58S44 48 40 40" stroke="url(#fb-screen-y)" strokeLinecap="round" />
    <path d={sparkle(14, 14, 9, 0.14)} fill="currentColor" />
    <circle cx="66" cy="10" r="1.4" fill="currentColor" opacity="0.7" />
    <circle cx="10" cy="66" r="1.4" fill="currentColor" opacity="0.7" />
  </svg>
);

/* ------------------------------------------------------------------ Atmosphere */

const DUST_W = 1600;
const DUST_H = 1000;

/** Fireflies and fairy dust: three swarms, most of them low, a few up in the light. */
const MOTES = (() => {
  const next = random(4242);
  return [0, 1, 2].map((swarm) =>
    Array.from({ length: 16 }, () => ({
      x: next() * DUST_W,
      y: DUST_H * (0.3 + next() ** 0.7 * 0.66),
      r: 1.2 + next() * 2.2,
      gold: next() < 0.3,
      delay: -next() * 9 - swarm,
    })),
  );
})();

/** The motes over the screen: the only thing behind it that moves. */
const Motes: React.FC = () => {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox={`0 0 ${DUST_W} ${DUST_H}`} preserveAspectRatio="xMidYMid slice" aria-hidden className="absolute inset-0 h-full w-full">
      <defs>
        <radialGradient id={`${id}-mote`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="rgb(220 255 248)" />
          <stop offset="0.3" stopColor="rgb(120 226 214)" stopOpacity="0.8" />
          <stop offset="1" stopColor="rgb(120 226 214)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-mote-gold`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="rgb(255 250 226)" />
          <stop offset="0.3" stopColor="rgb(246 212 136)" stopOpacity="0.8" />
          <stop offset="1" stopColor="rgb(246 212 136)" stopOpacity="0" />
        </radialGradient>
      </defs>
      {MOTES.map((swarm, i) => (
        <g key={i} className={`fb-motes fb-motes--${i}`}>
          {swarm.map(({ x, y, r, gold, delay }, j) => (
            <circle
              key={j}
              className="fb-mote"
              cx={f(x)}
              cy={f(y)}
              r={f(r * 3)}
              fill={`url(#${id}-${gold ? 'mote-gold' : 'mote'})`}
              style={{ animationDelay: `${delay.toFixed(2)}s` }}
            />
          ))}
        </g>
      ))}
    </svg>
  );
};

/**
 * Albion behind the screen, told by its light alone: the deep sea-green of the wood, warm sunlight
 * falling from above in soft rays, mist along the foot, fireflies and fairy dust drifting up; the
 * edges dim, gilt tendrils in the corners.
 */
const Backdrop: React.FC<{ frame?: boolean }> = ({ frame = true }) => (
  <div className="fb-glade absolute inset-0 overflow-hidden">
    <div className="fb-sun absolute inset-0" />
    <div className="fb-light absolute inset-x-[-10%] top-[-5%] h-[110%]" />
    <div className="fb-mist absolute inset-x-[-20%] bottom-[-4%] h-[42%]" />
    <Motes />
    <div className="fb-veil absolute inset-0" />
    {frame &&
      (['left-0 top-0', 'right-0 top-0 -scale-x-100', 'bottom-0 left-0 -scale-y-100', 'bottom-0 right-0 -scale-100'] as const).map(
        (position) => (
          <div key={position} className={`fb-screen-corner absolute m-4 ${position}`}>
            <ScreenCorner />
          </div>
        ),
      )}
  </div>
);

/* ------------------------------------------------------------------ Level ready */

const READY_W = 272;
const READY_H = 36;

/** The fairy's dust left on the bar: sparkles along it, each lighting up in its turn. */
const DUST = (() => {
  const next = random(77);
  return Array.from({ length: 14 }, (_, i) => ({
    x: 14 + (i / 13) * (READY_W - 28) + (next() - 0.5) * 10,
    y: READY_H / 2 + (next() - 0.5) * 20,
    r: 2.2 + next() * 2.6,
    delay: i * 0.16 + next() * 0.3,
  }));
})();

/**
 * The level is ready: a fairy flies along the bar, a little light with a trail, and the dust it
 * leaves lights up behind it in sparkles, one after another.
 */
const LevelReady: React.FC = () => (
  <svg viewBox={`0 0 ${READY_W} ${READY_H}`} preserveAspectRatio="none" fill="none" aria-hidden className="fb-ready">
    <defs>
      <radialGradient id="fb-fairy" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="rgb(255 250 230)" />
        <stop offset="0.35" stopColor="rgb(246 214 140)" stopOpacity="0.85" />
        <stop offset="1" stopColor="rgb(246 214 140)" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="fb-trail" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="rgb(246 214 140)" stopOpacity="0" />
        <stop offset="1" stopColor="rgb(246 214 140)" stopOpacity="0.8" />
      </linearGradient>
    </defs>
    {DUST.map(({ x, y, r, delay }, i) => (
      <path key={i} className="fb-dust" d={sparkle(x, y, r, 0.16)} fill="rgb(var(--c-frame-bright))" style={{ animationDelay: `${delay.toFixed(2)}s` }} />
    ))}
    <g className="fb-fairy">
      <rect x="-60" y={READY_H / 2 - 1} width="56" height="2" rx="1" fill="url(#fb-trail)" />
      <circle cx="0" cy={READY_H / 2} r="9" fill="url(#fb-fairy)" />
    </g>
  </svg>
);

/* ------------------------------------------------------------------ World card */

/** Sparkles round the sigil's ring, larger at the four quarters. */
const RING_SPARKLES = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
  const r = i % 4 === 0 ? 7 : 3.4;
  return sparkle(Math.cos(a) * 84, Math.sin(a) * 84, r, 0.15);
});

/** The rays of light behind the sigil, long and short in turn. */
const SIGIL_RAYS = Array.from({ length: 24 }, (_, i) => {
  const a = (i / 24) * Math.PI * 2;
  const long = i % 2 === 0 ? 108 : 96;
  const half = 0.035;
  return `M${f(Math.cos(a - half) * 70)} ${f(Math.sin(a - half) * 70)}L${f(Math.cos(a) * long)} ${f(Math.sin(a) * long)}L${f(Math.cos(a + half) * 70)} ${f(Math.sin(a + half) * 70)}Z`;
});

/**
 * A gilt ring round the world card's emblem, as round the book's title: sparkles on the ring, a
 * leafy flourish below, and behind it rays of light that wake and turn when the card is chosen.
 */
const WorldSigil: React.FC = () => (
  <svg viewBox="-110 -110 220 220" fill="none" stroke="currentColor" aria-hidden className="fb-sigil">
    <g className="fb-sigil__rays" fill="currentColor" stroke="none">
      {SIGIL_RAYS.map((d, i) => (
        <path key={i} d={d} opacity={i % 2 ? 0.35 : 0.6} />
      ))}
    </g>
    <circle r="84" strokeWidth="1.1" />
    <circle r="78" strokeWidth="0.5" opacity="0.6" />
    <g fill="currentColor" stroke="none">
      {RING_SPARKLES.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </g>
    <path d="M-34 92C-20 86-10 88 0 98C10 88 20 86 34 92M-20 100C-10 96-4 98 0 104C4 98 10 96 20 100" strokeWidth="0.9" strokeLinecap="round" />
  </svg>
);

/**
 * The world is chosen: a burst of warm light at the card with long rays turning out of it, and a
 * ring of fairy dust thrown out across the screen.
 */
const Flourish: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <svg className="fb-burst" style={{ left: x, top: y }} viewBox="-200 -200 400 400" aria-hidden>
    <defs>
      <radialGradient id="fb-burst-glow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="rgb(255 250 230)" stopOpacity="0.9" />
        <stop offset="0.4" stopColor="rgb(250 226 160)" stopOpacity="0.35" />
        <stop offset="1" stopColor="rgb(250 226 160)" stopOpacity="0" />
      </radialGradient>
    </defs>
    <circle className="fb-burst__glow" r="60" fill="url(#fb-burst-glow)" />
    <g className="fb-burst__rays" fill="rgb(255 238 190)">
      {SIGIL_RAYS.map((d, i) => (
        <path key={i} d={d} transform="scale(1.3)" opacity={i % 2 ? 0.22 : 0.45} />
      ))}
    </g>
    <path className="fb-burst__star" d={sparkle(0, 0, 30, 0.1)} fill="rgb(255 250 232)" />
  </svg>
);

/* ------------------------------------------------------------------ Hero select */

/**
 * What Albion says of a hero, as the game shows a villager's opinion: two words for their
 * reputation, chosen by the hero's id so they stay the same.
 */
const REPUTATIONS = ['Задира', 'Растяпа', 'Умница', 'Сорвиголова', 'Гуляка', 'Легенда', 'Знаменитость', 'Обжора', 'Зануда', 'Душа компании'];

const hashOf = (id: string) => {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
};

/**
 * The opinion card tucked beside the focused hero card: a wine-red card with the reputations in a
 * flowing hand, and a parchment ribbon with the hero's level (or age) across its foot.
 */
const HeroReadout: NonNullable<SettingArt['HeroReadout']> = ({ id, level, age }) => {
  const hash = hashOf(id);
  const first = REPUTATIONS[hash % REPUTATIONS.length];
  const second = REPUTATIONS[(hash >>> 4) % REPUTATIONS.length] === first ? REPUTATIONS[(hash + 3) % REPUTATIONS.length] : REPUTATIONS[(hash >>> 4) % REPUTATIONS.length];
  return (
    <div className="fb-opinion" aria-hidden>
      <span className="fb-opinion__head">Репутация</span>
      <span className="fb-opinion__word">{first}</span>
      <span className="fb-opinion__word fb-opinion__word--late">{second}</span>
      <span className="fb-opinion__ribbon">{age !== undefined ? `Возраст ${age}` : `Уровень ${level}`}</span>
    </div>
  );
};

/* ------------------------------------------------------------------ Status level */

/**
 * The level as the HUD shows a count: a diamond plate, its rim lit, a fine line inside, sparkles at
 * its top and bottom points; the number in the middle.
 */
const StatusLevel: NonNullable<SettingArt['StatusLevel']> = ({ level }) => (
  <span className="fb-diamond">
    <svg className="ui-level__art" viewBox="0 0 64 76" aria-hidden>
      <path className="fb-diamond__plate" d="M32 6 60 38 32 70 4 38Z" />
      <path className="fb-diamond__inner" d="M32 12.5 54.3 38 32 63.5 9.7 38Z" />
      <path className="fb-diamond__spark" d={`${sparkle(32, 5, 5, 0.15)}${sparkle(32, 71, 5, 0.15)}`} />
    </svg>
    <span className="fb-diamond__level ui-numeric">{level}</span>
  </span>
);

export const FABLE_ART: SettingArt = {
  corner: { viewBox: '0 0 24 24', art: <SparkleCorner /> },
  crest: { viewBox: '0 0 120 24', art: <MedallionCrest /> },
  ruleMark: <SparkleRule />,
  // The quest's star: filled for what is in hand, drawn in outline for what is not.
  bullet: (filled) => (
    <path
      d={sparkle(7, 7, 5.6, 0.16)}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 0.9}
      strokeLinejoin="round"
    />
  ),
  // The fairy who leads the hero.
  Emblem: GiFairy,
  Backdrop,
  glass: true,
  LevelReady,
  WorldSigil,
  HeroReadout,
  StatusLevel,
  Flourish,
};
