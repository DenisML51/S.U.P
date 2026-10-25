import type { Build, Character, RulesetId } from '@itd/schema';

/** Where a granted entry of the sheet comes from, in terms the generic sheet can group by. */
export interface FeatureOrigin {
  /** The part of the hero it belongs to: one of the system's `featureParts`. */
  part: string;
  /** Key of the feature whose choice gave this one (Fighting Style for Defense), when there is one. */
  parent?: string;
  /** What it is, when its name alone does not say ("Черта"). */
  label?: string;
}

/**
 * What the generic screens (the sheet, the store) ask of a rules system. A system's own screens
 * (its creation steps, its level-up) use its module directly: `@itd/game-logic/<system>`.
 */
export interface RuleSystem {
  id: RulesetId;
  /** Parts of a hero its features are listed by, in order ("Вид", "Предыстория", "Класс"). */
  featureParts: readonly { id: string; title: string }[];
  /** The sheet with its granted entries written from the build again; the player's own stay. */
  rebuild(character: Character, build: Build): Character;
  /** The origin of every feature the build grants, by its `grant` key, in the build's order. */
  featureOrigins(build: Build): Map<string, FeatureOrigin>;
  /** Where a granted entry comes from, for people ("Паладин, 2 уровень"). */
  describeGrant(build: Build, grant: string | undefined): string | undefined;
}

/**
 * Every system loads on demand: its engine and preset content are heavy and only heroes built by
 * it need them. The record has to name every ruleset of the schema, so a new one does not compile
 * until it can be loaded.
 */
const LOADERS: { [Id in RulesetId]: () => Promise<RuleSystem> } = {
  dnd2024: () => import('../dnd').then((m) => m.DND_2024),
};

const loaded = new Map<RulesetId, RuleSystem>();
const loading = new Map<RulesetId, Promise<RuleSystem>>();

/** Makes a system available at once; its module does this itself when it is imported. */
export function registerRuleSystem(system: RuleSystem): void {
  loaded.set(system.id, system);
}

export const isRuleSystemLoaded = (id: RulesetId): boolean => loaded.has(id);

/** Loads a system once; a failed load (the network) is tried again on the next call. */
export function loadRuleSystem(id: RulesetId): Promise<RuleSystem> {
  const ready = loaded.get(id);
  if (ready) return Promise.resolve(ready);
  let pending = loading.get(id);
  if (!pending) {
    const loader = LOADERS[id];
    if (!loader) return Promise.reject(new Error(`Unknown rules system "${id}"`));
    pending = loader().then(
      (system) => {
        registerRuleSystem(system);
        loading.delete(id);
        return system;
      },
      (error: unknown) => {
        loading.delete(id);
        throw error;
      },
    );
    loading.set(id, pending);
  }
  return pending;
}

/** A loaded system. Screens that show a hero built by it are opened only after `loadRuleSystem`. */
export function ruleSystem(id: RulesetId): RuleSystem {
  const system = loaded.get(id);
  if (!system) throw new Error(`Rules system "${id}" is not loaded yet`);
  return system;
}

/** The system a build belongs to. */
export const rulesOf = (build: Build): RuleSystem => ruleSystem(build.ruleset);
