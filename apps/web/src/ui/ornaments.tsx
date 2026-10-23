import React from 'react';
import type { Setting } from '@itd/schema';
import { useSetting } from './theme/SettingScope';

/**
 * Small line ornaments drawn in `currentColor`. Each setting has its own vocabulary:
 * gilt flourishes, riveted brackets, HUD corners, thorns.
 */

const CORNERS: Record<Setting, React.ReactNode> = {
  'high-fantasy': (
    <>
      <path d="M1 23V7C1 3.7 3.7 1 7 1h16" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M4.5 19V9c0-2.5 2-4.5 4.5-4.5h10" fill="none" stroke="currentColor" strokeWidth="0.75" opacity="0.55" />
      <path d="M7 7l3-1.4 1.4 3L8.4 10z" fill="currentColor" />
      <path d="M1 23c1.5-1 2-2.5 2-4M23 1c-1 1.5-2.5 2-4 2" fill="none" stroke="currentColor" strokeWidth="0.75" />
    </>
  ),
  grimdark: (
    <>
      <path d="M1 24V1h23" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="6" cy="6" r="2" fill="currentColor" />
      <path d="M1 14h4M14 1v4" stroke="currentColor" strokeWidth="2" />
    </>
  ),
  'sci-fi': (
    <>
      <path d="M1 14V1h13" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 5h4" stroke="currentColor" strokeWidth="1" opacity="0.7" />
    </>
  ),
  'dark-fantasy': (
    <>
      <path d="M1 20V1h19" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M1 1l7 7M8 8l-2 4M8 8l4-2" fill="none" stroke="currentColor" strokeWidth="0.9" />
    </>
  ),
};

export const Corners: React.FC<{ setting?: Setting }> = ({ setting }) => {
  const current = useSetting();
  const art = CORNERS[setting ?? current];
  return (
    <>
      {(['tl', 'tr', 'bl', 'br'] as const).map((position) => (
        <svg key={position} className={`ui-corner ui-corner--${position}`} viewBox="0 0 24 24" aria-hidden>
          {art}
        </svg>
      ))}
    </>
  );
};

const RULE_MARKS: Record<Setting, React.ReactNode> = {
  'high-fantasy': (
    <svg width="34" height="10" viewBox="0 0 34 10" aria-hidden>
      <path d="M17 1l4 4-4 4-4-4z" fill="none" stroke="currentColor" />
      <circle cx="17" cy="5" r="1.2" fill="currentColor" />
      <path d="M2 5h8M24 5h8" stroke="currentColor" strokeWidth="0.75" />
      <circle cx="11" cy="5" r="0.9" fill="currentColor" />
      <circle cx="23" cy="5" r="0.9" fill="currentColor" />
    </svg>
  ),
  grimdark: (
    <svg width="30" height="10" viewBox="0 0 30 10" aria-hidden>
      <path d="M2 2l13 6 13-6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13" y="0" width="4" height="4" fill="currentColor" />
    </svg>
  ),
  'sci-fi': (
    <svg width="34" height="6" viewBox="0 0 34 6" aria-hidden>
      <path d="M0 3h6M10 3h14M28 3h6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  'dark-fantasy': (
    <svg width="24" height="12" viewBox="0 0 24 12" aria-hidden>
      <path d="M12 0v12M7 4h10" stroke="currentColor" strokeWidth="1" />
    </svg>
  ),
};

export const RuleMark: React.FC = () => <>{RULE_MARKS[useSetting()]}</>;
