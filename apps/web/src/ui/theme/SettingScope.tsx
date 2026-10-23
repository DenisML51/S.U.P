import React, { createContext, useContext } from 'react';
import { DEFAULT_SETTING, type Setting } from '@itd/schema';

const SettingContext = createContext<Setting>(DEFAULT_SETTING);

/** The setting of the nearest `SettingScope`; ornaments use it to pick their artwork. */
export const useSetting = (): Setting => useContext(SettingContext);

/**
 * Applies a setting to a subtree: CSS tokens through `data-setting`, artwork through context.
 * Scopes nest, so a card can show its own character's setting inside another theme.
 */
export const SettingScope: React.FC<{ setting: Setting } & React.HTMLAttributes<HTMLDivElement>> = ({
  setting,
  ...rest
}) => (
  <SettingContext.Provider value={setting}>
    <div data-setting={setting} {...rest} />
  </SettingContext.Provider>
);
