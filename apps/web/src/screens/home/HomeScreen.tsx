import React from 'react';
import type { HomeLayout } from '../../data/settings';
import { useCharacterStore } from '../../store/useCharacterStore';
import { HomeCinema } from './HomeCinema';
import { HomeHub } from './HomeHub';
import { HomeMenu } from './HomeMenu';
import { HomeMosaic } from './HomeMosaic';

const LAYOUTS: Record<HomeLayout, React.FC<{ onOpenSettings: () => void }>> = {
  hub: HomeHub,
  menu: HomeMenu,
  mosaic: HomeMosaic,
  cinema: HomeCinema,
};

/**
 * The first screen after signing in: one's heroes and the tables one sits at, laid out the way this
 * device prefers (app settings). The page wears the service theme; worlds live inside their pictures.
 */
export const HomeScreen: React.FC<{ onOpenSettings: () => void }> = (props) => {
  const layout = useCharacterStore((s) => s.settings.homeLayout);
  const Layout = LAYOUTS[layout];
  return <Layout {...props} />;
};
