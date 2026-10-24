import React from 'react';
import type { Setting } from '@itd/schema';
import { SETTING_ART } from '../../ui/art';
import { Corners, SettingEmblem } from '../../ui/ornaments';
import { SettingScope } from '../../ui/theme/SettingScope';
import { SETTING_INFO } from '../../ui/theme/settings';

/**
 * A world to begin in, shown as a window into it: the setting's own atmosphere fills the card
 * (the star atlas, the instrument grid, the fog and the cathedral window), its emblem and name
 * stand over it. Hovering wakes the world in the setting's manner.
 */
export const WorldCard: React.FC<{ setting: Setting; selected: boolean; onSelect: () => void }> = ({
  setting,
  selected,
  onSelect,
}) => {
  const { Backdrop } = SETTING_ART[setting];
  return (
    <SettingScope setting={setting} className="h-full">
      <button type="button" className="ui-world" aria-pressed={selected} onClick={onSelect}>
        <span className="ui-world__scene" aria-hidden>
          <Backdrop />
        </span>
        <span className="ui-world__veil" aria-hidden />
        <Corners />
        <span className="ui-world__emblem">
          <SettingEmblem size={76} />
        </span>
        <span className="ui-world__name ui-display ui-title">{SETTING_INFO[setting].label}</span>
      </button>
    </SettingScope>
  );
};
