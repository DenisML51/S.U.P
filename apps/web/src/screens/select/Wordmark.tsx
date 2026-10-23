import React from 'react';
import type { Setting } from '@itd/schema';
import { SETTING_LIST } from '../../ui/theme/settings';
import { SettingScope } from '../../ui/theme/SettingScope';

/**
 * The service name, set in the display face of the current setting. Every variant is stacked and
 * cross-faded, so the lettering changes smoothly while browsing heroes.
 */
export const Wordmark: React.FC<{ setting: Setting }> = ({ setting }) => (
  <div className="relative h-10 w-80" aria-label="S.U.P. — Система управления персонажем">
    {SETTING_LIST.map(({ id }) => (
      <SettingScope
        key={id}
        setting={id}
        aria-hidden
        className="absolute inset-0 flex flex-col justify-center transition-opacity duration-700"
        style={{ opacity: id === setting ? 1 : 0 }}
      >
        <span className="ui-display text-[1.65rem] leading-none text-frame-bright">S.U.P.</span>
        <span className="mt-1 whitespace-nowrap text-[10px] uppercase tracking-[0.28em] text-ink-faint">Система управления персонажем</span>
      </SettingScope>
    ))}
  </div>
);
