import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useMomentStore, type LevelUpMoment } from '../store/useMomentStore';
import { SettingAura } from './CheckPanel';
import { cx } from './primitives';
import { SettingScope } from './theme/SettingScope';
import type { Theme } from './theme/settings';

/**
 * A new level, played in the middle of the screen: the setting's emblem drawn in and lit along its
 * edge, the old number giving way to the new one, the words of the moment said the setting's way —
 * written by hand, rung out on a black band, typed on a readout — then
 * "2 » 3" and what the level brought, row by row. A click (or a few seconds) lets it go.
 */

type Emblem = 'ring' | 'none' | 'hex' | 'sigil';
/** How the words of the moment are said. */
type Words = 'script' | 'banner' | 'typed' | 'plain';

const VARIANT: Record<Theme, { emblem: Emblem; words: Words; text: string }> = {
  service: { emblem: 'ring', words: 'script', text: 'Новый уровень' },
  fable: { emblem: 'ring', words: 'script', text: 'Новый уровень' },
  'elden-ring': { emblem: 'none', words: 'banner', text: 'Уровень повышен' },
  'sci-fi': { emblem: 'hex', words: 'typed', text: 'Уровень повышен' },
  lovecraft: { emblem: 'sigil', words: 'plain', text: 'Знание растёт' },
};

/** The beats of the moment, in seconds from its start. */
const BEAT = { draw: 0.1, swap: 0.85, words: 1.05, step: 1.6, gains: 1.85 };
const SHOWN_MS = 6400;
/** A prelude settles once its number and words are in. */
const DOCK_MS = 2600;
/**
 * The settled emblem: the height it shrinks to and where its centre stands — on the top edge of the
 * level-up window, which keeps its top there and a round opening (`hole`, its radius) under it.
 */
export const LEVEL_DOCK = { size: 112, y: 76, hole: 55 };

const points = (n: number, r: number, turn = -90) =>
  Array.from({ length: n }, (_, i) => {
    const a = ((turn + (360 / n) * i) * Math.PI) / 180;
    return `${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`;
  });

/** An arc of a circle from one angle to another, in degrees from the top. */
const arc = (r: number, from: number, to: number) => {
  const at = (deg: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return `${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)}`;
  };
  return `M${at(from)} A${r} ${r} 0 0 1 ${at(to)}`;
};

/** Each emblem on a 300 × 300 grid round its centre: the outline, an inner line, its fine work. */
const EMBLEM: Record<Exclude<Emblem, 'none'>, { outline: string; inner?: string; detail?: React.ReactNode }> = {
  ring: {
    outline: 'M0 -118 A118 118 0 1 1 -0.1 -118 Z',
    inner: 'M0 -104 A104 104 0 1 1 -0.1 -104 Z',
    detail: (
      <>
        <circle r="140" className="ui-level-burst__dots" />
        {[0, 90, 180, 270].map((turn) => (
          <path key={turn} d="M0 -132 L4 -122 L0 -112 L-4 -122 Z" transform={`rotate(${turn})`} className="ui-level-burst__stud" />
        ))}
        <path d="M-20 116 C-60 140 -100 120 -108 86 C-112 70 -98 62 -90 72" className="ui-level-burst__hair" />
        <path d="M20 116 C60 140 100 120 108 86 C112 70 98 62 90 72" className="ui-level-burst__hair" />
      </>
    ),
  },
  hex: {
    outline: `M${points(6, 124).join(' L')} Z`,
    inner: `M${points(6, 110).join(' L')} Z`,
    detail: (
      <>
        {/* A ring of segments lighting one after another, as a readout fills. */}
        {Array.from({ length: 36 }, (_, i) => (
          <path
            key={i}
            d={arc(142, i * 10 + 1.5, i * 10 + 8.5)}
            className="ui-level-burst__segment"
            style={{ animationDelay: `${0.25 + i * 0.022}s` }}
          />
        ))}
        {[30, 90, 150, 210, 270, 330].map((turn) => (
          <path key={turn} d="M0 -124 L0 -134" transform={`rotate(${turn})`} className="ui-level-burst__hair" />
        ))}
      </>
    ),
  },
  sigil: {
    outline: 'M0 -126 A126 126 0 1 1 -0.1 -126 Z',
    detail: <path d={`M${[0, 2, 4, 1, 3].map((i) => points(5, 116)[i]).join(' L')} Z`} className="ui-level-burst__faint" />,
  },
};

