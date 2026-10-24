import React from 'react';

/**
 * Grimdark ornament: the double-headed eagle of the Imperium, drawn on a 32×32 grid in
 * `currentColor`. One half is drawn and mirrored, so both heads and wings stay identical.
 */
const AquilaHalf: React.FC = () => (
  <>
    {/* Wing: a sweep of five stepped primaries. */}
    <path d="M15 13.2C11.2 10.4 6.4 9.2 1.2 10.2L3.6 11.9 1.8 13.4 5 14.1 3.4 15.9 6.9 16.1 6 18 9.6 17.4 9.6 19.2 12.6 17.6 14.8 16.4Z" />
    {/* Neck and head, the beak turned outwards. */}
    <path d="M15.2 12.4 13.6 9.4C12.9 8.1 12.1 7.4 11.2 7.3 10.4 7.2 9.6 7.6 9 8.3L10.4 8.5 9.6 9.4 11.4 9 13.2 12.6Z" />
  </>
);

/** The eagle as SVG content, to place inside a 32×32 viewBox. */
export const AquilaGlyph: React.FC = () => (
  <g fill="currentColor">
    <AquilaHalf />
    <g transform="translate(32 0) scale(-1 1)">
      <AquilaHalf />
    </g>
    {/* Body and tail between the wings. */}
    <path d="M16 10.6 17.4 13.2 17 21.4 18.6 25.6 16 24.4 13.4 25.6 15 21.4 14.6 13.2Z" />
  </g>
);
