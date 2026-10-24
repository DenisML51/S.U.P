import React from 'react';
import GiLantern from '~icons/game-icons/lantern-flame';
import type { SettingArt } from './types';

/**
 * The service's own theme belongs to no world, so it carries no ornament: no corners, no crest,
 * no backdrop. Its looks differ in CSS only (`theme/service.css`).
 */
export const SERVICE_ART: SettingArt = {
  ruleMark: null,
  bullet: (filled) => <circle cx="7" cy="7" r="2.5" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1" />,
  // The lantern one carries into the dark.
  Emblem: GiLantern,
  Backdrop: () => null,
  LevelReady: () => null,
  StatusLevel: ({ level }) => <span className="ui-numeric">{level}</span>,
};
