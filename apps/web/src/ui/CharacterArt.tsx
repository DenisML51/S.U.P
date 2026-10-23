import React from 'react';
import type { CharacterImages } from '@itd/schema';
import { assetUrl } from '../data/api/client';
import { cx } from './primitives';

interface ArtSource {
  images?: CharacterImages;
  /** Legacy embedded portrait. */
  avatar?: string;
  name: string;
}

/** Portrait URL with fallbacks: uploaded portrait, then the legacy embedded one, then full art. */
export const portraitSrc = (source: ArtSource): string | undefined =>
  source.images?.portrait
    ? assetUrl(source.images.portrait)
    : (source.avatar ?? (source.images?.full ? assetUrl(source.images.full) : undefined));

/** Full-height art, falling back to the portrait. */
export const fullArtSrc = (source: ArtSource): string | undefined =>
  source.images?.full ? assetUrl(source.images.full) : portraitSrc(source);

const Initial: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
  <div className={cx('grid place-items-center bg-inset text-ink-faint ui-display select-none', className)}>
    <span className="text-[2.5em] leading-none">{name.trim().charAt(0).toUpperCase() || '?'}</span>
  </div>
);

/** A character's portrait or full art, with a quiet monogram when there is no picture. */
export const CharacterArt: React.FC<{
  source: ArtSource;
  kind: 'portrait' | 'full';
  className?: string;
  /** Focus of `object-position`, e.g. "50% 20%" to keep a face in frame. */
  position?: string;
}> = ({ source, kind, className, position = kind === 'portrait' ? '50% 25%' : '50% 15%' }) => {
  const src = kind === 'portrait' ? portraitSrc(source) : fullArtSrc(source);
  if (!src) return <Initial name={source.name} className={className} />;
  return (
    <img
      src={src}
      alt={source.name}
      draggable={false}
      loading="lazy"
      decoding="async"
      className={cx('object-cover', className)}
      style={{ objectPosition: position }}
    />
  );
};
