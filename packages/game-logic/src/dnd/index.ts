// D&D 2024: the build engine and the preset content. Heavy, so it is its own entry point
// (`@itd/game-logic/dnd`) that screens of D&D heroes import and the rest of the app loads on demand.
import { registerRuleSystem } from '../systems';
import { DND_2024 } from './system';

export * from './types';
export * from './helpers';
export * from './build';
export * from './creation';
export { DND, DND_CLASSES } from './content';
export { DND_ICONS } from './content/icons';
export { DND_2024 };

registerRuleSystem(DND_2024);