/** Sparks thrown out of the middle as the new number lands. */
const SPARKS = Array.from({ length: 26 }, (_, i) => {
  const a = (i / 26) * Math.PI * 2 + (i % 3) * 0.21;
  const d = 120 + ((i * 47) % 90);
  return { x: Math.cos(a) * d, y: Math.sin(a) * d, size: 2 + (i % 4), delay: (i % 5) * 0.03 };
});

/**
 * A tentacle along +x from its root at the origin: its spine swings in a wave and coils at the tip,
 * the limb tapers from a thick root, and suckers run along its underside.
 */
const tentacle = (length: number, width: number, sway: number, curl: number) => {
  const steps = 48;
  const spine: { x: number; y: number; a: number; t: number }[] = [];
  let x = 0;
  let y = 0;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const a = sway * Math.sin(t * Math.PI * 1.5) + curl * t ** 3 * Math.PI * 2.1;
    spine.push({ x, y, a, t });
    x += (Math.cos(a) * length) / steps;
    y += (Math.sin(a) * length) / steps;
  }
  const w = (t: number) => width * (1 - t) ** 0.85 + 0.5;
  const side = (k: number) => spine.map((p) => `${(p.x - Math.sin(p.a) * w(p.t) * k).toFixed(1)} ${(p.y + Math.cos(p.a) * w(p.t) * k).toFixed(1)}`);
  const d = `M${side(1).join(' L')} L${side(-1).reverse().join(' L')} Z`;
  // Suckers on the side the tip coils towards.
  const under = curl > 0 ? 1 : -1;
  const suckers = spine
    .filter((p, i) => i % 3 === 0 && p.t > 0.1 && p.t < 0.78)
    .map((p) => ({
      x: p.x - Math.sin(p.a) * w(p.t) * 0.5 * under,
      y: p.y + Math.cos(p.a) * w(p.t) * 0.5 * under,
      r: Math.max(0.9, w(p.t) * 0.3),
    }));
  return { d, suckers };
};

/** One side's limbs, top to bottom: where each roots on the circle and its build. */
const LIMBS = [
  { turn: 52, length: 150, width: 12, sway: 0.34, curl: 0.62 },
  { turn: 82, length: 172, width: 13, sway: 0.3, curl: 0.58 },
  { turn: 112, length: 164, width: 13, sway: 0.32, curl: 0.6 },
  { turn: 142, length: 140, width: 11, sway: 0.36, curl: 0.66 },
];

/**
 * The tentacles crawling out of the sigil's circle, four on each side — the left a mirror of the
 * right, evenly spaced, clear of the eye above and the words below — each coiling away from them.
 */
const SIGIL_TENTACLES = [1, -1].flatMap((side) =>
  LIMBS.map((limb, i) => {
    const turn = side > 0 ? limb.turn : 360 - limb.turn;
    const a = ((turn - 90) * Math.PI) / 180;
    return {
      x: Math.cos(a) * 125,
      y: Math.sin(a) * 125,
      turn: turn - 90,
      limb: tentacle(limb.length, limb.width, -side * limb.sway, -side * limb.curl),
      delay: i * 0.08,
      sway: 4,
    };
  }),
);

/** Tentacles growing out of the circle as the number changes, then swaying, lit by a sick glow. */
const Tentacles: React.FC<{ delay: number; still: boolean }> = ({ delay, still }) => (
  <>
    <circle r="190" className="ui-level-burst__eldritch" />
    {(['aura', 'glow', 'flesh'] as const).map((layer) => (
      <g key={layer} className={`ui-level-burst__tentacles ui-level-burst__tentacles--${layer}`}>
        {SIGIL_TENTACLES.map((t, i) => (
          <g key={i} transform={`translate(${t.x.toFixed(1)} ${t.y.toFixed(1)}) rotate(${t.turn})`}>
            <g transform={still ? undefined : 'scale(0)'}>
              {!still && (
                <>
                  <animateTransform
                    attributeName="transform"
                    type="scale"
                    from="0"
                    to="1"
                    begin={`${(delay + t.delay).toFixed(2)}s`}
                    dur="1.3s"
                    fill="freeze"
                    calcMode="spline"
                    keyTimes="0;1"
                    keySplines="0.2 0.8 0.3 1"
                  />
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    values={`0;${t.sway};${-t.sway};0`}
                    begin={`${(delay + t.delay + 1.3).toFixed(2)}s`}
                    dur={`${5 + (i % 4) * 0.6}s`}
                    repeatCount="indefinite"
                    additive="sum"
                  />
                </>
              )}
              <path d={t.limb.d} />
              {layer === 'flesh' &&
                t.limb.suckers.map((s, j) => <circle key={j} cx={s.x.toFixed(1)} cy={s.y.toFixed(1)} r={s.r.toFixed(1)} className="ui-level-burst__sucker" />)}
            </g>
          </g>
        ))}
      </g>
    ))}
  </>
);

