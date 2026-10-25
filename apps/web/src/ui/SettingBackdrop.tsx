import React from 'react';
import { SETTING_ART } from './art';
import { SETTING_LIST, type Theme } from './theme/settings';
import { SettingScope } from './theme/SettingScope';
import { cx } from './primitives';

/**
 * Screen atmosphere of each setting. All of them are mounted at once and cross-fade, so moving
 * between characters of different settings morphs the atmosphere instead of swapping it; those not
 * shown are dormant, their animations held still.
 */
export const SettingBackdrop: React.FC<{ setting: Theme; className?: string; strength?: number; frame?: boolean }> = ({
  setting,
  className,
  frame,
  // Atmosphere, not decoration: by default it stays well behind the content.
  strength = 0.45,
}) => (
  <div className={cx('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden>
    {SETTING_LIST.map(({ id }) => {
      const { Backdrop } = SETTING_ART[id];
      return (
        <SettingScope
          key={id}
          setting={id}
          className="absolute inset-0"
          // An atmosphere not shown sleeps once it has faded: its animations stop and it is not drawn.
          data-dormant={id === setting ? undefined : ''}
          style={{
            opacity: id === setting ? strength : 0,
            visibility: id === setting ? 'visible' : 'hidden',
            transition: `opacity 700ms, visibility 0s linear ${id === setting ? '0s' : '700ms'}`,
          }}
        >
          <Backdrop frame={frame} />
        </SettingScope>
      );
    })}
  </div>
);
