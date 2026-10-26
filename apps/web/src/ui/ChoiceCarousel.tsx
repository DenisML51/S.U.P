import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Button, IconButton } from './primitives';
import { IconCheck, IconNext, IconPrev } from './icons';

export interface CarouselItem<T extends string> {
  id: T;
  /** The card; `focused` is the one in front, `hovered` under the pointer. */
  render: (state: { focused: boolean; hovered: boolean }) => React.ReactNode;
  /** Shown dimmed and cannot be chosen (rules a table does not play by). */
  disabled?: boolean;
}

/**
 * A few cards fanned round the one in front, as the worlds are on the creation's first step: the
 * cards turn and fall back with depth, the one in front stays awake. A card is chosen by clicking
 * it in front or with the button under it; arrows and the keyboard turn the fan.
 */
export function ChoiceCarousel<T extends string>({
  items,
  chosen,
  onChoose,
  onFocus,
  preferred,
  chooseLabel,
  chosenLabel,
  disabledLabel,
  height = 'min(46vh, 460px)',
  label,
}: {
  items: CarouselItem<T>[];
  chosen: T | null;
  onChoose: (id: T) => void;
  onFocus?: (id: T) => void;
  /** The card in front at first when nothing is chosen yet (the rules that go with the world). */
  preferred?: T;
  chooseLabel: string;
  chosenLabel: string;
  disabledLabel?: string;
  height?: string;
  /** Accessible name of the arrows' subject ("правила"). */
  label: string;
}) {
  const count = items.length;
  // Scaled down on a phone by the stage around it (`--stage-fit`), so the words below still fit.
  const fitted = `calc(${height} * var(--stage-fit, 1))`;
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      items.findIndex((item) => item.id === (chosen ?? preferred)),
    ),
  );
  const [hovered, setHovered] = useState<number | null>(null);
  const focused = items[index]!;

  useEffect(() => onFocus?.(focused.id), [focused.id, onFocus]);

  const step = useCallback((delta: number) => setIndex((i) => (i + delta + count) % count), [count]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === 'ArrowLeft') step(-1);
      else if (event.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step]);

  // Offsets round the ring: with three cards one stands on each side; with two the other waits on the right.
  const half = Math.floor((count - 1) / 2);
  const offsets = items.map((_, i) => ((i - index + count + half) % count) - half);
  const previous = useRef<Partial<Record<T, number>>>({});
  useEffect(() => {
    items.forEach((item, i) => {
      previous.current[item.id] = offsets[i];
    });
  });

  return (
    <div className="flex w-full flex-col items-center">
      <div className="relative w-full shrink-0" style={{ height: fitted, perspective: 1600 }}>
        {items.map((item, i) => {
          const offset = offsets[i]!;
          const distance = Math.abs(offset);
          const isFocused = offset === 0;
          const before = previous.current[item.id];
          const jump = before !== undefined && Math.abs(before - offset) > 1;
          return (
            <motion.div
              key={item.id}
              className="absolute left-1/2 top-0"
              style={{ height: fitted, aspectRatio: '0.66', zIndex: 10 - distance }}
              initial={false}
              animate={{
                x: `calc(-50% + ${Math.sign(offset) * (distance === 0 ? 0 : 92 + (distance - 1) * 50)}%)`,
                scale: isFocused ? 1 : 0.8,
                rotateY: isFocused ? 0 : offset > 0 ? -24 : 24,
                filter: isFocused
                  ? `brightness(${item.disabled ? 0.55 : 1}) saturate(${item.disabled ? 0.3 : 1})`
                  : `brightness(${hovered === i ? 0.75 : 0.4}) saturate(0.6)`,
              }}
              transition={jump ? { duration: 0 } : { type: 'spring', stiffness: 220, damping: 30 }}
              onPointerEnter={() => setHovered(i)}
              onPointerLeave={() => setHovered((h) => (h === i ? null : h))}
              onClick={() => (isFocused ? !item.disabled && onChoose(item.id) : setIndex(i))}
            >
              {item.render({ focused: isFocused, hovered: hovered === i })}
            </motion.div>
          );
        })}
        {count > 1 && (
          <>
            <IconButton
              label={`Назад: ${label}`}
              className="absolute left-6 top-1/2 z-20 -translate-y-1/2"
              size={44}
              onClick={() => step(-1)}
            >
              <IconPrev width={26} height={26} />
            </IconButton>
            <IconButton
              label={`Дальше: ${label}`}
              className="absolute right-6 top-1/2 z-20 -translate-y-1/2"
              size={44}
              onClick={() => step(1)}
            >
              <IconNext width={26} height={26} />
            </IconButton>
          </>
        )}
      </div>
      <div className="mt-6 flex h-11 items-center">
        {chosen === focused.id ? (
          <span className="flex items-center gap-2 text-frame-bright">
            <IconCheck width={16} height={16} />
            {chosenLabel}
          </span>
        ) : focused.disabled ? (
          <span className="text-sm text-ink-faint">{disabledLabel}</span>
        ) : (
          <Button variant="primary" onClick={() => onChoose(focused.id)}>
            {chooseLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
