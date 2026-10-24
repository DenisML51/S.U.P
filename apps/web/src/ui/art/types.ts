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
  /** Screen atmosphere behind the content. */
  Backdrop: React.FC;
  /** Laid over the experience bar when a new level can be taken: the setting's own marvel. */
  LevelReady: React.FC;
  /** Drawn round the emblem of the setting's world card, if the setting has such a thing. */
  WorldSigil?: React.FC;
}
