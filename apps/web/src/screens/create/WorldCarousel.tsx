import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DEFAULT_SETTING, SETTINGS, type Setting } from '@itd/schema';
import { Button, IconButton } from '../../ui/primitives';
import { IconCheck, IconNext, IconPrev } from '../../ui/icons';
import { WorldCard } from './WorldCard';
import { WORLD_LORE } from './worldLore';

type Origin = { x: number; y: number };

/** Scaled down on a phone by the stage around it (`--stage-fit`), so the lore below still fits. */
const CARD_HEIGHT = 'calc(min(50vh, 500px) * var(--stage-fit, 1))';
const COUNT = SETTINGS.length;
/** How many cards stand on each side of the one in front. */
const HALF = Math.floor(COUNT / 2);
/** The size of a card and the dark it stands in, by how far it is from the front. */
const SCALES = [1, 0.8, 0.68, 0.58];
const SHADES = [0, 0.55, 0.72, 0.82];
/**
 * The faces the worlds speak in, loaded as the ring appears: a face arriving in the middle of a
 * turn makes the browser lay out every picture on the screen again.
 */
/** A Cyrillic letter and a Latin one: each face is loaded for both alphabets. */
const FACE_SAMPLE = `${String.fromCharCode(0x416)}W`;
const WORLD_FACES = ['Cinzel', 'Forum', 'Alegreya', 'Alegreya SC', 'Albion Capitals', 'Poiret One', 'Tektur'];

const centreOf = (element: Element | null | undefined): Origin => {
  const rect = element?.getBoundingClientRect();
  return rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
};

/**
 * The worlds to begin in, the one in front and the others fanned round it, as heroes are on hero
 * select. The worlds make a ring, as many standing on each side; the one in front stays awake
 * (its hover marvel plays) and is told of below. The screen takes the look of the world in front
 * (`onFocus`); a world is chosen by clicking it in front or with the button under it.
 */
export const WorldCarousel: React.FC<{
  chosen: Setting | null;
  onChoose: (setting: Setting, origin: Origin) => void;
  onFocus: (setting: Setting) => void;
}> = ({ chosen, onChoose, onFocus }) => {
  const [index, setIndex] = useState(() => SETTINGS.indexOf(chosen ?? DEFAULT_SETTING));
  const [hovered, setHovered] = useState<number | null>(null);
  const focused = SETTINGS[index]!;
  // Each card by its world: the flourish starts at the centre of the one in front.
  const cards = useRef<Partial<Record<Setting, HTMLDivElement | null>>>({});

  useEffect(() => onFocus(focused), [focused, onFocus]);
  useEffect(() => {
    for (const face of WORLD_FACES) for (const weight of [400, 700, 900]) void document.fonts.load(`${weight} 1em "${face}"`, FACE_SAMPLE).catch(() => undefined);
  }, []);

  const step = useCallback((delta: number) => setIndex((i) => (i + delta + COUNT) % COUNT), []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') step(-1);
      else if (event.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step]);

  // A click on the card in front chooses it, on another brings it to the front. The handlers stay
  // the same from render to render, so a card is drawn again only when its place changes.
  const latest = useRef({ index, onChoose });
  latest.current = { index, onChoose };
  const handlers = useMemo(
    () =>
      SETTINGS.map((id, i) => (origin: Origin) => {
        if (latest.current.index === i) latest.current.onChoose(id, origin);
        else setIndex(i);
      }),
    [],
  );

  // Offsets round the ring, as many on each side. A card that wraps from one end to the other
  // jumps there rather than flying across the one in front.
  const offsets = SETTINGS.map((_, i) => ((i - index + COUNT + HALF) % COUNT) - HALF);
  const previous = useRef<Partial<Record<Setting, number>>>({});
  useEffect(() => {
    SETTINGS.forEach((id, i) => {
      previous.current[id] = offsets[i];
    });
  });

  return (
    <div className="flex w-full flex-col items-center">
      <div className="relative w-full shrink-0" style={{ height: CARD_HEIGHT, perspective: 1600 }}>
        {SETTINGS.map((id, i) => {
          const offset = offsets[i]!;
          const distance = Math.abs(offset);
          const isFocused = offset === 0;
          const before = previous.current[id];
          const jump = before !== undefined && Math.abs(before - offset) > HALF;
          return (
            <motion.div
              key={id}
              ref={(element: HTMLDivElement | null) => {
                cards.current[id] = element;
              }}
              className="absolute left-1/2 top-0 will-change-transform"
              style={{ height: CARD_HEIGHT, aspectRatio: '0.62', zIndex: 10 - distance }}
              initial={false}
              // Only the card's transform moves; its dimming is a layer of dark over it that fades,
              // so nothing in the card is drawn again while the ring turns.
              animate={{
                x: `calc(-50% + ${Math.sign(offset) * (distance === 0 ? 0 : 80 + (distance - 1) * 48)}%)`,
                scale: SCALES[distance],
                rotateY: offset === 0 ? 0 : offset > 0 ? -22 : 22,
              }}
              transition={jump ? { duration: 0 } : { type: 'spring', stiffness: 220, damping: 30 }}
              onPointerEnter={() => setHovered(i)}
              onPointerLeave={() => setHovered((h) => (h === i ? null : h))}
            >
              <WorldCard
                setting={id}
                selected={isFocused}
                awake={isFocused}
                distant={distance === HALF}
                shade={isFocused ? 0 : hovered === i ? 0.3 : SHADES[distance]}
                onSelect={handlers[i]!}
              />
            </motion.div>
          );
        })}
        <IconButton label="Предыдущий мир" className="absolute left-6 top-1/2 z-20 -translate-y-1/2" size={44} onClick={() => step(-1)}>
          <IconPrev width={26} height={26} />
        </IconButton>
        <IconButton label="Следующий мир" className="absolute right-6 top-1/2 z-20 -translate-y-1/2" size={44} onClick={() => step(1)}>
          <IconNext width={26} height={26} />
        </IconButton>
      </div>

      {/* On a phone the card says the world's name and that is enough: no room for its story. */}
      <div className="mt-7 h-32 w-full max-w-xl max-sm:hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={focused}
            className="ui-world-lore"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            <span className="ui-world-lore__tagline">{WORLD_LORE[focused].tagline}</span>
            <span className="ui-world-lore__text">{WORLD_LORE[focused].description}</span>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="mt-4 flex h-11 items-center max-sm:mt-6">
        {chosen === focused ? (
          <span className="flex items-center gap-2 text-frame-bright">
            <IconCheck width={16} height={16} />
            Этот мир выбран
          </span>
        ) : (
          <Button variant="primary" onClick={() => onChoose(focused, centreOf(cards.current[focused]))}>
            Выбрать этот мир
          </Button>
        )}
      </div>
    </div>
  );
};
