import React from 'react';
import type { HomeLayout } from '../../data/settings';
import { cx } from '../../ui/primitives';

interface LayoutInfo {
  id: HomeLayout;
  label: string;
  /** A thumbnail of the page: blocks on a 48×28 grid, `art` ones stand for pictures. */
  blocks: { x: number; y: number; w: number; h: number; art?: boolean; r?: number }[];
}

const LAYOUTS: LayoutInfo[] = [
  {
    id: 'hub',
    label: 'Хаб',
    blocks: [
      { x: 3, y: 3, w: 20, h: 22, art: true },
      { x: 26, y: 4, w: 19, h: 8 },
      { x: 26, y: 14, w: 19, h: 8 },
      { x: 26, y: 24, w: 19, h: 1.5 },
    ],
  },
  {
    id: 'menu',
    label: 'Меню',
    blocks: [
      { x: 4, y: 8, w: 10, h: 2.5 },
      { x: 4, y: 12.5, w: 8, h: 1.5 },
      { x: 4, y: 15.5, w: 9, h: 1.5 },
      { x: 4, y: 18.5, w: 7, h: 1.5 },
      { x: 26, y: 0, w: 20, h: 28, art: true },
    ],
  },
  {
    id: 'shelf',
    label: 'Витрина',
    blocks: [
      { x: 3, y: 3, w: 4, h: 4, art: true },
      { x: 8, y: 3, w: 4, h: 4, art: true },
      { x: 13, y: 2, w: 5, h: 5, art: true },
      { x: 21, y: 3, w: 7, h: 4, art: true },
      { x: 3, y: 15, w: 13, h: 3 },
      { x: 3, y: 20, w: 9, h: 1.5 },
      { x: 30, y: 10, w: 15, h: 16, art: true },
    ],
  },
  {
    id: 'hand',
    label: 'Рука',
    blocks: [
      { x: 8, y: 4, w: 10, h: 7, art: true },
      { x: 20, y: 4, w: 10, h: 7, art: true },
      { x: 32, y: 4, w: 8, h: 7 },
      { x: 12, y: 17, w: 7, h: 11, art: true, r: -10 },
      { x: 20.5, y: 15.5, w: 7, h: 12.5, art: true },
      { x: 29, y: 17, w: 7, h: 11, art: true, r: 10 },
    ],
  },
  {
    id: 'mosaic',
    label: 'Мозаика',
    blocks: [
      { x: 3, y: 3, w: 14, h: 22, art: true },
      { x: 19, y: 3, w: 6, h: 10, art: true },
      { x: 27, y: 3, w: 6, h: 10, art: true },
      { x: 19, y: 15, w: 14, h: 10 },
      { x: 35, y: 3, w: 10, h: 10, art: true },
      { x: 35, y: 15, w: 10, h: 10, art: true },
    ],
  },
  {
    id: 'cinema',
    label: 'Кино',
    blocks: [
      { x: 0, y: 0, w: 48, h: 15, art: true },
      { x: 4, y: 18, w: 4, h: 7, art: true },
      { x: 9, y: 18, w: 4, h: 7, art: true },
      { x: 14, y: 18, w: 4, h: 7, art: true },
      { x: 22, y: 19, w: 9, h: 6, art: true },
      { x: 32, y: 19, w: 9, h: 6, art: true },
    ],
  },
];

/** The layouts of the home page as small pictures of it; the chosen one is lit. */
export const HomeLayoutPicker: React.FC<{ value: HomeLayout; onChange: (layout: HomeLayout) => void }> = ({
  value,
  onChange,
}) => (
  <div role="radiogroup" aria-label="Вид главной" className="grid grid-cols-6 gap-2">
    {LAYOUTS.map((layout) => (
      <button
        key={layout.id}
        type="button"
        role="radio"
        aria-checked={layout.id === value}
        onClick={() => onChange(layout.id)}
        className={cx('ui-layout-option p-1.5 text-center', layout.id === value && 'ui-layout-option--chosen')}
      >
        <svg viewBox="0 0 48 28" className="block w-full" aria-hidden>
          <rect width="48" height="28" rx="2" className="ui-layout-option__screen" />
          {layout.blocks.map((b, i) => (
            <rect
              key={i}
              x={b.x}
              y={b.y}
              width={b.w}
              height={b.h}
              rx="0.8"
              className={b.art ? 'ui-layout-option__art' : 'ui-layout-option__block'}
              transform={b.r ? `rotate(${b.r} ${b.x + b.w / 2} ${b.y + b.h})` : undefined}
            />
          ))}
        </svg>
        <span className="mt-1 block text-xs">{layout.label}</span>
      </button>
    ))}
  </div>
);
