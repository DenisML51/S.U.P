import React from 'react';
import type { Setting } from '@itd/schema';
import { assetUrl } from '../../data/api/client';
import { SettingEmblem } from '../../ui/ornaments';
import { cx } from '../../ui/primitives';
import { SettingBackdrop } from '../../ui/SettingBackdrop';
import { SettingScope } from '../../ui/theme/SettingScope';

/** A party's cover; without one, a window onto its world's engraving with the world's emblem. */
export const PartyCover: React.FC<{
  assetId: string | null;
  setting: Setting;
  className?: string;
  children?: React.ReactNode;
}> = ({ assetId, setting, className, children }) => (
  <SettingScope setting={setting} className={cx('ui-party-cover relative overflow-hidden bg-inset', className)}>
    {assetId ? (
      <img src={assetUrl(assetId)} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
    ) : (
      <>
        <SettingBackdrop setting={setting} strength={0.9} frame={false} />
        <span className="absolute inset-0 grid place-items-center">
          <SettingEmblem size={56} className="text-frame-bright/50" />
        </span>
      </>
    )}
    {children}
  </SettingScope>
);