/** The eye over Lovecraft's sigil, opening as the number changes. */
const Eye: React.FC<{ delay: number }> = ({ delay }) => (
  <g transform="translate(0 -150)">
    <motion.g initial={{ scaleY: 0.05 }} animate={{ scaleY: 1 }} transition={{ duration: 0.9, delay, ease: [0.65, 0, 0.35, 1] }}>
      <path d="M-30 0 Q0 -22 30 0 Q0 22 -30 0 Z" className="ui-level-burst__eye" />
      <circle r="7.5" className="ui-level-burst__pupil" />
      <circle r="2.6" className="ui-level-burst__glint-dot" />
    </motion.g>
    <path d="M-36 0 Q0 -30 36 0 M-36 0 Q0 30 36 0" className="ui-level-burst__hair" />
  </g>
);

const EmblemArt: React.FC<{ kind: Exclude<Emblem, 'none'>; at: (beat: number) => number; still: boolean }> = ({ kind, at, still }) => {
  const id = useId().replace(/:/g, '');
  const emblem = EMBLEM[kind];
  return (
    <svg viewBox="-150 -150 300 300" aria-hidden>
      <defs>
        <filter id={`${id}-halo`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id={`${id}-rim`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <clipPath id={`${id}-inside`}>
          <path d={emblem.outline} />
        </clipPath>
      </defs>
      {kind === 'sigil' && <Tentacles delay={at(BEAT.swap - 0.1)} still={still} />}
      {/* No dark disc before the edge is drawn: the ground comes in with the light. */}
      <motion.path
        d={emblem.outline}
        className="ui-level-burst__fill"
        initial={still ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: at(0.5) }}
      />
      {/* The light gathering inside the edge, and its halo outside. */}
      <motion.g initial={still ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: at(0.5) }}>
        <g clipPath={`url(#${id}-inside)`}>
          <path d={emblem.outline} className="ui-level-burst__rim" filter={`url(#${id}-rim)`} />
        </g>
        <path d={emblem.outline} className="ui-level-burst__halo" filter={`url(#${id}-halo)`} />
      </motion.g>
      {/* The edge glows as it is drawn, the glow settling as the halo takes over. */}
      {!still && (
        <motion.path
          d={emblem.outline}
          className="ui-level-burst__trace"
          filter={`url(#${id}-halo)`}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: [0, 1, 1, 0] }}
          transition={{
            pathLength: { duration: 0.8, delay: BEAT.draw, ease: [0.4, 0, 0.2, 1] },
            opacity: { duration: 1.6, delay: BEAT.draw, times: [0, 0.1, 0.5, 1] },
          }}
        />
      )}
      <motion.path
        d={emblem.outline}
        className="ui-level-burst__line"
        initial={still ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, delay: at(BEAT.draw), ease: [0.4, 0, 0.2, 1] }}
      />
      {emblem.inner && (
        <motion.path
          d={emblem.inner}
          className="ui-level-burst__inner"
          initial={still ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: at(0.5) }}
        />
      )}
      <motion.g initial={still ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: at(0.55) }}>
        {emblem.detail}
      </motion.g>
      {kind === 'sigil' && <Eye delay={at(BEAT.swap)} />}
    </svg>
  );
};

