import React from 'react';
import type { Setting } from '@itd/schema';
import { SettingEmblem } from './art/emblems';
import { cx } from './primitives';
import { SettingScope } from './theme/SettingScope';
import { SETTING_INFO } from './theme/settings';

/** The setting as a choice shown in its own look: its face, its emblem, its colours. */
export const SettingOption: React.FC<{ setting: Setting; selected: boolean; onSelect: () => void }> = ({
  setting,
  selected,
  onSelect,
}) => (
  <SettingScope setting={setting}>
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cx('ui-setting-option ui-morph', selected && 'ui-setting-option--selected')}
    >
      <SettingEmblem size={26} className="shrink-0 text-frame-bright" />
      <span className="min-w-0 text-left">
        <span className="ui-display ui-title block truncate text-[1.05rem] leading-tight text-ink">
          {SETTING_INFO[setting].label}
        </span>
        <span className="block truncate text-xs text-ink-muted">{SETTING_INFO[setting].hint}</span>
      </span>
    </button>
  </SettingScope>
);
