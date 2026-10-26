import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { IconDown } from './icons';
import { useAtLeast } from './useBreakpoint';

/** Content hidden below the edge by less than this is not worth a cue. */
const SLACK = 12;
/** A scroller this short is a list inside a card, not a screen: it goes without a cue. */
const MIN_HEIGHT = 160;
/** How far the cue sits above the bottom edge of its scroller. */
const LIFT = 34;

type Cue = { key: number; x: number; y: number; target: Element };

const scrollsDown = (el: Element): boolean => {
  if (el === document.scrollingElement) return el.scrollHeight > window.innerHeight + SLACK;
  if (el.scrollHeight <= el.clientHeight + SLACK) return false;
  const { overflowY } = getComputedStyle(el);
  return overflowY === 'auto' || overflowY === 'scroll';
};

const ids = new WeakMap<Element, number>();
let nextId = 0;
const idOf = (el: Element) => ids.get(el) ?? (ids.set(el, ++nextId), nextId);

/** Every scroller on screen with more of itself below its edge, where its cue would stand. */
const findCues = (): Cue[] => {
  const cues: Cue[] = [];
  const root = document.scrollingElement;
  const candidates = [...(root ? [root] : []), ...document.body.querySelectorAll('*')];
  for (const el of candidates) {
    if (!scrollsDown(el) || el.closest('[data-no-scroll-cue]')) continue;
    const isRoot = el === root;
    const rect = isRoot
      ? { left: 0, top: 0, width: window.innerWidth, bottom: window.innerHeight, height: window.innerHeight }
      : el.getBoundingClientRect();
    const bottom = Math.min(rect.bottom, window.innerHeight);
    if (rect.height < MIN_HEIGHT || bottom - Math.max(rect.top, 0) < MIN_HEIGHT || rect.width < 120) continue;
    const below = isRoot
      ? el.scrollHeight - (window.scrollY + window.innerHeight)
      : el.scrollHeight - (el.scrollTop + el.clientHeight);
    if (below <= SLACK) continue;
    const x = rect.left + rect.width / 2;
    const y = bottom - LIFT;
    // Only where the scroller itself is on top: not under a dialog or a drawer laid over it.
    const hit = document.elementsFromPoint(x, y).find((node) => !node.closest('.ui-scroll-cue'));
    if (!hit || (isRoot ? hit.closest('[role=dialog]') : !el.contains(hit))) continue;
    cues.push({ key: idOf(el), x, y, target: el });
  }
  // Two cues at the same spot (a page and the screen-high box inside it): the inner one speaks.
  return cues.filter(
    (cue) => !cues.some((other) => other !== cue && cue.target.contains(other.target) && Math.abs(other.y - cue.y) < 40),
  );
};

/**
 * On a phone scrollbars are hidden (base.css); instead a caret at the bottom centre of a scroller
 * says there is more below, and goes once its end is reached. A tap on it scrolls most of a screen on.
 */
export const ScrollCues: React.FC = () => {
  const phone = !useAtLeast('tablet');
  const [cues, setCues] = useState<Cue[]>([]);

  useEffect(() => {
    if (!phone) {
      setCues([]);
      return;
    }
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = findCues();
        setCues((current) =>
          current.length === next.length &&
          current.every((cue, i) => cue.key === next[i]!.key && cue.x === next[i]!.x && cue.y === next[i]!.y)
            ? current
            : next,
        );
      });
    };
    update();
    // Content arrives late (lazy screens, data, animations settling), so look again a little after.
    const timer = setInterval(update, 1000);
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('scroll', update, { capture: true, passive: true });
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(timer);
      observer.disconnect();
      window.removeEventListener('scroll', update, { capture: true });
      window.removeEventListener('resize', update);
    };
  }, [phone]);

  return (
    <AnimatePresence>
      {cues.map((cue) => (
        <motion.button
          key={cue.key}
          type="button"
          aria-label="Прокрутить ниже"
          className="ui-scroll-cue"
          style={{ left: cue.x, top: cue.y }}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          onClick={() => {
            const target = cue.target === document.scrollingElement ? window : cue.target;
            const height = target === window ? window.innerHeight : (cue.target as HTMLElement).clientHeight;
            target.scrollBy({ top: height * 0.7, behavior: 'smooth' });
          }}
        >
          <IconDown width={16} height={16} />
        </motion.button>
      ))}
    </AnimatePresence>
  );
};