/** The words of the moment, said the setting's way. */
const Said: React.FC<{ words: Words; text: string; at: (beat: number) => number; still: boolean }> = ({ words, text, at, still }) => {
  if (words === 'typed')
    return (
      <div className="ui-level-burst__words ui-level-burst__words--typed ui-display" aria-label={text}>
        {[...text].map((char, i) => (
          <motion.span
            key={i}
            aria-hidden
            initial={still ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.01, delay: at(BEAT.words + i * 0.045) }}
          >
            {char}
          </motion.span>
        ))}
        <span className="ui-level-burst__caret" aria-hidden />
        <motion.span
          className="ui-level-burst__readout"
          initial={still ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: at(BEAT.words + text.length * 0.045 + 0.2) }}
        >
          Синхронизация завершена · 100%
        </motion.span>
      </div>
    );
  if (words === 'script')
    return null;
  return (
    <motion.div
      className={cx('ui-level-burst__words ui-display', words === 'banner' && 'ui-level-burst__words--banner')}
      initial={still ? false : { opacity: 0, letterSpacing: '0.7em', filter: 'blur(8px)' }}
      animate={{ opacity: 1, letterSpacing: words === 'banner' ? '0.2em' : '0.24em', filter: 'blur(0px)' }}
      transition={{ duration: words === 'banner' ? 1.4 : 0.9, delay: at(BEAT.words), ease: [0.22, 1, 0.36, 1] }}
    >
      {text}
      {words === 'banner' && !still && <span className="ui-level-burst__echo" aria-hidden>{text}</span>}
    </motion.div>
  );
};

const Burst: React.FC<{ moment: LevelUpMoment; onDone: () => void }> = ({ moment, onDone }) => {
  const still = !!useReducedMotion();
  const variant = VARIANT[moment.setting];
  const at = (beat: number) => (still ? 0 : beat);

  useEffect(() => {
    const timer = window.setTimeout(onDone, moment.onDock ? (still ? 1200 : DOCK_MS) : SHOWN_MS);
    return () => window.clearTimeout(timer);
  }, [onDone, moment.onDock, still]);

  return (
    <SettingScope setting={moment.setting} className={cx('ui-level-burst', `ui-level-burst--${variant.emblem}`)}>
      <SettingAura setting={moment.setting} />
      {variant.words === 'banner' && (
        <motion.span
          className="ui-level-burst__band"
          // Centred by its own motion: the scale it opens with would replace a CSS shift.
          initial={{ x: '-50%', scaleY: 0, opacity: 0 }}
          animate={{ x: '-50%', scaleY: 1, opacity: 1 }}
          transition={{ duration: 0.7, delay: at(BEAT.words - 0.25), ease: [0.22, 1, 0.36, 1] }}
          aria-hidden
        />
      )}

      <div className="ui-level-burst__emblem">
        {variant.emblem !== 'none' && <EmblemArt kind={variant.emblem} at={at} still={still} />}

        {/* A glint running across the emblem as the number changes. */}
        {!still && variant.emblem !== 'none' && (
          <span className="ui-level-burst__glint-box" aria-hidden>
            <motion.span
              className="ui-level-burst__glint"
              initial={{ x: '-110%' }}
              animate={{ x: '110%' }}
              transition={{ duration: 0.9, delay: BEAT.swap, ease: 'easeInOut' }}
            />
          </span>
        )}
        {variant.emblem === 'hex' && !still && <span className="ui-level-burst__scan" aria-hidden />}

        <div className="ui-level-burst__number">
          <span className="ui-level-burst__lv">Ур.</span>
          <span className="relative block">
            <motion.span
              className="ui-level-burst__digits ui-display ui-numeric"
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 0, y: -28, filter: 'blur(6px)' }}
              transition={{ duration: 0.35, delay: at(BEAT.swap) }}
              aria-hidden
            >
              {moment.from}
            </motion.span>
            <motion.span
              className="ui-level-burst__digits ui-level-burst__digits--new ui-display ui-numeric"
              initial={{ opacity: 0, scale: 1.6, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ type: 'spring', stiffness: 260, damping: 16, delay: at(BEAT.swap + 0.12) }}
            >
              {moment.to}
            </motion.span>
          </span>
        </div>

        {!still &&
          SPARKS.map((spark, i) => (
            <motion.span
              key={i}
              className="ui-level-burst__spark"
              style={{ width: spark.size, height: spark.size }}
              initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
              animate={{ x: spark.x, y: spark.y, opacity: [0, 1, 1, 0], scale: [0.4, 1.2, 1, 0.6] }}
              transition={{ duration: 1.5, delay: BEAT.swap + 0.1 + spark.delay, ease: [0.16, 1, 0.3, 1], times: [0, 0.15, 0.6, 1] }}
              aria-hidden
            />
          ))}

        {variant.words === 'script' && (
          <motion.span
            className="ui-level-burst__script"
            initial={still ? false : { clipPath: 'inset(-20% 100% -20% 0)' }}
            animate={{ clipPath: 'inset(-20% 0% -20% 0)' }}
            transition={{ duration: 1.1, delay: at(BEAT.words), ease: [0.45, 0, 0.25, 1] }}
          >
            {variant.text}
          </motion.span>
        )}
      </div>

      <Said words={variant.words} text={variant.text} at={at} still={still} />

      <motion.div
        className="ui-level-burst__step"
        initial={still ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: at(BEAT.step) }}
      >
        <span>
          Ур. <b className="ui-numeric">{moment.from}</b>
        </span>
        <span className="ui-level-burst__chevrons" aria-hidden>
          »
        </span>
        <span>
          Ур. <b className="ui-numeric ui-level-burst__step-new">{moment.to}</b>
        </span>
      </motion.div>

      {moment.gains.length > 0 && (
        <ul className="ui-level-burst__gains">
          {moment.gains.map((gain, i) => (
            <motion.li
              key={gain.label}
              className="ui-level-burst__gain"
              initial={still ? false : { opacity: 0, x: -18, clipPath: 'inset(0 100% 0 0)' }}
              animate={{ opacity: 1, x: 0, clipPath: 'inset(0 0% 0 0)' }}
              transition={{ duration: 0.5, delay: at(BEAT.gains + i * 0.14), ease: [0.22, 1, 0.36, 1] }}
            >
              <span>{gain.label}</span>
              <span className="ui-numeric">{gain.value}</span>
            </motion.li>
          ))}
        </ul>
      )}
    </SettingScope>
  );
};

