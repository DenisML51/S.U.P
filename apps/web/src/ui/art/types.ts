import type React from 'react';

/**
 * The ornament vocabulary of one setting. Every piece is drawn in `currentColor`, so the theme's
 * CSS decides its colour; a setting leaves out what does not belong to it (sci-fi has no vines).
 */
export interface SettingArt {
  /** Panel corner, drawn on the panel's border at its top left; mirrored for the other corners. */
  corner?: { viewBox: string; art: React.ReactNode };
  /** Centre piece on the top edge of a major panel (a medallion, an arch). */
  crest?: { viewBox: string; art: React.ReactNode };
  /** Centre mark of a divider. */
  ruleMark: React.ReactNode;
  /** List bullet on a 14×14 grid; outlined when the entry is inactive. */
  bullet: (filled: boolean) => React.ReactNode;
  /** The setting's heraldic mark: a solid game picture, drawn in `currentColor`. */
  Emblem: React.FC<React.SVGProps<SVGSVGElement>>;
  /**
   * Screen atmosphere behind the content. `frame: false` leaves out the flourishes on the screen
   * corners (combat, where the bar has its own ornaments).
   */
  Backdrop: React.FC<{ frame?: boolean }>;
  /**
   * The setting's panels are glass: the sheet, which has no atmosphere of its own, lays the backdrop
   * under them so the world shows through.
   */
  glass?: boolean;
  /** Laid over the experience bar when a new level can be taken: the setting's own marvel. */
  LevelReady: React.FC;
  /** Drawn round the emblem of the setting's world card, if the setting has such a thing. */
  WorldSigil?: React.FC;
  /** A picture of its own in the flourish played when the setting's world is chosen (lightning). */
  Flourish?: React.FC<{ x: number; y: number }>;
  /** The hero's level in the vitals panel's corner as the setting's own token of rank. */
  StatusLevel: React.FC<{ level: number }>;
  /** Laid round the focused hero card on hero select, outside its frame, if the setting reads one. */
  /** `age` instead of a level for heroes without levels (an investigator). */
  HeroReadout?: React.FC<{ id: string; level: number; age?: number; hp: number; maxHp: number }>;
}
