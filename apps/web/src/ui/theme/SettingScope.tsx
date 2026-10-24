import React, { createContext, useContext, useEffect } from 'react';
import { DEFAULT_SETTING } from '@itd/schema';
import type { Theme } from './settings';

const SettingContext = createContext<Theme>(DEFAULT_SETTING);

/** The theme of the nearest `SettingScope`; ornaments use it to pick their artwork. */
export const useSetting = (): Theme => useContext(SettingContext);

/**
 * Applies a theme to a subtree: CSS tokens through `data-setting`, artwork through context.
 * Scopes nest, so a card can show its own character's setting inside another theme. A world's scope
 * is also marked `data-world`, so the service theme's skin can stop at it.
 */
export const SettingScope: React.FC<{ setting: Theme } & React.HTMLAttributes<HTMLDivElement>> = ({
  setting,
  ...rest
}) => (
  <SettingContext.Provider value={setting}>
    <div data-setting={setting} data-world={setting === 'service' ? undefined : ''} {...rest} />
  </SettingContext.Provider>
);

/**
 * Puts the theme on <html> while a screen is shown, so content rendered in portals (toasts,
 * menus) and the page background match the screen.
 */
export function useDocumentSetting(setting: Theme): void {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.setting = setting;
    return () => {
      delete root.dataset.setting;
    };
  }, [setting]);
}
