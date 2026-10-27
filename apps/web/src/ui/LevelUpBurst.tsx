import React, { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useMomentStore, type LevelUpMoment } from '../store/useMomentStore';
import { SettingAura } from './CheckPanel';
import { cx } from './primitives';
import { SettingScope } from './theme/SettingScope';
import type { Theme } from './theme/settings';

/**
 * A new level, played in the middle of the screen: the setting's emblem drawn in, the old number
 * giving way to the new one in a burst of sparks, the words of the moment written or struck across
 * it, then "2 » 3" and what the level brought, row by row. A click (or a few seconds) lets it go.
 */

type Emblem = 'diamond' | 'ring' | 'band' | 'seal' | 'hex' | 'slab' | 'sigil';

const VARIANT: Record<Theme, { emblem: Emblem; words: string; script?: boolean }> = {
  'high-fantasy': { emblem: 'diamond', words: 'Новый уровень', script: true },
  service: { emblem: 'diamond', words: 'Новый уровень', script: true },
  fable: { emblem: 'ring', words: 'Новый уровень', script: true },
  'elden-ring': { emblem: 'band', words: 'Уровень повышен' },
  'dark-fantasy': { emblem: 'seal', words: 'Восхождение' },
  'sci-fi': { emblem: 'hex', words: 'Уровень повышен' },
  cyberpunk: { emblem: 'slab', words: 'Апгрейд' },
  lovecraft: { emblem: 'sigil', words: 'Знание растёт' },
};

/** The beats of the moment, in seconds from its start. */
const BEAT = { draw: 0.1, swap: 0.85, words: 1.05, step: 1.5, gains: 1.75 };
const SHOWN_MS = 6200;

const points = (n: number, r: number, turn = -90) =>
  Array.from({ length: n }, (_, i) => {
    const a = ((turn + (360 / n) * i) * Math.PI) / 180;
    return `${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`;
  });

/** A star of `n` points between two radii. */
const star = (n: number, outer: number, inner: number) => {
  const tips = points(n, outer);
  const notches = points(n, inner, -90 + 180 / n);
  return `M${tips.map((tip, i) => `${tip} L${notches[i]}`).join(' L')} Z`;
};

/** Each emblem on a 300 × 300 grid around its centre: the outline drawn in, then its fine work. */
const EMBLEM: Record<Emblem, { outline: string; inner?: string; detail?: React.ReactNode }> = {
  diamond: {
    outline: 'M0 -128 L128 0 L0 128 L-128 0 Z',
    inner: 'M0 -112 L112 0 L0 112 L-112 0 Z',
    detail: <circle r="142" className="ui-level-burst__dots" />,
  },
  ring: {
    outline: 'M0 -118 A118 118 0 1 1 -0.1 -118 Z',
    inner: 'M0 -104 A104 104 0 1 1 -0.1 -104 Z',
    detail: (
      <>
        <circle r="140" className="ui-level-burst__dots" />
        {[0, 90, 180, 270].map((turn) => (
          <path key={turn} d="M0 -132 L4 -122 L0 -112 L-4 -122 Z" transform={`rotate(${turn})`} className="ui-level-burst__stud" />
        ))}
        {/* Vines curling from the foot of the ring. */}
        <path d="M-20 116 C-60 140 -100 120 -108 86 C-112 70 -98 62 -90 72" className="ui-level-burst__hair" />
        <path d="M20 116 C60 140 100 120 108 86 C112 70 98 62 90 72" className="ui-level-burst__hair" />
      </>
    ),
  },
  band: {
    outline: 'M0 -104 A104 104 0 1 1 -0.1 -104 Z',
    detail: (
      <>
        <path d="M0 -128 L0 -112 M-8 -120 L8 -120" className="ui-level-burst__hair" />
        <path d="M0 112 L6 120 L0 128 L-6 120 Z" className="ui-level-burst__stud" />
      </>
    ),
  },
  seal: {
    outline: star(16, 134, 114),
    inner: 'M0 -100 A100 100 0 1 1 -0.1 -100 Z',
  },
  hex: {
    outline: `M${points(6, 128).join(' L')} Z`,
    inner: `M${points(6, 114).join(' L')} Z`,
    detail: <circle r="142" className="ui-level-burst__progress" pathLength={100} />,
  },
  slab: {
    outline: 'M-100 -122 L136 -122 L104 122 L-132 122 Z',
    inner: 'M-88 -108 L118 -108 L90 108 L-116 108 Z',
    detail: <path d="M96 -122 L136 -122 L130 -78 Z" className="ui-level-burst__stud" />,
  },
  sigil: {
    outline: 'M0 -126 A126 126 0 1 1 -0.1 -126 Z',
    detail: (
      <>
        <path d={`M${[0, 2, 4, 1, 3].map((i) => points(5, 116)[i]).join(' L')} Z`} className="ui-level-burst__faint" />
        {/* The eye over it all, at the circle's head. */}
        <path d="M-22 -138 Q0 -152 22 -138 Q0 -124 -22 -138 Z" className="ui-level-burst__hair" />
        <circle cx="0" cy="-138" r="4.5" className="ui-level-burst__stud" />
      </>
    ),
  },
};

