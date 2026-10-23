import React from 'react';
import type { Setting } from '@itd/schema';
import { useSetting } from '../theme/SettingScope';
import { starPath } from './highFantasy';

/** Small heraldic mark of each setting, drawn in `currentColor` on a 32×32 grid. */
const EMBLEMS: Record<Setting, React.ReactNode> = {
  // A sprig with two leaves under the eight-pointed star.
  'high-fantasy': (
    <>
      <path d={starPath(16, 9, 6, 2.4)} fill="currentColor" />
      <path d="M16 30V17" stroke="currentColor" strokeWidth="1.2" />
      <path d="M16 24C11 24 8 21 7.5 17.5 11.5 17.5 15 20 16 24ZM16 21C21 21 24 18 24.5 14.5 20.5 14.5 17 17 16 21Z" fill="currentColor" />
    </>
  ),
  // Spread wings over a single upright blade.
  grimdark: (
    <>
      <path d="M16 4V29M12.5 25h7" stroke="currentColor" strokeWidth="1.8" />
      <path d="M15 11C11 7 6 6 2 7.5 5 9 7 11 8 14 10 12.5 13 12 15 13ZM17 11C21 7 26 6 30 7.5 27 9 25 11 24 14 22 12.5 19 12 17 13Z" fill="currentColor" />
    </>
  ),
  // A hexagonal node with an inner ring.
  'sci-fi': (
    <>
      <path d="M16 3 27.3 9.5V22.5L16 29 4.7 22.5V9.5Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="16" cy="16" r="5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="16" cy="16" r="1.6" fill="currentColor" />
    </>
  ),
  // A crown of thorns around a low flame.
  'dark-fantasy': (
    <>
      <path d="M5 21C9 25 23 25 27 21M7 19l-2-4M11 22l-1.5-4.5M16 23v-5M21 22l1.5-4.5M25 19l2-4" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <path d="M16 6C18.5 10 19 12.5 16 16 13 12.5 13.5 10 16 6Z" fill="currentColor" />
    </>
  ),
};

export const SettingEmblem: React.FC<{ size?: number; className?: string }> = ({ size = 28, className }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className={className}>
    {EMBLEMS[useSetting()]}
  </svg>
);
