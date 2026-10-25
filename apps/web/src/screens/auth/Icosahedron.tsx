import React, { useEffect, useRef } from 'react';
import { cx } from '../../ui/primitives';

const PHI = (1 + Math.sqrt(5)) / 2;
const RADIUS = Math.sqrt(1 + PHI * PHI);

/** The twenty-sided die: twelve vertices on the golden rectangles, an edge between every nearest pair. */
const VERTICES: [number, number, number][] = [
  [-1, PHI, 0],
  [1, PHI, 0],
  [-1, -PHI, 0],
  [1, -PHI, 0],
  [0, -1, PHI],
  [0, 1, PHI],
  [0, -1, -PHI],
  [0, 1, -PHI],
  [PHI, 0, -1],
  [PHI, 0, 1],
  [-PHI, 0, -1],
  [-PHI, 0, 1],
].map(([x, y, z]) => [x / RADIUS, y / RADIUS, z / RADIUS] as [number, number, number]);

const EDGES: [number, number][] = [];
VERTICES.forEach((a, i) =>
  VERTICES.forEach((b, j) => {
    if (j > i && Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 1.1) EDGES.push([i, j]);
  }),
);

/** Radians per second of the slow turn; `spin` multiplies it (a roll while the account loads). */
const BASE_SPEED = 0.09;

/**
 * A wireframe d20 turning slowly in the dark, drawn as fine line-art. With `draw` its edges trace
 * themselves in first. Edges facing away are fainter, so the solid reads without any shading.
 */
export const Icosahedron: React.FC<{ spin?: number; draw?: boolean; className?: string }> = ({
  spin = 1,
  draw,
  className,
}) => {
  const lines = useRef<(SVGLineElement | null)[]>([]);
  const target = useRef(spin);
  target.current = spin;

  useEffect(() => {
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let angle = 0.6;
    let speed = target.current;
    let last = performance.now();
    let frame = 0;

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!still) {
        speed += (target.current - speed) * Math.min(1, dt * 1.5);
        angle += dt * BASE_SPEED * speed;
      }
      const [sy, cy] = [Math.sin(angle), Math.cos(angle)];
      const tilt = 0.42 + Math.sin(angle * 0.6) * 0.18;
      const [sx, cx] = [Math.sin(tilt), Math.cos(tilt)];
      const projected = VERTICES.map(([x, y, z]) => {
        const x1 = x * cy + z * sy;
        const z1 = -x * sy + z * cy;
        return [x1, y * cx - z1 * sx, y * sx + z1 * cx] as const;
      });
      EDGES.forEach(([a, b], i) => {
        const line = lines.current[i];
        if (!line) return;
        const [pa, pb] = [projected[a], projected[b]];
        line.setAttribute('x1', pa[0].toFixed(4));
        line.setAttribute('y1', pa[1].toFixed(4));
        line.setAttribute('x2', pb[0].toFixed(4));
        line.setAttribute('y2', pb[1].toFixed(4));
        const depth = (pa[2] + pb[2]) / 2;
        line.style.strokeOpacity = (0.55 + depth * 0.45).toFixed(3);
      });
      if (!still) frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <svg
      viewBox="-1.05 -1.05 2.1 2.1"
      className={cx('ui-d20', draw && 'ui-d20--draw', className)}
      aria-hidden
    >
      {EDGES.map((_, i) => (
        <line
          key={i}
          ref={(el) => (lines.current[i] = el)}
          pathLength={1}
          style={{ '--i': i } as React.CSSProperties}
        />
      ))}
    </svg>
  );
};
