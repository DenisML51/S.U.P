import React from 'react';
import type { SettingArt } from './types';

/**
 * Dark fantasy ornament: a hunter's reliquary (Bloodborne's Yharnam, the Imperium's iron, Dragon
 * Age's tooled leather). Tarnished brass engraved in double rules, gothic spikes and rivets at the
 * corners, a pointed arch over major panels, the cross pattée and daggers; fog, candle-dark and a
 * cathedral window around the screen.
 */

/** Engraved corner, 24×24: a double rule, a spike pointing inwards, a rivet where the rules meet. */
const GothicCorner: React.FC = () => (
  <>
    <path d="M0.75 17V0.75H17" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path d="M4.5 10V4.5H10" fill="none" stroke="currentColor" strokeWidth="0.7" opacity="0.75" />
    <path d="M4.5 4.5 11.5 8.2 8.2 11.5Z" fill="currentColor" />
    <circle cx="2.6" cy="2.6" r="1.5" fill="currentColor" />
    <circle cx="2.6" cy="2.6" r="0.6" fill="rgb(var(--c-bg-deep))" />
  </>
);

/** A pointed arch rising over the top edge of a major panel, 120×24, the edge along y = 20. */
const ArchCrest: React.FC = () => (
  <>
    <path d="M14 20H44M76 20H106" stroke="currentColor" strokeWidth="2.2" opacity="0.7" />
    <path d="M14 20 10 17.5 14 15M106 20 110 17.5 106 15" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.7" />
    <path d="M44 20C48 20 54 14 60 3 66 14 72 20 76 20Z" fill="rgb(var(--c-surface))" stroke="currentColor" strokeWidth="1" />
    <path d="M50 20C53 19 57 15 60 9 63 15 67 19 70 20" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.7" />
    <path d="M60 11.5V20M56.5 15H63.5" stroke="rgb(var(--c-accent))" strokeWidth="1.4" />
    <circle cx="60" cy="1.6" r="1.6" fill="currentColor" />
  </>
);

/** The cross pattée of a knightly order, the centre of a divider, between two short rules. */
const CrossRule: React.FC = () => (
  <svg width="58" height="14" viewBox="0 0 58 14" aria-hidden>
    <path d="M0 7H20M38 7H58" stroke="currentColor" strokeWidth="0.8" />
    <path d="M17 7 20 5.5V8.5ZM41 7 38 5.5V8.5Z" fill="currentColor" />
    <path d="M27.2 1h3.6L30 5.2 35 4.6v4.8L30 8.8 30.8 13h-3.6L28 8.8 23 9.4V4.6l5 .6Z" fill="currentColor" />
  </svg>
);

/** A lancet window with a rose above it, the stone tracery of a cathedral, 200×320. */
const CathedralWindow: React.FC = () => (
  <svg viewBox="0 0 200 320" fill="none" stroke="currentColor" aria-hidden className="h-full w-full">
    <path d="M10 318V130C10 60 60 14 100 2 140 14 190 60 190 130V318" strokeWidth="2" />
    <path d="M22 318V134C22 72 64 30 100 18 136 30 178 72 178 134V318" strokeWidth="0.8" />
    <path d="M100 18V318M22 200H178" strokeWidth="0.8" />
    <path d="M40 318V214C40 196 60 184 70 180 80 184 100 196 100 214M100 214C100 196 120 184 130 180 140 184 160 196 160 214V318" strokeWidth="0.8" />
    <circle cx="100" cy="110" r="44" strokeWidth="1.2" />
    <circle cx="100" cy="110" r="14" strokeWidth="0.8" />
    {Array.from({ length: 8 }, (_, i) => {
      const angle = (i * Math.PI) / 4;
      const [c, s] = [Math.cos(angle), Math.sin(angle)];
      return (
        <g key={i}>
          <path d={`M${100 + 14 * c} ${110 + 14 * s}L${100 + 44 * c} ${110 + 44 * s}`} strokeWidth="0.8" />
          <circle cx={100 + 30 * Math.cos(angle + Math.PI / 8)} cy={110 + 30 * Math.sin(angle + Math.PI / 8)} r="6" strokeWidth="0.6" />
        </g>
      );
    })}
  </svg>
);

/**
 * Candle-dark: darkness pressing in from the edges, fog drifting along the floor, a cold red rising
 * under it, a cathedral window high on the wall and an engraved double frame around everything.
 */
const Backdrop: React.FC = () => (
  <div className="absolute inset-0 text-frame">
    <div className="absolute right-[8vw] top-[-6vh] h-[62vh] w-[38vh] opacity-[0.1]">
      <CathedralWindow />
    </div>
    <div className="ui-fog absolute inset-x-[-20%] bottom-[-8vh] h-[42vh]" />
    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-accent/20 to-transparent" />
    <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 220px 70px rgb(0 0 0 / 0.88)' }} />
    <div className="absolute inset-3 border border-frame/45" />
    <div className="absolute inset-[18px] border border-frame/20" />
  </div>
);

export const DARK_FANTASY_ART: SettingArt = {
  corner: { viewBox: '0 0 24 24', art: <GothicCorner /> },
  crest: { viewBox: '0 0 120 24', art: <ArchCrest /> },
  ruleMark: <CrossRule />,
  // Narrow dagger cross.
  bullet: (filled) => (
    <path d="M7 0.5 8 4.5 11.5 5.5 8 6.5 7 13.5 6 6.5 2.5 5.5 6 4.5Z" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="0.9" strokeLinejoin="round" />
  ),
  // A crown of thorns around a low flame.
  emblem: (
    <>
      <path d="M5 21C9 25 23 25 27 21M7 19l-2-4M11 22l-1.5-4.5M16 23v-5M21 22l1.5-4.5M25 19l2-4" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <path d="M16 6C18.5 10 19 12.5 16 16 13 12.5 13.5 10 16 6Z" fill="currentColor" />
    </>
  ),
  Backdrop,
};