/**
 * The moment itself, over everything (open windows included); a click lets it go early. A prelude
 * to the level-up window settles instead: the rest fades, the emblem shrinks to the top of the
 * screen and stays there over the window, which opens as it moves.
 */
export const LevelUpBurst: React.FC<{ moment?: LevelUpMoment | null; onDone?: () => void; inline?: boolean }> = ({
  moment: given,
  onDone,
  inline,
}) => {
  const stored = useMomentStore((s) => s.levelUp);
  const clear = useMomentStore((s) => s.clear);
  const moment = given === undefined ? stored : given;
  const done = onDone ?? clear;
  const body = useRef<HTMLDivElement>(null);
  const [docked, setDocked] = useState<{ key: number; y: number; scale: number } | null>(null);
  const isDocked = !!moment && docked?.key === moment.key;

  // Shrinks round the body's top so that the emblem, wherever it stands in it, lands centred on the
  // window's edge.
  const dock = useCallback(() => {
    if (!moment?.onDock || docked?.key === moment.key) return;
    const outer = body.current?.getBoundingClientRect();
    const emblem = body.current?.querySelector('.ui-level-burst__emblem')?.getBoundingClientRect();
    if (outer && emblem) {
      const scale = LEVEL_DOCK.size / emblem.height;
      const y = LEVEL_DOCK.y - LEVEL_DOCK.size / 2 - (emblem.top - outer.top) * scale - outer.top;
      setDocked({ key: moment.key, y, scale });
    }
    moment.onDock();
  }, [moment, docked]);
  const letGo = moment?.onDock ? dock : done;

  return (
    <AnimatePresence>
      {moment && (
        <motion.div
          key={moment.key}
          className={cx('ui-level-burst-layer', inline ? 'absolute' : 'fixed', isDocked && 'ui-level-burst-layer--docked')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.3 } }}
          exit={{ opacity: 0, scale: isDocked ? 1 : 1.04, transition: { duration: isDocked ? 0.25 : 0.5 } }}
          onClick={isDocked ? undefined : letGo}
          role="status"
          aria-label={`Новый уровень: ${moment.to}`}
        >
          <motion.div
            ref={body}
            style={{ transformOrigin: '50% 0' }}
            initial={false}
            animate={isDocked ? { y: docked.y, scale: docked.scale } : { y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.65, 0, 0.25, 1] }}
            onAnimationComplete={() => isDocked && useMomentStore.getState().land()}
          >
            <Burst moment={moment} onDone={letGo} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
