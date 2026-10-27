import React, { useId, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { TableCheck, TableDie } from '@itd/schema';
import { GameIcon } from './GameIcon';
import { DieGlyph, RollingDie } from './RollingDie';
import { OUTCOME_LABEL, checkOutcome, outcomeSucceeded } from './checkOutcome';
import { cx } from './primitives';
import { useSetting } from './theme/SettingScope';
import type { Theme } from './theme/settings';

/**
 * A throw laid out as a game lays out a check: what is checked over a framed plate, the number to
 * reach at the plate's head, the dice tumbling in its middle and the outcome under them, the
 * modifier on a card below and the total under a rule. Each setting frames the plate in its own
 * shape and lays its own weather behind it (fairy dust, a rune ring, a madness cloud).
 */

type Shape = 'arch' | 'gothic' | 'cut' | 'deco';

const SHAPE: Record<Theme, Shape> = {
  fable: 'arch',
  'high-fantasy': 'arch',
  service: 'arch',
  'elden-ring': 'gothic',
  'dark-fantasy': 'gothic',
  'sci-fi': 'cut',
  cyberpunk: 'cut',
  lovecraft: 'deco',
};

/** The plate's outline on a 360 × 460 grid. */
const OUTLINE: Record<Shape, string> = {
  arch: 'M38 122 C38 52 104 22 180 22 C256 22 322 52 322 122 L322 346 C322 410 256 438 180 438 C104 438 38 410 38 346 Z',
  gothic: 'M62 150 C62 98 112 52 180 22 C248 52 298 98 298 150 L298 398 L274 430 L86 430 L62 398 Z',
  cut: 'M74 24 L286 24 L316 54 L316 404 L286 434 L74 434 L44 404 L44 54 Z',
  deco: 'M48 96 L48 432 L312 432 L312 96 L290 96 L290 70 L262 70 L262 46 L226 46 L226 24 L134 24 L134 46 L98 46 L98 70 L70 70 L70 96 Z',
};

/** Where the rule between the target and the dice runs, as a fraction of the plate's height. */
const BAND_Y = 172;

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

/** The ornaments of each shape, drawn in the frame's colour. */
const Ornaments: React.FC<{ shape: Shape; setting: Theme }> = ({ shape, setting }) => {
  if (shape === 'arch')
    return (
      <>
        {/* A hook sweeping out of each corner and curling back, as a storybook's page frame. */}
        <Corners>
          <path d="M38 140 C18 140 4 126 4 106 C4 90 16 82 26 88 C34 93 32 104 24 105" className="ui-check__hair" />
          <path d="M50 84 C34 70 36 48 54 38" className="ui-check__hair" />
          <path d="M38 160 C26 168 22 180 26 192" className="ui-check__hair" />
          <circle cx="24" cy="105" r="2.6" className="ui-check__dot" />
        </Corners>
        {setting === 'fable' && (
          // Fable's vines: a tendril winding down each side, a leaf on it.
          <>
            {[undefined, mirrorX].map((transform, i) => (
              <g key={i} transform={transform}>
                <path d="M34 200 C16 218 16 248 32 262 C44 272 42 290 28 296" className="ui-check__hair" />
                <path d="M20 240 C10 234 8 224 14 218 C20 224 22 232 20 240 Z" className="ui-check__leaf" />
                <path d="M30 276 C40 274 46 266 44 258 C38 262 32 268 30 276 Z" className="ui-check__leaf" />
                <path d="M32 304 C18 320 20 340 36 348" className="ui-check__hair" />
              </g>
            ))}
          </>
        )}
        {/* The rule: a band of knots between two hairlines, with a stud where it meets each side. */}
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
  if (shape === 'gothic')
    return (
      <>
        {/* A thin spire over the apex and a bead at each foot: the gilt line work of the Lands Between,
            or the grimdark's bracketed iron. */}
        <path d="M180 22 L180 4 M172 12 L188 12" className="ui-check__hair" />
        <circle cx="180" cy="22" r="3.4" className="ui-check__stud" />
        <Corners>
          <path d="M62 196 L44 214 L44 250" className="ui-check__hair" />
          <circle cx="44" cy="252" r="2.6" className="ui-check__dot" />
        </Corners>
        {setting === 'dark-fantasy' && (
          <Corners>
            <path d="M62 150 L40 128 L62 140 Z" className="ui-check__stud" />
          </Corners>
        )}
        <path d={`M62 ${BAND_Y} L160 ${BAND_Y} M200 ${BAND_Y} L298 ${BAND_Y}`} className="ui-check__hair" />
        <path d={`M180 ${BAND_Y - 9} L189 ${BAND_Y} L180 ${BAND_Y + 9} L171 ${BAND_Y} Z`} className="ui-check__stud" />
      </>
    );
  if (shape === 'cut')
    return (
      <>
        {/* Readout ticks down the sides and brackets in the cut corners. */}
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
        {setting === 'cyberpunk' && (
          // A hazard hatch in the top right cut.
          <path
            d={Array.from({ length: 5 }, (_, i) => `M${250 + i * 9} 24 L${262 + i * 9} 24 L${254 + i * 9} 34 L${242 + i * 9} 34 Z`).join(' ')}
            className="ui-check__stud"
          />
        )}
      </>
    );
  return (
    <>
      {/* Art deco: a sunburst fanning out over the stepped crown, and triple rules. */}
      {/* The sunburst rises from the rule behind the number, faint. */}
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
};

/** The plate itself, drawn in as it appears. */
const Frame: React.FC<{ shape: Shape; setting: Theme }> = ({ shape, setting }) => {
  const still = !!useReducedMotion();
  const draw = still
    ? {}
    : { initial: { pathLength: 0, opacity: 0 }, animate: { pathLength: 1, opacity: 1 }, transition: { duration: 0.9, ease: [0.4, 0, 0.2, 1] as const } };
  return (
    <svg viewBox="0 0 360 460" className="ui-check__frame" aria-hidden>
      <path d={OUTLINE[shape]} className="ui-check__plate" />
      <motion.path d={OUTLINE[shape]} className="ui-check__line" {...draw} />
      <path d={OUTLINE[shape]} className="ui-check__inner" transform="translate(180 230) scale(0.95 0.965) translate(-180 -230)" />
      <motion.g
        initial={still ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: still ? 0 : 0.45 }}
      >
        <Ornaments shape={shape} setting={setting} />
      </motion.g>
    </svg>
  );
};

/** Motes for the weathers that drift: their place, size and the beat they keep. */
const MOTES = Array.from({ length: 22 }, (_, i) => ({
  x: (i * 37 + 11) % 100,
  y: (i * 61 + 23) % 100,
  size: 2 + ((i * 7) % 4),
  delay: (i * 0.37) % 3.2,
  duration: 3.2 + ((i * 13) % 5) * 0.5,
}));

/** The setting's weather behind a moment (a check's plate, a new level): half-seen, so the table shows through. */
export const SettingAura: React.FC<{ setting: Theme }> = ({ setting }) => {
  const id = useId().replace(/:/g, '');
  switch (setting) {
    case 'lovecraft':
      // The madness cloud: fog boiling round the plate's edges, tendrils of it reaching in, the
      // middle left clear for the dice.
      return (
        <span className="ui-check-aura ui-check-aura--madness" aria-hidden>
          <svg viewBox="0 0 400 520" preserveAspectRatio="none">
            <defs>
              <filter id={`${id}-boil`} x="-20%" y="-20%" width="140%" height="140%">
                <feTurbulence type="fractalNoise" baseFrequency="0.012 0.018" numOctaves="3" seed="7">
                  <animate attributeName="baseFrequency" dur="14s" values="0.012 0.018;0.017 0.012;0.012 0.018" repeatCount="indefinite" />
                </feTurbulence>
                <feDisplacementMap in="SourceGraphic" scale="46" />
                <feGaussianBlur stdDeviation="3" />
              </filter>
              <radialGradient id={`${id}-clear`} cx="50%" cy="52%" r="50%">
                <stop offset="0.5" stopColor="#000" />
                <stop offset="0.85" stopColor="#fff" />
                <stop offset="1" stopColor="#000" />
              </radialGradient>
              <mask id={`${id}-edges`}>
                <rect width="400" height="520" fill={`url(#${id}-clear)`} />
              </mask>
            </defs>
            <g mask={`url(#${id}-edges)`} filter={`url(#${id}-boil)`}>
              <ellipse cx="200" cy="260" rx="186" ry="246" className="ui-check-aura__fog" />
              <ellipse cx="200" cy="260" rx="150" ry="205" className="ui-check-aura__fog ui-check-aura__fog--deep" />
              {Array.from({ length: 9 }, (_, i) => {
                const a = (i / 9) * Math.PI * 2 + 0.3;
                const x = 200 + Math.cos(a) * 210;
                const y = 260 + Math.sin(a) * 270;
                const cx = 200 + Math.cos(a + 0.5) * 120;
                const cy = 260 + Math.sin(a + 0.5) * 150;
                return <path key={i} d={`M${x} ${y} Q${cx} ${cy} ${200 + Math.cos(a) * 95} ${260 + Math.sin(a) * 120}`} className="ui-check-aura__tendril" />;
              })}
            </g>
          </svg>
        </span>
      );
    case 'high-fantasy':
    case 'service':
      // A ring of runes turning slowly in a warm glow.
      return (
        <span className="ui-check-aura ui-check-aura--runes" aria-hidden>
          <svg viewBox="-100 -100 200 200" className="ui-check-aura__ring">
            <circle r="92" className="ui-check-aura__line" />
            <circle r="84" className="ui-check-aura__line ui-check-aura__line--dash" />
            <circle r="58" className="ui-check-aura__line" />
            {Array.from({ length: 24 }, (_, i) => (
              <path key={i} d="M0 -87 L1.5 -84.5 L0 -82 L-1.5 -84.5 Z" transform={`rotate(${i * 15})`} className="ui-check-aura__rune" />
            ))}
          </svg>
        </span>
      );
    case 'elden-ring':
      // Grace: rays of gold turning behind the plate.
      return <span className="ui-check-aura ui-check-aura--grace" aria-hidden />;
    case 'sci-fi':
      // Scanner rings counter-rotating, a sweep going round.
      return (
        <span className="ui-check-aura ui-check-aura--scan" aria-hidden>
          <svg viewBox="-100 -100 200 200" className="ui-check-aura__ring">
            <circle r="94" className="ui-check-aura__line ui-check-aura__line--dash" />
            <circle r="78" className="ui-check-aura__line ui-check-aura__line--arc" />
            <circle r="62" className="ui-check-aura__line ui-check-aura__line--dash" />
          </svg>
          <span className="ui-check-aura__sweep" />
        </span>
      );
    case 'cyberpunk':
      // Neon bleeding at the edges, torn by glitch bands.
      return (
        <span className="ui-check-aura ui-check-aura--neon" aria-hidden>
          <span className="ui-check-aura__bands" />
        </span>
      );
    default:
      // Fable's fairy dust and the grimdark's embers: motes adrift in a haze.
      return (
        <span className={cx('ui-check-aura', setting === 'fable' ? 'ui-check-aura--dust' : 'ui-check-aura--embers')} aria-hidden>
          {MOTES.map((mote, i) => (
            <span
              key={i}
              className="ui-check-aura__mote"
              style={{
                left: `${mote.x}%`,
                top: `${mote.y}%`,
                width: mote.size,
                height: mote.size,
                animationDelay: `${mote.delay}s`,
                animationDuration: `${mote.duration}s`,
              }}
            />
          ))}
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
  const shape = SHAPE[setting];
  const [landed, setLanded] = useState(false);
  const waiting = !!onRoll && dice.length === 0;
  const outcome = check && !waiting ? checkOutcome(check) : null;
  const size = dieSize(waiting ? (pair ? 2 : 1) : dice.length);
  const counted = dice.filter((die) => !die.dropped).reduce((sum, die) => sum + die.value, 0);
  const total = check?.total ?? counted;
  const bonus = check?.bonus ?? 0;
  const cards: CheckPart[] = parts ?? (bonus !== 0 ? [{ label: 'Модификатор', value: bonus, icon: 'rolling-dices' }] : []);

  return (
    <div className={cx('ui-check', `ui-check--${shape}`, className)} data-landed={landed || undefined} data-outcome={landed ? outcome ?? undefined : undefined}>
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
        <span className="ui-check__glass" style={{ clipPath: `path('${OUTLINE[shape]}')` }} aria-hidden />
        <Frame shape={shape} setting={setting} />
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
            <RollingDie
              key={index}
              sides={die.sides}
              value={die.label ?? die.value}
              dropped={die.dropped}
              size={size}
              delay={index * STAGGER_MS}
              phase={index * 1.3 + die.sides * 0.1}
              tone={die.label ? undefined : die.value === die.sides && die.sides > 2 ? 'success' : die.value === 1 ? 'danger' : undefined}
              onLanded={index === dice.length - 1 ? () => setLanded(true) : undefined}
            />
          ))}
        </div>
        <div className="ui-check__pill-row">
          <motion.span
            key={landed ? 'landed' : 'rolling'}
            className={cx('ui-check__pill', landed && outcome && (outcomeSucceeded(outcome) ? 'ui-check__pill--success' : 'ui-check__pill--failure'))}
            initial={landed ? { opacity: 0, scale: 1.25, filter: 'blur(4px)' } : { opacity: 0 }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={landed ? { type: 'spring', stiffness: 320, damping: 18 } : { duration: 0.3, delay: 0.4 }}
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
                : 'Кости брошены…'}
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
          className="ui-check__total-value ui-numeric"
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
