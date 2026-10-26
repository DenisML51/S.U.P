import type { Build, Character, RulesetId, Spell } from '@itd/schema';

/** Where a granted entry of the sheet comes from, in terms the generic sheet can group by. */
export interface FeatureOrigin {
  /** The part of the hero it belongs to: one of the system's `featureParts`. */
  part: string;
  /** Key of the feature whose choice gave this one (Fighting Style for Defense), when there is one. */
  parent?: string;
  /** What it is, when its name alone does not say ("Черта"). */
  label?: string;
}

/** A spell of a system's book, as the picker lists it. */
export interface CatalogSpell {
  id: string;
  name: string;
  level: number;
  school: string;
  ritual: boolean;
  concentration: boolean;
  /** On the hero's own class list. */
  ownList: boolean;
  /** Within the levels the hero can cast now. */
  castable: boolean;
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
  /**
   * Choices of a feature that the sheet changes directly, any time (the known forms of Wild Shape),
   * by the feature's `grant` key: what the button to change them says.
   */
  sheetChoices?(build: Build, grant: string): { key: string; label: string; count: number; picked: number }[];
  /**
   * The system's spells for the hero to write onto the sheet themselves (a Wizard copying a spell
   * into the book, a scroll learned): the list, and a sheet entry of one of them.
   */
  spellCatalog?: {
    list(build: Build): CatalogSpell[];
    entry(build: Build, id: string): Spell | undefined;
  };
}

/**
 * Every system loads on demand: its engine and preset content are heavy and only heroes built by
 * it need them. The record has to name every ruleset of the schema, so a new one does not compile
 * until it can be loaded.
 */
const LOADERS: { [Id in RulesetId]: () => Promise<RuleSystem> } = {
  dnd2024: () => import('../dnd').then((m) => m.DND_2024),
  coc7: () => import('../coc').then((m) => m.COC_7),
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
