import React, { useEffect, useRef } from 'react';
import { cx } from './primitives';

type Vec = [number, number, number];

const PHI = (1 + Math.sqrt(5)) / 2;

/** Edges between every nearest pair of vertices (the solids here have equal edges). */
function nearestEdges(vertices: Vec[], tolerance = 1.08): [number, number][] {
  const dist = (a: Vec, b: Vec) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  let min = Infinity;
  vertices.forEach((a, i) => vertices.forEach((b, j) => j > i && (min = Math.min(min, dist(a, b)))));
  const edges: [number, number][] = [];
  vertices.forEach((a, i) =>
    vertices.forEach((b, j) => j > i && dist(a, b) < min * tolerance && edges.push([i, j])),
  );
  return edges;
}

const normalise = (vertices: Vec[]): Vec[] => {
  const r = Math.max(...vertices.map(([x, y, z]) => Math.hypot(x, y, z)));
  return vertices.map(([x, y, z]) => [x / r, y / r, z / r]);
};

const D20 = normalise([
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
] as Vec[]);

/** The ten-sided die: two apexes and a zigzag ring of ten vertices between them. */
const D10_RING: Vec[] = Array.from({ length: 10 }, (_, i) => {
  const a = (i * Math.PI) / 5;
  return [Math.cos(a) * 0.95, i % 2 === 0 ? 0.12 : -0.12, Math.sin(a) * 0.95];
});
const D10: Vec[] = [[0, 1, 0], [0, -1, 0], ...D10_RING];
const D10_EDGES: [number, number][] = [
  ...D10_RING.map((_, i) => [i % 2 === 0 ? 0 : 1, i + 2] as [number, number]),
  ...D10_RING.map((_, i) => [i + 2, ((i + 1) % 10) + 2] as [number, number]),
];

const D6 = normalise([-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) => [x, y, z] as Vec))));

/** The tetrahedron: alternate corners of a cube. */
const D4 = normalise([
  [1, 1, 1],
  [1, -1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
] as Vec[]);

/** The octahedron: a vertex on each half-axis. */
const D8: Vec[] = [0, 1, 2].flatMap((axis) =>
  [-1, 1].map((sign) => [0, 1, 2].map((k) => (k === axis ? sign : 0)) as Vec),
);

/** The dodecahedron: the cube's corners plus three golden rectangles, one in each coordinate plane. */
const D12 = normalise([
  ...D6.map(([x, y, z]) => [Math.sign(x), Math.sign(y), Math.sign(z)] as Vec),
  ...[-1, 1].flatMap((a) =>
    [-1, 1].flatMap(
      (b) =>
        [
          [0, a / PHI, b * PHI],
          [a / PHI, b * PHI, 0],
          [b * PHI, 0, a / PHI],
        ] as Vec[],
    ),
  ),
]);

const SHAPES = {
  d20: { vertices: D20, edges: nearestEdges(D20) },
  d12: { vertices: D12, edges: nearestEdges(D12) },
  d10: { vertices: D10, edges: D10_EDGES },
  d8: { vertices: D8, edges: nearestEdges(D8) },
  d6: { vertices: D6, edges: nearestEdges(D6) },
  d4: { vertices: D4, edges: nearestEdges(D4) },
} as const;

export type DieShape = keyof typeof SHAPES;

/** Radians per second of the slow turn; `spin` multiplies it. */
const BASE_SPEED = 0.35;

/**
 * A die drawn as turning wireframe, in the colour of the text around it. `spin` sets how fast it
 * turns (it eases to a new speed, so a hover winds it up and leaving lets it settle); faces turned
 * away are fainter, so the solid reads without shading.
 */
export const WireDie: React.FC<{ shape: DieShape; spin?: number; phase?: number; className?: string }> = ({
  shape,
  spin = 1,
  phase = 0,
  className,
}) => {
  const { vertices, edges } = SHAPES[shape];
  const lines = useRef<(SVGLineElement | null)[]>([]);
  const target = useRef(spin);
  target.current = spin;
  /** Restarts the turn after it came to rest at zero speed. */
  const wake = useRef<() => void>(() => {});

  useEffect(() => {
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let angle = 0.6 + phase;
    let speed = target.current;
    let last = performance.now();
    let frame = 0;
    let running = true;
    const render = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!still) {
        speed += (target.current - speed) * Math.min(1, dt * 2.5);
        angle += dt * BASE_SPEED * speed;
      }
      const [sy, cy] = [Math.sin(angle), Math.cos(angle)];
      const tilt = 0.45 + Math.sin(angle * 0.7) * 0.2;
      const [sx, cx] = [Math.sin(tilt), Math.cos(tilt)];
      const projected = vertices.map(([x, y, z]) => {
        const x1 = x * cy + z * sy;
        const z1 = -x * sy + z * cy;
        return [x1, y * cx - z1 * sx, y * sx + z1 * cx] as const;
      });
      edges.forEach(([a, b], i) => {
        const line = lines.current[i];
        if (!line) return;
        const [pa, pb] = [projected[a], projected[b]];
        line.setAttribute('x1', pa[0].toFixed(4));
        line.setAttribute('y1', pa[1].toFixed(4));
        line.setAttribute('x2', pb[0].toFixed(4));
        line.setAttribute('y2', pb[1].toFixed(4));
        line.style.strokeOpacity = (0.5 + ((pa[2] + pb[2]) / 2) * 0.5).toFixed(3);
      });
      // A die told to stand still stops drawing once it has settled, so static dice cost nothing.
      running = !still && !(target.current === 0 && Math.abs(speed) < 0.002);
      if (running) frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    wake.current = () => {
      if (running || still) return;
      running = true;
      last = performance.now();
      frame = requestAnimationFrame(render);
    };
    return () => {
      cancelAnimationFrame(frame);
      wake.current = () => {};
    };
  }, [vertices, edges, phase]);

  useEffect(() => wake.current(), [spin]);

  return (
    <svg viewBox="-1.15 -1.15 2.3 2.3" className={cx('overflow-visible', className)} aria-hidden>
      {edges.map((_, i) => (
        <line
          key={i}
          ref={(el) => {
            lines.current[i] = el;
          }}
          stroke="currentColor"
          strokeWidth={0.022}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          style={{ strokeWidth: 1.4 }}
        />
      ))}
    </svg>
  );
};
