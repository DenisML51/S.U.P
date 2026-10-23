import React from 'react';

/**
 * High fantasy ornament, after the illuminated borders of Tolkien-era book design: square double
 * rules whose corners open into curling vines, almond leaves and the eight-pointed star.
 *
 * Corner pieces are drawn ON the frame they decorate: their straight strokes coincide with the
 * frame's rules and the flourish grows inwards from the corner, so frame and ornament read as one.
 * Everything is drawn in `currentColor`.
 */

/** Almond leaf with a midrib, 9 units long, its base at the origin pointing along +x. */
const Leaf: React.FC<{ x: number; y: number; angle: number; scale?: number }> = ({ x, y, angle, scale = 1 }) => (
  <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`}>
    <path d="M0 0C2.5-2.4 6.5-2.4 9 0 6.5 2.4 2.5 2.4 0 0Z" fill="currentColor" />
    <path d="M0.8 0H8" stroke="rgb(var(--c-bg-deep))" strokeWidth="0.35" opacity="0.55" />
  </g>
);

/** Star polygon with `points` rays, as drawn in Elvish heraldry. */
export const starPath = (cx: number, cy: number, outer: number, inner: number, points = 8): string => {
  const step = Math.PI / points;
  return (
    Array.from({ length: points * 2 }, (_, i) => {
      const radius = i % 2 === 0 ? outer : inner;
      const angle = i * step - Math.PI / 2;
      return `${i === 0 ? 'M' : 'L'}${(cx + radius * Math.cos(angle)).toFixed(2)} ${(cy + radius * Math.sin(angle)).toFixed(2)}`;
    }).join('') + 'Z'
  );
};

/**
 * Panel corner, 32×32. The panel's 1px border runs along x = 0.5 and y = 0.5 of this box; the
 * corner thickens that border near the corner and sends a curl with two leaves inwards.
 */
export const VineCorner: React.FC = () => (
  <>
    <path d="M0.75 24V0.75H24" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path d="M0.75 0.75C5 5 9 7.5 12.5 8 15.8 8.4 17 5.6 15 4.3 13.4 3.3 11.7 4.8 12.6 6.2" fill="none" stroke="currentColor" strokeWidth="0.9" />
    <path d="M0.75 0.75C5 5 7.5 9 8 12.5 8.4 15.8 5.6 17 4.3 15 3.3 13.4 4.8 11.7 6.2 12.6" fill="none" stroke="currentColor" strokeWidth="0.9" />
    <Leaf x={17} y={2.6} angle={-12} scale={0.75} />
    <Leaf x={2.6} y={17} angle={102} scale={0.75} />
    <path d={starPath(0.75, 0.75, 3.4, 1.4)} fill="currentColor" />
  </>
);

/** Divider mark: an eight-pointed star between two tendrils ending in leaves. */
export const StarRule: React.FC = () => (
  <svg width="86" height="14" viewBox="0 0 86 14" aria-hidden>
    <path d="M6 7C14 7 20 4.5 26 7 30 8.6 33 7 35.5 7M80 7C72 7 66 4.5 60 7 56 8.6 53 7 50.5 7" fill="none" stroke="currentColor" strokeWidth="0.8" />
    <Leaf x={6} y={7} angle={180} scale={0.7} />
    <Leaf x={80} y={7} angle={0} scale={0.7} />
    <path d={starPath(43, 7, 6, 2.4)} fill="currentColor" />
    <circle cx="43" cy="7" r="1.1" fill="rgb(var(--c-bg-deep))" />
  </svg>
);

/** Distance of the screen-corner flourishes from the window edge, in px. */
export const FRAME_OUTER = 18;
const FRAME_GAP = 5;

/**
 * Screen-corner flourish, 130×130: two short rules meeting at a star, a vine spiralling inwards
 * and tendrils along each rule that fade out rather than end abruptly.
 */
export const VineFrameCorner: React.FC = () => {
  const g = FRAME_GAP + 0.5;
  return (
    <svg width="130" height="130" viewBox="0 0 130 130" fill="none" aria-hidden>
      <defs>
        <linearGradient id="hf-fade-x" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0.4" stopColor="currentColor" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hf-fade-y" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0.4" stopColor="currentColor" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0.5 0.5H130" stroke="url(#hf-fade-x)" strokeWidth="1" />
      <path d="M0.5 0.5V130" stroke="url(#hf-fade-y)" strokeWidth="1" />
      <path d={`M${g} ${g}H110`} stroke="url(#hf-fade-x)" strokeWidth="0.6" opacity="0.6" />
      <path d={`M${g} ${g}V110`} stroke="url(#hf-fade-y)" strokeWidth="0.6" opacity="0.6" />

      {/* Main stem: from the joint, diagonally in, ending in a spiral. */}
      <path d="M6 6C16 14 24 20 30 30 34 37 42 42 50 40 57 38 57 29 50 28 45 27.5 43 32 46.5 34" stroke="currentColor" strokeWidth="1" />
      {/* Tendrils along each rule, curling at their ends. */}
      <path d="M8 6C24 7 36 11 46 18 52 22 58 20 58 15 58 10.5 53 10 52 13.5" stroke="currentColor" strokeWidth="0.8" />
      <path d="M6 8C7 24 11 36 18 46 22 52 20 58 15 58 10.5 58 10 53 13.5 52" stroke="currentColor" strokeWidth="0.8" />
      <path d="M58 15C70 13.5 82 10 96 9.5M15 58C13.5 70 10 82 9.5 96" stroke="currentColor" strokeWidth="0.7" opacity="0.8" />

      <Leaf x={22} y={9.5} angle={-20} scale={1.2} />
      <Leaf x={34} y={15} angle={30} scale={1.1} />
      <Leaf x={9.5} y={22} angle={110} scale={1.2} />
      <Leaf x={15} y={34} angle={60} scale={1.1} />
      <Leaf x={36} y={33} angle={-70} scale={1} />
      <Leaf x={33} y={36} angle={160} scale={1} />
      <Leaf x={96} y={9.5} angle={-8} scale={1} />
      <Leaf x={9.5} y={96} angle={98} scale={1} />

      <path d={starPath(3, 3, 7, 2.8)} fill="currentColor" />
      <circle cx="3" cy="3" r="1.4" fill="rgb(var(--c-bg-deep))" />
    </svg>
  );
};
