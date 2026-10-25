import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { PARTY_RULES, type CharacterPreview, type PartyRules, type RulesetId } from '@itd/schema';
import { loadRuleSystem } from '@itd/game-logic';

/**
 * The app's side of each rules system: its name, the rulebook its heroes show, and its own screens.
 * The engine side is `loadRuleSystem` in `@itd/game-logic`. The record names every ruleset of the
 * schema, so a new system does not compile until it says how its heroes are shown; a system without
 * screens of its own plays on the shared sheet and combat screens.
 */

/** What a table or a hero is played by: a rules system, or one's own rules. */
export type RulesChoice = PartyRules;
export const RULES_CHOICES: readonly RulesChoice[] = PARTY_RULES;

export interface HeroScreenProps {
  onOpenSettings: () => void;
}
type HeroScreen = ComponentType<HeroScreenProps>;

/** A system's own screens, fetched with their styles only for those who open its heroes. */
export interface SystemScreens {
  /** The hero's screen: it switches between its sheet and its combat view itself. */
  Hero: HeroScreen;
}

interface SystemUi {
  title: string;
  /** The rulebook a hero's card names, when it is more than the title (an edition). */
  rulebook?: (hero: CharacterPreview) => string;
  screens?: () => Promise<SystemScreens>;
}

const SYSTEMS: { [Id in RulesetId]: SystemUi } = {
  dnd2024: { title: 'D&D 2024' },
  coc7: {
    title: 'Зов Ктулху',
    rulebook: (hero) => (hero.investigator?.pulp ? 'Pulp Cthulhu' : 'Зов Ктулху'),
    screens: () => import('../screens/coc/CocSheetScreen').then((m) => ({ Hero: m.CocSheetScreen })),
  },
};

export const RULES_TITLE = {
  ...Object.fromEntries(Object.entries(SYSTEMS).map(([id, system]) => [id, system.title])),
  custom: 'Свои правила',
} as Record<RulesChoice, string>;

/** The rules a hero is played by, as its card names them. */
export const rulebookLabel = (hero: CharacterPreview): string => {
  const system = hero.ruleset ? SYSTEMS[hero.ruleset] : undefined;
  return system ? (system.rulebook?.(hero) ?? system.title) : RULES_TITLE.custom;
};

const heroScreens = new Map<RulesetId, LazyExoticComponent<HeroScreen>>();

/** The hero screen of a system that has its own, or null when its heroes use the shared screens. */
export function systemHeroScreen(id: RulesetId | undefined): LazyExoticComponent<HeroScreen> | null {
  const load = id && SYSTEMS[id].screens;
  if (!id || !load) return null;
  let screen = heroScreens.get(id);
  if (!screen) {
    screen = lazy(() => load().then((m) => ({ default: m.Hero })));
    heroScreens.set(id, screen);
  }
  return screen;
}

/** Fetches a system ahead of its heroes being opened: the engine and its screens. */
export const preloadSystem = (id: RulesetId): Promise<unknown> =>
  Promise.all([loadRuleSystem(id), SYSTEMS[id].screens?.()]);
