import type React from 'react';

/** How long a finger holds before the press counts as long, ms. */
const HOLD_MS = 500;
/** A finger that travels further than this is scrolling, not holding, px. */
const SLOP_PX = 10;

// One finger presses one thing at a time: the press in progress lives here, not in each element.
let timer: number | undefined;
let start: { x: number; y: number } | null = null;
let firedAt = 0;

const cancel = () => {
  window.clearTimeout(timer);
  timer = undefined;
  start = null;
};
const justFired = () => Date.now() - firedAt < 700;

/**
 * The right click of a touch screen: holding a finger on the element does what the right button
 * does with a mouse (a card, a menu, taking a die away), and the tap that ends the hold is not taken
 * as a click. The right button itself goes on working. Spread the props on the element; it should
 * not set the same handlers itself.
 */
export const longPress = (onPress: () => void) => ({
  onPointerDown: (event: React.PointerEvent) => {
    if (event.pointerType === 'mouse') return;
    cancel();
    start = { x: event.clientX, y: event.clientY };
    timer = window.setTimeout(() => {
      timer = undefined;
      firedAt = Date.now();
      navigator.vibrate?.(10);
      onPress();
    }, HOLD_MS);
  },
  onPointerMove: (event: React.PointerEvent) => {
    if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > SLOP_PX) cancel();
  },
  onPointerUp: cancel,
  onPointerCancel: cancel,
  onClickCapture: (event: React.MouseEvent) => {
    if (!justFired()) return;
    event.preventDefault();
    event.stopPropagation();
  },
  // Android opens the context menu on a long press of its own: the hold has already answered it.
  onContextMenu: (event: React.MouseEvent) => {
    event.preventDefault();
    if (!justFired()) onPress();
  },
});