/** Sparks thrown out of the middle as the new number lands. */
const SPARKS = Array.from({ length: 26 }, (_, i) => {
  const a = (i / 26) * Math.PI * 2 + (i % 3) * 0.21;
  const d = 120 + ((i * 47) % 90);
  return { x: Math.cos(a) * d, y: Math.sin(a) * d, size: 2 + (i % 4), delay: (i % 5) * 0.03 };
});

const Burst: React.FC<{ moment: LevelUpMoment; onDone: () => void }> = ({ moment, onDone }) => {
  const still = !!useReducedMotion();
  const variant = VARIANT[moment.setting];
  const emblem = EMBLEM[variant.emblem];
  const at = (beat: number) => (still ? 0 : beat);

  useEffect(() => {
    const timer = window.setTimeout(onDone, SHOWN_MS);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return (
    <SettingScope setting={moment.setting} className={cx('ui-level-burst', `ui-level-burst--${variant.emblem}`)}>
      <SettingAura setting={moment.setting} />
      {variant.emblem === 'band' && (
        <motion.span
          className="ui-level-burst__band"
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ scaleY: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: at(BEAT.words - 0.2), ease: [0.22, 1, 0.36, 1] }}
          aria-hidden
        />
      )}

      <div className="ui-level-burst__emblem">
        <svg viewBox="-150 -150 300 300" aria-hidden>
          <path d={emblem.outline} className="ui-level-burst__fill" />
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
        </svg>

        {/* A glint running across the emblem as the number changes. */}
        {!still && (
          <span className="ui-level-burst__glint-box" aria-hidden>
            <motion.span
              className="ui-level-burst__glint"
              initial={{ x: '-110%' }}
              animate={{ x: '110%' }}
              transition={{ duration: 0.9, delay: BEAT.swap, ease: 'easeInOut' }}
            />
          </span>
        )}

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

        {variant.script && (
          <motion.span
            className="ui-level-burst__script"
            initial={still ? false : { clipPath: 'inset(-20% 100% -20% 0)' }}
            animate={{ clipPath: 'inset(-20% 0% -20% 0)' }}
            transition={{ duration: 1.1, delay: at(BEAT.words), ease: [0.45, 0, 0.25, 1] }}
          >
            {variant.words}
          </motion.span>
        )}
      </div>

      {!variant.script && (
        <motion.div
          className="ui-level-burst__words ui-display"
          initial={still ? false : { opacity: 0, letterSpacing: '0.7em', filter: 'blur(8px)' }}
          animate={{ opacity: 1, letterSpacing: '0.24em', filter: 'blur(0px)' }}
          transition={{ duration: 0.9, delay: at(BEAT.words), ease: [0.22, 1, 0.36, 1] }}
        >
          {variant.words}
        </motion.div>
      )}

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

/** The moment itself, over everything; a click lets it go early. */
export const LevelUpBurst: React.FC<{ moment?: LevelUpMoment | null; onDone?: () => void; inline?: boolean }> = ({
  moment: given,
  onDone,
  inline,
}) => {
  const stored = useMomentStore((s) => s.levelUp);
  const clear = useMomentStore((s) => s.clear);
  const moment = given === undefined ? stored : given;
  const done = onDone ?? clear;
  return (
    <AnimatePresence>
      {moment && (
        <motion.div
          key={moment.key}
          className={cx('ui-level-burst-layer', inline ? 'absolute' : 'fixed')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.3 } }}
          exit={{ opacity: 0, scale: 1.04, transition: { duration: 0.5 } }}
          onClick={done}
          role="status"
          aria-label={`Новый уровень: ${moment.to}`}
        >
          <Burst moment={moment} onDone={done} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
