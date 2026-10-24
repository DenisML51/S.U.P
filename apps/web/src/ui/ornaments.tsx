import React from 'react';
import type { Setting } from '@itd/schema';
import { StarRule, VineCorner } from './art/highFantasy';
import { useSetting } from './theme/SettingScope';

/**
 * Small line ornaments drawn in `currentColor`. Each setting has its own vocabulary:
 * Tolkien-style vines, riveted brackets, thorns; sci-fi panes stay bare.
 */

const CORNERS: Record<Setting, React.ReactNode> = {
  'high-fantasy': <VineCorner />,
  grimdark: (
    <>
      <path d="M1 24V1h23" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="6" cy="6" r="2" fill="currentColor" />
      <path d="M1 14h4M14 1v4" stroke="currentColor" strokeWidth="2" />
    </>
  ),
  // A terminal pane has no ornament: its structure is in the rules and the type.
  'sci-fi': null,
  'dark-fantasy': (
    <>
      <path d="M1 20V1h19" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M1 1l7 7M8 8l-2 4M8 8l4-2" fill="none" stroke="currentColor" strokeWidth="0.9" />
    </>
  ),
};

/** The vine is drawn on a finer grid than the other corners. */
const VIEWBOX: Record<Setting, string> = {
  'high-fantasy': '0 0 32 32',
  grimdark: '0 0 24 24',
  'sci-fi': '0 0 24 24',
  'dark-fantasy': '0 0 24 24',
};

export const Corners: React.FC<{ setting?: Setting }> = ({ setting }) => {
  const current = useSetting();
  const art = CORNERS[setting ?? current];
  if (!art) return null;
  return (
    <>
      {(['tl', 'tr', 'bl', 'br'] as const).map((position) => (
        <svg key={position} className={`ui-corner ui-corner--${position}`} viewBox={VIEWBOX[setting ?? current]} aria-hidden>
          {art}
        </svg>
      ))}
    </>
  );
};

const RULE_MARKS: Record<Setting, React.ReactNode> = {
  'high-fantasy': <StarRule />,
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
