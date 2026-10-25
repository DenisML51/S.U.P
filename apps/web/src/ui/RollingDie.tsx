import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cx } from './primitives';
import { WireDie, type DieShape } from './WireDie';

const SHAPES: DieShape[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];

/**
 * A die drawn as its wireframe solid, in the colour of the text around it; the percentile die is a
 * pair of tens. Sizes without a solid of their own (typed into a formula) are drawn as the d20.
 */
export const DieGlyph: React.FC<{ sides: number; spin?: number; phase?: number; className?: string }> = ({
  sides,
  spin = 0,
  phase = 0,
  className,
}) => {
  if (sides === 100)
    return (
      <span className={cx('ui-die-glyph ui-die-glyph--pair', className)}>
        <WireDie shape="d10" spin={spin} phase={phase} />
        <WireDie shape="d10" spin={spin} phase={phase + 1.7} />
      </span>
    );
  const shape: DieShape = SHAPES.find((s) => s === `d${sides}`) ?? 'd20';
  return (
    <span className={cx('ui-die-glyph', className)}>
      <WireDie shape={shape} spin={spin} phase={phase} />
    </span>
  );
};

/** How long a thrown die tumbles before it lands, in ms. */
export const TUMBLE_MS = 1000;

/** How fast a die turns while it tumbles (a multiple of WireDie's idle turn). */
const TUMBLE_SPIN = 20;

export type RollTone = 'success' | 'danger';

/**
 * A thrown die: it tumbles for a moment, then settles and its number pops in over it. The value is
 * known from the start, the animation only holds it back; `delay` staggers several dice of one
 * throw. With reduced motion the die lies still and shows its number at once.
 */
export const RollingDie: React.FC<{
  sides: number;
  value: number;
  /** Extra time before landing, in ms, so the dice of one throw land one after another. */
  delay?: number;
  tone?: RollTone;
  /** Thrown but not counted (the other die of advantage). */
  dropped?: boolean;
  /** Edge of the die, any CSS length. */
  size?: string;
  phase?: number;
  className?: string;
  /** Called once, when the number shows. */
  onLanded?: () => void;
}> = ({ sides, value, delay = 0, tone, dropped, size, phase = 0, className, onLanded }) => {
  const still = !!useReducedMotion();
  const [settled, setSettled] = useState(false);
  const landed = settled || still;
  const landedCallback = useRef(onLanded);
  landedCallback.current = onLanded;

  useEffect(() => {
    const timer = window.setTimeout(
      () => {
        setSettled(true);
        landedCallback.current?.();
      },
      still ? 0 : TUMBLE_MS + delay,
    );
    return () => window.clearTimeout(timer);
  }, [still, delay]);

  return (
    <span
      className={cx(
        'ui-rolling-die',
        sides === 100 && 'ui-rolling-die--pair',
        tone && `ui-rolling-die--${tone}`,
        landed && 'ui-rolling-die--landed',
        dropped && 'ui-rolling-die--dropped',
        className,
      )}
      style={size ? ({ '--die-size': size } as React.CSSProperties) : undefined}
    >
      <motion.span
        className="ui-rolling-die__body"
        initial={still ? false : { scale: 0.7, rotate: 0, y: 0 }}
        animate={
          landed
            ? { scale: 1, rotate: 360, y: 0 }
            : { scale: [0.7, 1.1, 0.94, 1.05], rotate: [0, 170, 290, 345], y: ['0%', '-8%', '0%', '-4%'] }
        }
        transition={
          landed
            ? { type: 'spring', stiffness: 420, damping: 16 }
            : { duration: (TUMBLE_MS + delay) / 1000, ease: 'easeOut' }
        }
      >
        <DieGlyph sides={sides} spin={landed ? 0 : TUMBLE_SPIN} phase={phase} />
      </motion.span>
      <AnimatePresence>
        {landed && (
          <motion.span
            className="ui-rolling-die__value ui-display ui-numeric"
            initial={still ? false : { opacity: 0, scale: 0.3 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 520, damping: 17 }}
          >
            {value}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
};
