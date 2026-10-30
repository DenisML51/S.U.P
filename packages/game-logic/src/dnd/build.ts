import type { Ability, Attack, Build, Character, DamageComponent, DndBuild, HitPointCost, CharacterDraft, InventoryItem, Resistance, Resource, Spell, Trait } from '@itd/schema';
import { ATTRIBUTES_LIST, SKILLS_LIST } from '../content/attributes';
import { spellColor } from '../content/combat';
import { abilityModifier } from '../rules/abilities';
import { rescaleLimbs } from '../rules/health';
import { weaponAttack, weaponAttackId, weaponThrowId } from '../rules/inventory';
import { averageHitPoints } from '../rules/rest';
import { DND } from './content';
import { beastFormFeature, beastSummary, challengeLabel } from './content/beasts';
import { SLOT_TABLES } from './content/classes/shared';
import { DND_ICONS } from './content/icons';
import { proficiencyForLevel, resolveAmount, resolveDice } from './helpers';
import type {
  AttributeId,
  BeastFormDef,
  BuildContext,
  CatalogEntryDef,
  CatalogId,
  ChoiceDef,
  ClassDef,
  Effect,
  FeatDef,
  FeatureDef,
  GrantedAttackDef,
  HitPointCostDef,
  OptionDef,
  ResourceDef,
  SkillId,
  SpeciesDef,
  SpellDef,
  SpellcastingDef,
  SpeedCondition,
  SubclassDef,
  WeaponDef,
} from './types';

/**
 * The build engine of the D&D 2024 presets.
 *
 * A hero's `build` records only what the player chose: species, background, class and subclass,
 * base scores, every pick by its choice path, and the hit points rolled on each level. Everything
 * the presets give is derived from it: `collect` walks the content for the build's level, and
 * `applyBuild` writes the result onto the sheet. Entries it writes carry `grant` and are rebuilt
 * on every apply; the rest of the sheet (notes, items, custom abilities) is never touched.
 */

// ------------------------------------------------------------------------------------------------
// Lookups
// ------------------------------------------------------------------------------------------------

/** The D&D 2024 build of a hero, if it was built by these rules. */
export const dndBuildOf = (hero: { build?: Build }): DndBuild | undefined => (hero.build?.ruleset === 'dnd2024' ? hero.build : undefined);

export const findClass = (id: string | undefined): ClassDef | undefined => DND.classes.find((c) => c.id === id);
export const findSubclass = (classDef: ClassDef | undefined, id: string | undefined): SubclassDef | undefined =>
  classDef?.subclasses.find((s) => s.id === id);
export const findSpecies = (id: string | undefined): SpeciesDef | undefined => DND.species.find((s) => s.id === id);
export const findBackground = (id: string | undefined) => DND.backgrounds.find((b) => b.id === id);
export const findFeat = (id: string | undefined): FeatDef | undefined => DND.feats.find((f) => f.id === id);
export const findSpell = (id: string | undefined): SpellDef | undefined => DND.spells.find((s) => s.id === id);
export const findBeast = (id: string | undefined): BeastFormDef | undefined => DND.beasts.find((b) => b.id === id);
export const findCatalogEntry = (catalog: CatalogId, id: string | undefined): CatalogEntryDef | undefined =>
  DND.catalogs[catalog].find((e) => e.id === id);

/** The content entry of a pick by its id, whatever it is (an invocation, a maneuver, a feat). */
const pickEntry = (id: string): FeatureDef | undefined =>
  Object.values(DND.catalogs).flat().find((e) => e.id === id) ?? DND.maneuvers.find((m) => m.id === id) ?? findFeat(id);

const CATALOG_NAMES: Record<CatalogId, string> = {
  invocations: 'Воззвание',
  metamagic: 'Метамагия',
  bloodCurses: 'Кровавое проклятие',
  crimsonRites: 'Багровый обряд',
  mutagens: 'Мутаген',
  bloodRites: 'Кровавый обряд',
  latentMutagens: 'Мутаген',
  bloodHunterStyles: 'Боевой стиль',
};

const ATTRIBUTE_IDS = ATTRIBUTES_LIST.map((a) => a.id);
const attributeName = (id: string) => ATTRIBUTES_LIST.find((a) => a.id === id)?.name ?? id;
const skillName = (id: string) => SKILLS_LIST.find((s) => s.id === id)?.name ?? id;

/** Path of the pick of a class's key ability (a blood hunter's hemocraft) in `build.choices`. */
const keyAbilityKey = (classDef: ClassDef) => `class:${classDef.id}.key-ability/ability`;

/** The class's key ability the hero chose, or the class's first one (Intelligence for hemocraft). */
export function keyAbilityOf(build: Pick<DndBuild, 'choices'>, classDef: ClassDef | undefined): AttributeId | undefined {
  if (!classDef?.keyAbility) return undefined;
  const picked = build.choices[keyAbilityKey(classDef)]?.[0] as AttributeId | undefined;
  return picked && classDef.keyAbility.options.includes(picked) ? picked : classDef.keyAbility.options[0];
}

/** One class of a build with its content. */
export interface BuildClass {
  def: ClassDef;
  subclass?: SubclassDef;
  /** Character levels taken in it, ascending. */
  levels: number[];
  /** The class the hero started in: it gave the full starting proficiencies and the first level's hit points. */
  starting: boolean;
}

/** The classes of a build in the order they were taken; ids the presets do not know are left out. */
export function buildClasses(build: Pick<DndBuild, 'classes'>): BuildClass[] {
  return build.classes.flatMap((entry, index) => {
    const def = findClass(entry.class);
    return def ? [{ def, subclass: findSubclass(def, entry.subclass), levels: entry.levels, starting: index === 0 }] : [];
  });
}

/** Character level of a build: every level of every class. */
export const heroLevel = (build: Pick<DndBuild, 'classes'>): number => build.classes.reduce((sum, c) => sum + c.levels.length, 0);

/** The class level a class has reached by a character level. */
export const classLevelAt = (entry: Pick<BuildClass, 'levels'>, level: number): number => entry.levels.filter((l) => l <= level).length;

/** The class a character level was taken in, and the class level it was. */
export function classAtLevel(build: Pick<DndBuild, 'classes'>, level: number): { entry: BuildClass; classLevel: number } | undefined {
  const entry = buildClasses(build).find((c) => c.levels.includes(level));
  return entry && { entry, classLevel: classLevelAt(entry, level) };
}

/** The spellcasting of a class: its own, or its subclass's (an Eldritch Knight's). */
export const castingOf = (entry: Pick<BuildClass, 'def' | 'subclass'>): SpellcastingDef | undefined =>
  entry.def.spellcasting ?? entry.subclass?.spellcasting;

/** The ability a casting casts with: its own, or the class's key ability the hero chose. */
export const castingAbilityOf = (casting: SpellcastingDef, build: Pick<DndBuild, 'choices'>, classDef: ClassDef): AttributeId =>
  casting.ability === 'key' ? (keyAbilityOf(build, classDef) ?? 'intelligence') : casting.ability;

/** The classes of a build that cast spells, with their casting, in the order they were taken. */
export const castersOf = (build: Pick<DndBuild, 'classes'>): (BuildClass & { casting: SpellcastingDef })[] =>
  buildClasses(build).flatMap((entry) => {
    const casting = castingOf(entry);
    return casting ? [{ ...entry, casting }] : [];
  });

const slotsAt = (casting: SpellcastingDef | undefined, classLevel: number): number[] =>
  casting && casting.progression !== 'pact' ? (SLOT_TABLES[casting.progression][classLevel - 1] ?? []) : [];

/** Pact Magic slots of a class level (Warlock), if the casting is a pact. */
const pactAt = (casting: SpellcastingDef | undefined, classLevel: number): { count: number; level: number } | undefined =>
  casting?.pact?.[classLevel - 1];

/** The highest spell level the hero can cast at a class level: their slots, or the level of their pact slots. */
export const maxSpellLevel = (casting: SpellcastingDef | undefined, classLevel: number): number =>
  pactAt(casting, classLevel)?.level ?? slotsAt(casting, classLevel).length;

/** Id of the Pact Magic pool a warlock casts their spells with. */
export const PACT_SLOTS_ID = 'pact-slots';

// ------------------------------------------------------------------------------------------------
// Walking the content
// ------------------------------------------------------------------------------------------------

export type SourceKind = 'species' | 'background' | 'class' | 'subclass' | 'feat' | 'option' | 'maneuver' | 'catalog';

export interface GrantedFeature {
  /** Stable path of the feature in the build, unique per hero. */
  key: string;
  feature: FeatureDef;
  /** Character level it was gained at. */
  level: number;
  source: SourceKind;
  /** The class it belongs to and the class level it came with; none for the species, the background and what they give. */
  classId?: string;
  classLevel?: number;
  /** What its numbers are computed from: the hero, and the level its class has reached. */
  ctx: BuildContext;
}

export interface OpenChoice {
  /** Path the picks are stored under in `build.choices`. */
  key: string;
  choice: ChoiceDef;
  count: number;
  picked: string[];
  level: number;
  owner: GrantedFeature;
}

interface OwnedEffect {
  effect: Effect;
  owner: GrantedFeature;
}

export interface Collected {
  features: GrantedFeature[];
  choices: OpenChoice[];
  effects: OwnedEffect[];
  /** Weapon kinds whose mastery the hero uses. */
  masteries: string[];
  /** Ability chosen for the spells of an owner (species, feat): applies to spells under that feature key. */
  spellAbilities: { prefix: string; ability: AttributeId }[];
  /** Every pick made in a pool, with the level it was made on; a pick given up later is not `active`. */
  poolPicks: { pool: string; id: string; level: number; active: boolean }[];
}

/** Pools of a class's known cantrips and spells: each class keeps its own. */
export const knownCantripsPool = (classId: string): string => `${classId}.known-cantrips`;
export const knownSpellsPool = (classId: string): string => `${classId}.known-spells`;
/** Pool of the spells written into a wizard's spellbook. */
export const SPELLBOOK_POOL = 'spellbook';

/** Key of the choice that gives up a pick of `pool` on character `level`. */
const forgetKey = (pool: string, level: number) => `swap:${pool}@${level}/forget`;

/** Picks given up on later levels, read from the build's `swap:<pool>@<level>/forget` choices. */
function forgottenPicks(build: DndBuild): { pool: string; id: string; level: number }[] {
  const out: { pool: string; id: string; level: number }[] = [];
  for (const [key, picks] of Object.entries(build.choices)) {
    const match = /^swap:(.+)@(\d+)\/forget$/.exec(key);
    if (match) for (const id of picks) out.push({ pool: match[1]!, id, level: Number(match[2]) });
  }
  return out;
}

/**
 * The numbers of the hero at a character level, and of one class of theirs when given: its class
 * level by then, its subclass and key ability. Good enough before ability increases are known.
 */
const contextFor = (level: number, scores: Record<string, number>, build: Pick<DndBuild, 'choices'>, entry?: BuildClass): BuildContext => ({
  level,
  classLevel: entry ? classLevelAt(entry, level) : level,
  proficiencyBonus: proficiencyForLevel(level),
  score: (attribute) => scores[attribute] ?? 10,
  modifier: (attribute) => abilityModifier(scores[attribute] ?? 10),
  subclass: entry?.subclass?.id,
  keyAbility: entry && keyAbilityOf(build, entry.def),
});

/** The numbers of a hero at their level, and of one class of theirs when given, with every ability increase. */
export const buildContext = (build: DndBuild, entry?: BuildClass): BuildContext => contextFor(heroLevel(build), buildScores(build), build, entry);

/**
 * An effect with its numbers written for a context: the damage of a Rage by the barbarian's level,
 * not the hero's. Collected effects are all written this way, so the sheet reads plain numbers.
 */
const writtenFor = (effect: Effect, ctx: BuildContext): Effect =>
  Object.fromEntries(Object.entries(effect).map(([key, value]) => [key, typeof value === 'function' ? value(ctx) : value])) as Effect;

/** Where a feature sits among the hero's classes: the context of its numbers, its class and class level. */
type Scope = Pick<GrantedFeature, 'ctx' | 'classId' | 'classLevel'>;

const scopeOf = ({ ctx, classId, classLevel }: GrantedFeature): Scope => ({ ctx, classId, classLevel });

/** A feature's hit point cost written for the hero's numbers. */
const costFor = (cost: HitPointCostDef | undefined, ctx: BuildContext): HitPointCost | undefined =>
  typeof cost === 'function' ? cost(ctx) : cost;

const resolveEffects = (effects: FeatureDef['effects'], ctx: BuildContext): Effect[] =>
  ((typeof effects === 'function' ? effects(ctx) : effects) ?? []).map((effect) => writtenFor(effect, ctx));

/** Synthetic feature for things the content describes as data rather than features. */
const synthetic = (id: string, name: string, description: string, extra: Partial<FeatureDef> = {}): FeatureDef => ({
  id,
  name,
  description,
  hidden: true,
  ...extra,
});

/**
 * Walks every feature a build has up to character `level`: species, background, then each class in
 * the order it was taken — its levels, its subclass's levels, its spellcasting picks — and everything
 * picked through choices (feats, maneuvers, inline options). A class taken later gives the part of
 * its starting proficiencies the multiclass rules allow instead of all of them.
 */
export function collect(build: DndBuild, level = heroLevel(build), scores?: Record<string, number>): Collected {
  const base = scores ?? baseScores(build);
  const hero: Scope = { ctx: contextFor(level, base, build) };
  const out: Collected = { features: [], choices: [], effects: [], masteries: [], spellAbilities: [], poolPicks: [] };
  const forgotten = forgottenPicks(build).filter((f) => f.level <= level);

  const visitFeature = (feature: FeatureDef, ownerKey: string, gainedAt: number, source: SourceKind, scope: Scope) => {
    if ((feature.minLevel && level < feature.minLevel) || (feature.maxLevel && level > feature.maxLevel)) return;
    const granted: GrantedFeature = { key: `${ownerKey}:${feature.id}`, feature, level: Math.max(gainedAt, feature.minLevel ?? 0), source, ...scope };
    out.features.push(granted);
    for (const effect of resolveEffects(feature.effects, scope.ctx)) out.effects.push({ effect, owner: granted });
    for (const choice of feature.choices ?? []) {
      const key = `${granted.key}/${choice.id}`;
      const count = resolveAmount(choice.count, scope.ctx);
      if (count <= 0) continue;
      const picked = build.choices[key] ?? [];
      out.choices.push({ key, choice, count, picked, level: granted.level, owner: granted });
      // A repeatable pick taken twice in one choice (Agonizing Blast for two cantrips) is two features.
      picked.forEach((pick, index) => {
        const repeat = picked.slice(0, index).filter((p) => p === pick).length;
        visitPick(choice, pick, repeat > 0 ? `${key}#${repeat + 1}` : key, granted);
      });
    }
  };

  const visitPick = (choice: ChoiceDef, pick: string, choiceKey: string, owner: GrantedFeature) => {
    const options = choice.options;
    if (choice.pool) {
      // A pick given up on a later level no longer counts.
      const active = !forgotten.some((f) => f.pool === choice.pool && f.id === pick && f.level > owner.level);
      out.poolPicks.push({ pool: choice.pool, id: pick, level: owner.level, active });
      if (!active) return;
    }
    // What a pick brings belongs where the pick was made (a feat of a fighter's level is the fighter's).
    const scope = scopeOf(owner);
    const add = (effect: Effect) => out.effects.push({ effect, owner });
    switch (options.from) {
      case 'skills':
        add({ type: 'skill', skill: pick as SkillId });
        break;
      case 'expertise':
        add({ type: 'expertise', skill: pick as SkillId });
        break;
      case 'attributes':
        add({ type: 'attribute', attribute: pick as AttributeId, amount: options.amount, max: options.max });
        break;
      case 'feats': {
        const feat = findFeat(pick);
        if (feat) visitFeature(feat, choiceKey, owner.level, 'feat', scope);
        break;
      }
      case 'maneuvers': {
        const maneuver = DND.maneuvers.find((m) => m.id === pick);
        if (maneuver) visitFeature(maneuver, choiceKey, owner.level, 'maneuver', scope);
        break;
      }
      case 'catalog': {
        const entry = findCatalogEntry(options.catalog, pick);
        if (entry) visitFeature(entry, choiceKey, owner.level, 'catalog', scope);
        break;
      }
      case 'spells':
        add({ type: 'spell', spell: pick, alwaysPrepared: !choice.spellbook, ability: choice.spellAbility, resourceId: choice.spellResource });
        break;
      case 'forget':
        break;
      case 'beasts': {
        const beast = findBeast(pick);
        for (const form of beast ? (options.features?.(beast) ?? [beastFormFeature(beast)]) : []) visitFeature(form, choiceKey, owner.level, 'option', scope);
        break;
      }
      case 'weapons': {
        const weapon = DND.weapons.find((w) => w.id === pick);
        if (weapon) out.masteries.push(weapon.id);
        break;
      }
      case 'tools':
        add({ type: 'proficiency', category: 'tool', value: pick });
        break;
      case 'languages':
        add({ type: 'proficiency', category: 'language', value: pick });
        break;
      case 'options': {
        const option = options.options.find((o) => o.id === pick);
        if (!option) break;
        if (choice.id === 'spellAbility' && (ATTRIBUTE_IDS as string[]).includes(pick)) {
          out.spellAbilities.push({ prefix: owner.key, ability: pick as AttributeId });
        }
        for (const effect of resolveEffects(option.effects, owner.ctx)) add(effect);
        for (const feature of option.features ?? []) visitFeature(feature, `${choiceKey}=${option.id}`, owner.level, 'option', scope);
        break;
      }
    }
  };

  // Species and background: level 1.
  const species = findSpecies(build.species);
  if (species) {
    out.effects.push({
      effect: { type: 'baseSpeed', value: species.speed },
      owner: { key: 'species', feature: synthetic('species', species.name, ''), level: 1, source: 'species', ...hero },
    });
    for (const feature of species.features) visitFeature(feature, 'species', 1, 'species', hero);
  }

  const background = findBackground(build.background);
  if (background) {
    const owner: GrantedFeature = {
      key: 'background',
      feature: synthetic('background', background.name, background.description),
      level: 1,
      source: 'background',
      ...hero,
    };
    out.features.push(owner);
    for (const skill of background.skills) out.effects.push({ effect: { type: 'skill', skill }, owner });
    out.effects.push({ effect: { type: 'proficiency', category: 'tool', value: background.tool }, owner });
    const feat = findFeat(background.feat);
    if (feat) visitFeature(feat, 'background', 1, 'feat', hero);
    // Every 2024 hero speaks Common and two more languages of the player's choice.
    visitFeature(
      synthetic('origin.languages', 'Языки', 'Вы знаете Общий язык и ещё два языка на выбор.', {
        effects: [{ type: 'proficiency', category: 'language', value: 'Общий' }],
        choices: [{ id: 'languages', label: 'Языки (2)', count: 2, options: { from: 'languages' } }],
      }),
      'background',
      1,
      'background',
      hero,
    );
  }

  // Classes, each with its own class levels.
  for (const entry of buildClasses(build)) {
    const reached = classLevelAt(entry, level);
    if (reached === 0) continue;
    const { def: classDef, subclass } = entry;
    const ctx = contextFor(level, base, build, entry);
    const at = (classLevel: number): Scope => ({ ctx, classId: classDef.id, classLevel });
    const takenAt = entry.levels[0]!;
    const owner: GrantedFeature = {
      key: `class:${classDef.id}`,
      feature: synthetic(`${classDef.id}.proficiencies`, classDef.name, classDef.description),
      level: takenAt,
      source: 'class',
      ...at(1),
    };
    out.features.push(owner);
    // The class the hero started in gives its saving throws and every starting proficiency; one taken
    // later gives only its row of the multiclass table.
    if (entry.starting) for (const attribute of classDef.saves) out.effects.push({ effect: { type: 'save', attribute }, owner });
    for (const effect of entry.starting ? classDef.proficiencies : classDef.multiclass.proficiencies) out.effects.push({ effect, owner });
    if (classDef.keyAbility) {
      const { label, description, options, notes } = classDef.keyAbility;
      visitFeature(
        synthetic(`${classDef.id}.key-ability`, label, description, {
          choices: [{ id: 'ability', label, count: 1, options: { from: 'options', options: options.map((id) => ({ id, name: attributeName(id), description: notes?.[id] ?? '' })) } }],
        }),
        'class',
        takenAt,
        'class',
        at(1),
      );
    }
    const skills = entry.starting ? classDef.skillChoices.count : (classDef.multiclass.skills ?? 0);
    if (skills > 0) {
      visitFeature(
        synthetic(`${classDef.id}.skills`, 'Навыки класса', skills === 1 ? 'Владение одним навыком из списка класса.' : `Владение ${skills} навыками из списка класса.`, {
          choices: [{ id: 'skills', label: `Навыки (${skills})`, count: skills, options: { from: 'skills', list: classDef.skillChoices.list } }],
        }),
        'class',
        takenAt,
        'class',
        at(1),
      );
    }
    for (const feature of (entry.starting ? classDef.starting : classDef.multiclass.features) ?? []) visitFeature(feature, 'class', takenAt, 'class', at(1));

    const casting = castingOf(entry);
    const castingOwner = subclass?.spellcasting ? subclass.name : classDef.name;
    for (let classLevel = 1; classLevel <= reached; classLevel += 1) {
      const gainedAt = entry.levels[classLevel - 1]!;
      if (classLevel >= 2) visitSwaps(entry, casting, classLevel, gainedAt);
      for (const feature of classDef.levels[classLevel] ?? []) visitFeature(feature, 'class', gainedAt, 'class', at(classLevel));
      if (subclass && classLevel >= classDef.subclassLevel) {
        for (const feature of subclass.levels[classLevel] ?? []) visitFeature(feature, 'subclass', gainedAt, 'subclass', at(classLevel));
        for (const spell of subclass.alwaysPrepared?.[classLevel] ?? []) {
          out.effects.push({ effect: { type: 'spell', spell, alwaysPrepared: true }, owner });
        }
      }
      if (casting) visitCasting(entry, casting, classLevel, gainedAt, castingOwner);
    }
  }

  /**
   * The picks of a caster's class level: new cantrips of any caster, new known spells of a `known`
   * caster, spells written into the spellbook of a `spellbook` one (six at level 1, then two a level).
   * Each class keeps its own pools, so a bard's known spells are never a sorcerer's.
   */
  function visitCasting(entry: BuildClass, casting: SpellcastingDef, classLevel: number, gainedAt: number, owner: string) {
    const classId = entry.def.id;
    const ability = castingAbilityOf(casting, build, entry.def);
    const ctx = contextFor(level, base, build, entry);
    const at = (l: number): BuildContext => ({ ...ctx, classLevel: l });
    const cantrips = (l: number) => (l < 1 ? 0 : resolveAmount(casting.cantrips ?? 0, at(l)));
    const prepared = (l: number) => (l < 1 ? 0 : resolveAmount(casting.prepared, at(l)));
    const newCantrips = cantrips(classLevel) - cantrips(classLevel - 1);
    const newSpells =
      casting.mode === 'known'
        ? prepared(classLevel) - prepared(classLevel - 1)
        : casting.mode === 'spellbook'
          ? classLevel === 1 ? 6 : 2
          : 0;
    if (newCantrips <= 0 && newSpells <= 0) return;
    const maxLevel = maxSpellLevel(casting, classLevel);
    const lists = [casting.list, ...(casting.extraLists && classLevel >= casting.extraLists.from ? casting.extraLists.lists : [])];
    const choices: ChoiceDef[] = [];
    if (newCantrips > 0) {
      choices.push({ id: 'cantrips', label: `Заговоры (${newCantrips})`, count: newCantrips, pool: knownCantripsPool(classId), spellAbility: ability, options: { from: 'spells', lists: [casting.list], maxLevel: 0 } });
    }
    if (newSpells > 0 && casting.mode === 'spellbook') {
      choices.push({
        id: 'spellbook',
        label: `В книгу заклинаний (${newSpells})`,
        count: newSpells,
        pool: SPELLBOOK_POOL,
        spellbook: true,
        hint: 'Заклинания волшебника, для которых у вас есть ячейки. Найденные свитки и книги переписываются отдельно, на листе.',
        options: { from: 'spells', lists: [casting.list], minLevel: 1, maxLevel },
      });
    } else if (newSpells > 0) {
      choices.push({ id: 'spells', label: `Заклинания (${newSpells})`, count: newSpells, pool: knownSpellsPool(classId), spellAbility: ability, options: { from: 'spells', lists, minLevel: 1, maxLevel } });
    }
    visitFeature(
      synthetic(`${classId}.spells-${classLevel}`, owner, 'Вы изучаете новые заклинания.', { choices }),
      'casting',
      gainedAt,
      'subclass',
      { ctx, classId, classLevel },
    );
  }

  /**
   * On every class level after the first, one pick of a replaceable pool of that class (its known
   * spells and cantrips, maneuvers, invocations, Metamagic) may be given up for another of the same pool.
   */
  function visitSwaps(entry: BuildClass, casting: SpellcastingDef | undefined, classLevel: number, gainedAt: number) {
    const classDef = entry.def;
    const pools = [
      ...(casting?.cantrips ? [{ pool: knownCantripsPool(classDef.id), label: 'Замена заговора' }] : []),
      ...(casting?.mode === 'known' ? [{ pool: knownSpellsPool(classDef.id), label: 'Замена заклинания' }] : []),
      ...(classDef.replaceable ?? []),
    ];
    for (const { pool, label } of pools) {
      // A pool with an earlier pick still in force, or given up on this very level (a lone arcanum).
      const givenUpHere = forgotten.filter((f) => f.pool === pool && f.level === gainedAt).map((f) => f.id);
      if (!out.poolPicks.some((p) => p.pool === pool && p.level < gainedAt && (p.active || givenUpHere.includes(p.id)))) continue;
      const template = [...out.choices].reverse().find((c) => c.choice.pool === pool)?.choice;
      if (!template) continue;
      const given = build.choices[forgetKey(pool, gainedAt)]?.length ?? 0;
      // Picks of one fixed level (a Mystic Arcanum) stay of that level; known spells follow the class.
      const source =
        template.options.from === 'spells' && casting && template.options.maxLevel !== 0 && !template.spellResource
          ? {
              ...template.options,
              maxLevel: maxSpellLevel(casting, classLevel),
              lists: [...new Set([...template.options.lists, ...(casting.extraLists && classLevel >= casting.extraLists.from ? casting.extraLists.lists : [])])],
            }
          : template.options;
      visitFeature(
        synthetic(`${pool}@${gainedAt}`, label, 'Можно заменить один из прежних выборов на другой.', {
          choices: [
            { id: 'forget', label, count: 1, optional: true, options: { from: 'forget', pool }, hint: 'Можно отказаться от одного прежнего выбора и взять другой.' },
            { ...template, id: 'learn', label: `${label}: взамен`, count: given, options: source, hint: undefined },
          ],
        }),
        'swap',
        gainedAt,
        'class',
        { ctx: contextFor(level, base, build, entry), classId: classDef.id, classLevel },
      );
    }
  }

  return out;
}

// ------------------------------------------------------------------------------------------------
// Numbers
// ------------------------------------------------------------------------------------------------

const baseScores = (build: DndBuild): Record<string, number> =>
  Object.fromEntries(
    ATTRIBUTE_IDS.map((id) => [id, (build.baseAttributes[id] ?? 10) + (build.backgroundBonuses[id] ?? 0)]),
  );

/** Final ability scores: base, background, then every increase in the order it was gained. */
export function buildScores(build: DndBuild, level = heroLevel(build)): Record<string, number> {
  const scores = baseScores(build);
  const { effects } = collect(build, level, scores);
  for (const { effect } of [...effects].sort((a, b) => a.owner.level - b.owner.level)) {
    if (effect.type !== 'attribute') continue;
    const max = effect.max ?? 20;
    const current = scores[effect.attribute] ?? 10;
    if (current < max) scores[effect.attribute] = Math.min(max, current + effect.amount);
  }
  return scores;
}

/** The hit die of the class a character level was taken in. */
export const hitDieAt = (build: Pick<DndBuild, 'classes'>, level: number): number | undefined => classAtLevel(build, level)?.entry.def.hitDie;

/**
 * Maximum hit points of a build: the full die of the starting class at character level 1, then on
 * every level the roll or the average of the die of the class taken there — a class taken later
 * never gives its full die.
 */
export function buildMaxHP(build: DndBuild, collected: Collected, scores: Record<string, number>, level = heroLevel(build)): number {
  const firstDie = hitDieAt(build, 1);
  if (firstDie === undefined) return 1;
  const constitution = abilityModifier(scores.constitution ?? 10);
  const ctx = contextFor(level, scores, build);
  let total = Math.max(1, firstDie + constitution);
  for (let l = 2; l <= level; l += 1) {
    const gained = build.hitPoints.find((entry) => entry.level === l)?.value ?? averageHitPoints(hitDieAt(build, l) ?? firstDie);
    total += Math.max(1, gained + constitution);
  }
  for (const { effect } of collected.effects) {
    if (effect.type === 'hpPerLevel') total += effect.amount * level;
    if (effect.type === 'hp') total += resolveAmount(effect.amount, ctx);
  }
  return total;
}

// ------------------------------------------------------------------------------------------------
// Writing the sheet
// ------------------------------------------------------------------------------------------------

/** Short stable hash, so granted ids stay readable and within limits. */
const hash = (value: string): string => {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
};

export const grantedId = (granted: GrantedFeature): string => `g-${granted.feature.id}-${hash(granted.key)}`;

/** Where a granted entry of the sheet comes from: the part of the build, and the feature it was picked in. */
export interface FeatureOrigin {
  /** The part of the hero it belongs to; a subclass counts as the class. */
  part: 'species' | 'background' | 'class';
  source: SourceKind;
  /** Key of the feature whose choice gave this one (Fighting Style for Defense), when there is one. */
  parent?: string;
}

/**
 * The origin of every feature a build grants, by its `grant` key: species, background or class,
 * and the feature it was chosen in. Sheets list a hero's features by it.
 */
export function featureOrigins(build: DndBuild): Map<string, FeatureOrigin> {
  const collected = collect(build);
  const keys = new Set(collected.features.map((g) => g.key));
  const origins = new Map<string, FeatureOrigin>();
  for (const granted of collected.features) {
    const root = granted.key.split(/[:/]/)[0];
    const part = root === 'species' || root === 'background' ? root : 'class';
    const slash = granted.key.lastIndexOf('/');
    const parent = slash > 0 ? granted.key.slice(0, slash) : undefined;
    origins.set(granted.key, { part, source: granted.source, parent: parent && keys.has(parent) ? parent : undefined });
  }
  return origins;
}

/** Picture of a passive trait whose content has none: where it comes from. */
const SOURCE_ICONS: Record<SourceKind, string> = {
  species: 'dna1',
  background: 'scroll-unfurled',
  class: 'sparkles',
  subclass: 'sparkles',
  feat: 'sparkles',
  option: 'sparkles',
  maneuver: 'crossed-swords',
  catalog: 'sparkles',
};

const CATEGORY_TITLES: Record<string, string> = { armor: 'Доспехи', weapon: 'Оружие', tool: 'Инструменты', language: 'Языки' };

/** A spell of the book as the player's own entry on the sheet (not granted by the build). */
export function catalogSpellEntry(id: string): Spell | undefined {
  const def = findSpell(id);
  return def ? spellEntry(def, undefined, { prepared: false }) : undefined;
}

/** The book of spells as the picker lists them for a hero: the lists of their classes first, castable levels marked. */
export function catalogSpells(build: DndBuild): { def: SpellDef; ownList: boolean; castable: boolean }[] {
  const casters = castersOf(build);
  const level = heroLevel(build);
  const highest = Math.max(0, ...casters.map((caster) => maxSpellLevel(caster.casting, classLevelAt(caster, level))));
  return DND.spells.map((def) => ({
    def,
    ownList: casters.some((caster) => def.lists.includes(caster.casting.list)),
    castable: def.level === 0 || def.level <= highest,
  }));
}

function spellEntry(def: SpellDef, previous: Spell | undefined, patch: Partial<Spell>): Spell {
  const duration = def.concentration ? `Концентрация, ${def.duration}` : def.duration;
  const description = [def.description, def.higherLevels && `**На больших уровнях.** ${def.higherLevels}`].filter(Boolean).join('\n\n');
  return {
    id: `spell-${def.id}`,
    name: def.name,
    level: def.level,
    school: def.school,
    castingTime: def.castingTime,
    actionType: def.action,
    range: def.range,
    components: def.components,
    duration: def.ritual ? `${duration} (ритуал)` : duration,
    description,
    effect: '',
    damage: def.damage,
    damageType: def.damageType,
    upcastDamage: def.upcastDamage,
    slotDamage: def.slotDamage as Record<string, string> | undefined,
    onHit: def.onHit,
    cantripScaling: def.cantripScaling,
    addModifier: def.addModifier,
    attackRoll: def.attackRoll,
    saveAttribute: def.saveAttribute,
    concentration: def.concentration,
    ritual: def.ritual || undefined,
    prepared: previous?.prepared ?? false,
    resourceId: def.level > 0 ? `slot-${def.level}` : undefined,
    resourceCost: def.level > 0 ? 1 : undefined,
    iconName: previous?.iconName ?? def.iconName,
    color: previous?.color ?? def.color,
    ...patch,
  };
}

/** Id of the hit dice pool a preset hero gets from its class. */
export const HIT_DICE_ID = 'hit-dice';

/**
 * When a pool comes back, in the sheet's terms. A pool that returns on either rest is a short-rest
 * one; a long-rest pool that also gives some back on a short rest returns that much on it.
 */
const recoveryOf = (def: ResourceDef, ctx: BuildContext): Pick<Resource, 'recovery' | 'recoveryAmount'> => {
  const recharge = typeof def.recharge === 'function' ? def.recharge(ctx) : def.recharge;
  if (def.shortRestRegain !== undefined && recharge === 'long') return { recovery: 'short', recoveryAmount: def.shortRestRegain };
  if (recharge === 'none') return { recovery: 'manual' };
  return { recovery: recharge === 'long' ? 'long' : 'short' };
};

export interface ApplyResult<C extends CharacterDraft = Character> {
  character: C;
  /** Content the build refers to but the presets do not have yet (a spell id, a feat id). */
  missing: string[];
}

/**
 * Writes a build onto the sheet. Granted entries are replaced; their use counters, preparation
 * and the icons the player chose survive. Damage taken survives a change of maximum hit points.
 */
export function applyBuild<C extends CharacterDraft>(character: C, build: DndBuild): ApplyResult<C> {
  const level = heroLevel(build);
  const missing: string[] = [];
  const scores = buildScores(build, level);
  const collected = collect(build, level, scores);
  const ctx = contextFor(level, scores, build);
  const classes = buildClasses(build);
  const species = findSpecies(build.species);
  const proficiency = proficiencyForLevel(level);

  // The features that are on (Rage, Bladesong) add their effects while they last.
  const active = new Set(character.activeFeatures ?? []);
  for (const granted of collected.features) {
    if (granted.feature.stance && active.has(grantedId(granted))) {
      for (const effect of resolveEffects(granted.feature.stance.effects, granted.ctx)) collected.effects.push({ effect, owner: granted });
    }
  }
  const effects = collected.effects.map((e) => e.effect);
  const ofType = <T extends Effect['type']>(type: T) => effects.filter((e): e is Extract<Effect, { type: T }> => e.type === type);
  // A feature that is on may raise scores too (a Mutagen of Potency: Strength +3, up to 23).
  for (const granted of collected.features) {
    if (!granted.feature.stance || !active.has(grantedId(granted))) continue;
    for (const effect of resolveEffects(granted.feature.stance.effects, granted.ctx)) {
      if (effect.type !== 'attribute') continue;
      const current = scores[effect.attribute] ?? 10;
      if (current < (effect.max ?? 20)) scores[effect.attribute] = Math.min(effect.max ?? 20, current + effect.amount);
    }
  }

  // Abilities, saves, skills.
  const savingThrowProficiencies = [...new Set([...character.savingThrowProficiencies, ...ofType('save').map((e) => e.attribute)])];
  const skillGrants = new Set(ofType('skill').map((e) => e.skill as string));
  const expertiseGrants = new Set(ofType('expertise').map((e) => e.skill as string));
  const skillBonuses = new Map<string, number>();
  for (const effect of ofType('skillBonus')) {
    for (const skill of effect.skills) skillBonuses.set(skill, (skillBonuses.get(skill) ?? 0) + resolveAmount(effect.amount, ctx));
  }
  const skills = character.skills.map((skill) => ({
    ...skill,
    proficient: skill.proficient || skillGrants.has(skill.id),
    expertise: skill.expertise || expertiseGrants.has(skill.id),
    bonus: skillBonuses.get(skill.id) || undefined,
  }));
  const halfProficiency = ofType('halfProficiency').length > 0 || undefined;
  const critRange = Math.min(20, ...ofType('critRange').map((e) => e.min));
  const attacksPerAction = Math.max(1, ...ofType('extraAttack').map((e) => e.attacks));
  const advantageOn = [...new Set(ofType('advantage').flatMap((e) => e.on))];
  const disadvantageOn = [...new Set(ofType('disadvantage').flatMap((e) => e.on))];
  const saveBonuses: Record<string, number> = {};
  for (const effect of ofType('saveBonus')) {
    for (const attribute of effect.attributes) saveBonuses[attribute] = (saveBonuses[attribute] ?? 0) + resolveAmount(effect.amount, ctx);
  }
  const unarmored = ofType('unarmoredDefense')[0];

  // Hit points: keep the damage already taken.
  const maxHP = buildMaxHP(build, collected, scores, level);
  const damage = character.build ? Math.max(0, character.maxHP - character.currentHP) : 0;
  const currentHP = Math.max(0, maxHP - damage);

  // Speed and initiative.
  const baseSpeed = Math.max(0, ...ofType('baseSpeed').map((e) => e.value), species?.speed ?? 0) || 30;
  const speedFrom = (when: SpeedCondition | undefined) =>
    ofType('speed').filter((e) => e.when === when).reduce((sum, e) => sum + resolveAmount(e.amount, ctx), 0);
  const speed = baseSpeed + speedFrom(undefined);
  const speedBonus = { unarmored: speedFrom('unarmored') || undefined, noHeavyArmor: speedFrom('noHeavyArmor') || undefined };
  const movement = movementFrom(ofType('movement'), speed);
  const darkvision = darkvisionFrom(ofType('darkvision'));
  // In a beast's shape (Wild Shape) its stat block stands in for the body: physical scores, armour
  // class, speeds, senses and attacks. Hit points, the mind and the features stay the druid's.
  const form = findBeast(ofType('form')[0]?.beast);
  const formArmorClass = form
    ? Math.max(form.ac, ...ofType('wildShape').map((e) => (e.armorClass !== undefined ? resolveAmount(e.armorClass, ctx) : 0)))
    : undefined;
  const initiative = ofType('initiative').reduce((sum, e) => sum + resolveAmount(e.amount, ctx), 0);

  // Resistances.
  const resistances: Resistance[] = [
    ...character.resistances.filter((r) => !r.grant),
    ...[...new Map(ofType('resistance').map((e) => [e.damageType, e])).values()].map((e) => ({
      id: `g-resistance-${hash(e.damageType)}`,
      type: e.damageType,
      level: e.level ?? 'resistance',
      grant: 'build',
    })),
  ];

  // Resources: hit dice, the pools of features, then spell slots.
  const previousResources = new Map(character.resources.map((r) => [r.id, r]));
  const resources: Resource[] = [];
  const pushResource = (resource: Resource) => {
    if (resources.some((r) => r.id === resource.id)) return;
    const previous = previousResources.get(resource.id);
    const gained = previous ? resource.max - previous.max : 0;
    resources.push({
      ...resource,
      current: previous ? Math.max(0, Math.min(resource.max, previous.current + Math.max(0, gained))) : resource.max,
      iconName: previous?.iconName || resource.iconName,
      color: previous?.color ?? resource.color,
    });
  };
  const startingClass = classes[0]?.def;
  if (startingClass) {
    pushResource({
      id: HIT_DICE_ID,
      name: `Кости хитов (к${startingClass.hitDie})`,
      iconName: 'rolling-dices',
      current: 0,
      max: level,
      description: 'Короткий отдых: потратьте кости, чтобы восстановить хиты (бросок + модификатор Телосложения). Долгий отдых возвращает все.',
      hitDie: startingClass.hitDie,
      recovery: 'long',
      grant: 'build',
    });
  }
  for (const granted of collected.features) {
    const def = granted.feature.resource;
    if (!def) continue;
    pushResource({
      id: def.id,
      name: def.name,
      iconName: def.iconName ?? granted.feature.iconName ?? '',
      current: 0,
      max: Math.max(0, resolveAmount(def.max, granted.ctx)),
      description: def.description ?? '',
      color: def.color,
      ...recoveryOf(def, granted.ctx),
      grant: granted.key,
    });
  }
  const caster = castersOf(build)[0];
  const casting = caster?.casting;
  const casterCtx = caster && contextFor(level, scores, build, caster);
  const slots = slotsAt(casting, casterCtx?.classLevel ?? 0);
  const pact = pactAt(casting, casterCtx?.classLevel ?? 0);
  if (pact) {
    pushResource({
      id: PACT_SLOTS_ID,
      name: 'Ячейки договора',
      iconName: 'magic-swirl',
      current: 0,
      max: pact.count,
      description: `Все ячейки договора — ${pact.level} круга: заклинание всегда творится на этом круге. Возвращаются после короткого или продолжительного отдыха.`,
      spellSlotLevel: pact.level,
      recovery: 'short',
      grant: 'spellcasting',
    });
  }
  slots.forEach((count, index) =>
    pushResource({
      id: `slot-${index + 1}`,
      name: `Ячейки ${index + 1} круга`,
      iconName: 'magic-swirl',
      current: 0,
      max: count,
      description: '',
      spellSlotLevel: index + 1,
      recovery: 'long',
      grant: 'spellcasting',
    }),
  );

  // Abilities and traits from features.
  const previousAbilities = new Map(character.abilities.map((a) => [a.id, a]));
  const abilities: Ability[] = [];
  const traits: Trait[] = [];
  for (const granted of collected.features) {
    // Its numbers are written for the level its own class has reached.
    const { feature, ctx } = granted;
    if (feature.hidden) continue;
    const id = grantedId(granted);
    if (feature.action) {
      const previous = previousAbilities.get(id);
      // What using it spends: another feature's pool, or its own uses when it takes an action. A
      // passive feature that only owns a pool (Channel Divinity, Focus) is not used by itself.
      const spends = feature.usesResource ?? (feature.action !== 'passive' ? feature.resource : undefined);
      abilities.push({
        id,
        name: feature.name,
        description: feature.description,
        actionType: feature.action,
        resourceId: spends?.id,
        // A conversion pays in its own way (Font of Magic): the slot and the points move together.
        resourceCost: spends && !feature.convert ? (feature.usesResource?.cost ?? 1) : undefined,
        resourceCostMax: feature.usesResource?.max !== undefined ? resolveAmount(feature.usesResource.max, ctx) : undefined,
        damagePerPoint: feature.usesResource?.perPoint,
        convert: feature.convert,
        effect: '',
        // Numbers that grow with level are written for the current one.
        damage: resolveDice(feature.damage, ctx),
        hpCost: costFor(feature.hpCost, ctx),
        hpCostWhenSpent: costFor(feature.hpCostWhenSpent, ctx),
        amplify: feature.amplify && {
          description: feature.amplify.description,
          hpCost: costFor(feature.amplify.hpCost, ctx),
          damage: resolveDice(feature.amplify.damage, ctx),
        },
        damageType: feature.damageType,
        saveAttribute: feature.saveAttribute,
        saveDC: feature.saveDC !== undefined ? resolveAmount(feature.saveDC, ctx) : undefined,
        // Features have no concentration of their own; a player's mark survives the rebuild.
        concentration: previous?.concentration,
        stance: feature.stance ? true : undefined,
        stanceEndsConcentration: feature.stance?.endsConcentration || undefined,
        stanceNoSpells: (typeof feature.stance?.noSpells === 'function' ? feature.stance.noSpells(ctx) : feature.stance?.noSpells) || undefined,
        stanceGroup: feature.stance?.group,
        stanceTempHP: feature.stance?.tempHP !== undefined ? formTempHP(feature, ctx, effects) : undefined,
        stanceUntilShortRest: feature.stance?.untilShortRest || undefined,
        tempHPFromDamage: feature.tempHPFromDamage,
        onHit: feature.onHit,
        iconName: previous?.iconName ?? feature.iconName,
        color: previous?.color ?? feature.color,
        grant: granted.key,
      });
    } else {
      traits.push({ id, name: feature.name, description: feature.description, iconName: feature.iconName ?? SOURCE_ICONS[granted.source], grant: granted.key });
    }
  }

  // Proficiencies and weapon masteries, as one readable trait each.
  const proficiencies = ofType('proficiency');
  if (proficiencies.length > 0) {
    const lines = Object.entries(CATEGORY_TITLES)
      .map(([category, title]) => {
        const values = [...new Set(proficiencies.filter((p) => p.category === category).map((p) => p.value))];
        return values.length > 0 ? `**${title}:** ${values.join(', ')}` : null;
      })
      .filter(Boolean);
    traits.push({ id: 'g-proficiencies', name: 'Владения', description: lines.join('\n\n'), iconName: 'checked-shield', grant: 'build' });
  }
  if (collected.masteries.length > 0) {
    const lines = collected.masteries.map((id) => {
      const weapon = DND.weapons.find((w) => w.id === id)!;
      const mastery = DND.masteries.find((m) => m.id === weapon.mastery);
      return `- **${weapon.name}** — ${mastery?.name ?? weapon.mastery}`;
    });
    traits.push({ id: 'g-weapon-mastery', name: 'Оружейное мастерство', description: lines.join('\n'), iconName: 'crossed-swords', grant: 'build' });
    // The class's Weapon Mastery feature names the weapons it works with, so its card says it all.
    const owner = collected.features.find(
      (g) => !g.feature.hidden && g.feature.name === 'Оружейное мастерство' && g.feature.choices?.some((c) => c.options.from === 'weapons'),
    );
    const trait = owner && traits.find((t) => t.grant === owner.key);
    if (trait) trait.description = `${trait.description}\n\n**Выбрано:**\n${lines.join('\n')}`;
  }

  // Spells: the class list for a preparing caster, then every spell granted by a feature.
  const previousSpells = new Map(character.spells.map((s) => [s.id, s]));
  const spells = new Map<string, Spell>();
  const castingAbility = caster ? castingAbilityOf(caster.casting, build, caster.def) : 'charisma';
  // A warlock casts every spell with a pact slot.
  const slotPatch = (def: SpellDef): Partial<Spell> => (pact && def.level > 0 ? { resourceId: PACT_SLOTS_ID } : {});
  if (casting?.mode === 'prepared') {
    const maxLevel = slots.length;
    for (const def of DND.spells) {
      if (!def.lists.includes(casting.list) || def.level < 1 || def.level > maxLevel) continue;
      spells.set(def.id, spellEntry(def, previousSpells.get(`spell-${def.id}`), { grant: 'spellcasting', ...slotPatch(def) }));
    }
  }
  const alwaysPrepared = new Set<string>();
  for (const { effect, owner } of collected.effects) {
    if (effect.type !== 'spell') continue;
    const def = findSpell(effect.spell);
    if (!def) {
      missing.push(`spell:${effect.spell}`);
      continue;
    }
    const chosenAbility = collected.spellAbilities.find((s) => owner.key.startsWith(s.prefix))?.ability;
    const ability = chosenAbility ?? effect.ability;
    const own = effect.resourceId ? { resourceId: effect.resourceId, resourceCost: 1 } : slotPatch(def);
    if (effect.alwaysPrepared === false) {
      // A spell of the spellbook: the player prepares it; an always-prepared copy wins.
      if (alwaysPrepared.has(def.id)) continue;
      const previous = previousSpells.get(`spell-${def.id}`);
      spells.set(def.id, spellEntry(def, previous, { prepared: previous?.alwaysPrepared ? false : (previous?.prepared ?? false), alwaysPrepared: undefined, grant: owner.key, ...own }));
      continue;
    }
    alwaysPrepared.add(def.id);
    spells.set(
      def.id,
      spellEntry(def, previousSpells.get(`spell-${def.id}`), {
        prepared: true,
        alwaysPrepared: true,
        ability: ability && ability !== castingAbility ? ability : undefined,
        grant: owner.key,
        ...own,
      }),
    );
  }

  // A feature that is on stays on only while the sheet still has it (a level given back takes it).
  const stillActive = (character.activeFeatures ?? []).filter((id) =>
    [...abilities, ...character.abilities.filter((a) => !a.grant)].some((a) => a.id === id && a.stance),
  );

  // Damage features add to the spells they fit (Agonizing Blast, Potent Spellcasting).
  const spellDamage = ofType('spellDamage');
  if (spellDamage.length > 0) {
    for (const [id, entry] of spells) {
      const def = findSpell(id);
      if (!def) continue;
      const bonus = spellDamage
        .filter(
          (e) =>
            (!e.spell || e.spell === def.id) &&
            (!e.list || def.lists.includes(e.list)) &&
            (!e.cantrips || def.level === 0) &&
            (!e.school || e.school === def.school) &&
            (!e.damageType || e.damageType === def.damageType),
        )
        .reduce((sum, e) => sum + resolveAmount(e.amount, ctx), 0);
      spells.set(id, { ...entry, damageBonus: bonus || undefined });
    }
  }

  const maxPreparedSpells = { ...character.maxPreparedSpells };
  if (casterCtx && (casting?.mode === 'prepared' || casting?.mode === 'spellbook')) maxPreparedSpells.total = resolveAmount(casting.prepared, casterCtx);

  // Names shown on the sheet.
  const lineage = collected.choices.find((c) => c.key.startsWith('species:') && c.choice.id === 'lineage' && c.picked.length > 0);
  const lineageOption =
    lineage && lineage.choice.options.from === 'options'
      ? (lineage.choice.options.options as OptionDef[]).find((o) => o.id === lineage.picked[0])
      : undefined;

  const result: C = {
    ...character,
    race: species?.name ?? character.race,
    subrace: lineageOption?.name ?? (species ? undefined : character.subrace),
    ...(classes.length > 0 ? classNames(classes) : { class: character.class, subclass: '' }),
    level,
    proficiencyBonus: proficiency,
    attributes: { ...character.attributes, ...scores, ...(form ? { strength: form.str, dexterity: form.dex, constitution: form.con } : {}) },
    savingThrowProficiencies,
    skills,
    maxHP,
    currentHP,
    speed: form ? form.speed : speed,
    speedBonus: !form && (speedBonus.unarmored || speedBonus.noHeavyArmor) ? speedBonus : undefined,
    movement: form ? beastMovement(form) : movement,
    darkvision: form ? form.darkvision : darkvision,
    initiativeBonus: initiative || undefined,
    halfProficiency,
    ritualsFromBook: casting?.mode === 'spellbook' || undefined,
    critRange: critRange < 20 ? critRange : undefined,
    attacksPerAction: attacksPerAction > 1 ? attacksPerAction : undefined,
    advantageOn: advantageOn.length > 0 ? advantageOn : undefined,
    disadvantageOn: disadvantageOn.length > 0 ? disadvantageOn : undefined,
    saveBonuses: Object.keys(saveBonuses).length > 0 ? saveBonuses : undefined,
    rollDice: ofType('rollDice').length > 0 ? ofType('rollDice').map((e) => ({ on: e.on, dice: resolveDice(e.dice, ctx)! })) : undefined,
    armorClassBonus: {
      always: ofType('armorClass').filter((e) => !e.armored && !e.noHeavyArmor).reduce((sum, e) => sum + resolveAmount(e.amount, ctx), 0),
      armored: ofType('armorClass').filter((e) => e.armored).reduce((sum, e) => sum + resolveAmount(e.amount, ctx), 0),
      noHeavyArmor: ofType('armorClass').filter((e) => e.noHeavyArmor).reduce((sum, e) => sum + resolveAmount(e.amount, ctx), 0) || undefined,
      manual: character.armorClassBonus?.manual,
      unarmored: unarmored?.attribute,
      unarmoredNoShield: unarmored?.noShield || undefined,
      form: formArmorClass,
    },
    resistances,
    damageRules: ofType('damageRoll').length
      ? ofType('damageRoll').map(({ rule }) => ({ ...rule, id: `g-rule-${hash(JSON.stringify(rule))}` }))
      : undefined,
    resources: [...resources, ...character.resources.filter((r) => !r.grant && !resources.some((g) => g.id === r.id))],
    abilities: [...abilities, ...character.abilities.filter((a) => !a.grant)],
    activeFeatures: stillActive.length > 0 ? stillActive : undefined,
    traits: [...traits, ...character.traits.filter((t) => !t.grant)],
    spells: [...spells.values(), ...character.spells.filter((s) => !s.grant && !spells.has(s.id.replace(/^spell-/, '')))],
    maxPreparedSpells,
    spellcastingDifficultyName: casting ? 'СЛ заклинаний' : character.spellcastingDifficultyName,
    spellcastingDifficultyValue: casting
      ? 8 + proficiency + abilityModifier(scores[castingAbility] ?? 10) + ofType('spellSaveDC').reduce((sum, e) => sum + e.amount, 0)
      : character.spellcastingDifficultyValue,
    attacks: [
      ...(form ? beastAttacks(form, character.attacks) : []),
      ...grantedAttacks(collected, character.attacks, scores, proficiency),
      ...withThrows(character.attacks.filter((a) => !a.grant), character.inventory).map((attack) =>
        weaponAttackFor(attack, character.inventory, scores, proficiency, effects, ctx),
      ),
    ],
    build,
  };

  return { character: rescaleLimbs(result), missing: [...new Set(missing)] };
}

/**
 * The class and subclass lines of the sheet: "Воин" and "Чемпион" for one class; for several,
 * each with its level in the order taken ("Воин 3 / Волшебник 2") and the subclasses chosen so far.
 */
export function classNames(classes: BuildClass[]): { class: string; subclass: string } {
  const several = classes.length > 1;
  return {
    class: classes.map((c) => (several ? `${c.def.name} ${c.levels.length}` : c.def.name)).join(' / '),
    subclass: classes.flatMap((c) => (c.subclass ? [c.subclass.name] : [])).join(' / '),
  };
}

/** A beast's other speeds, in the sheet's terms. */
const beastMovement = (beast: BeastFormDef): Character['movement'] =>
  beast.climb || beast.swim || beast.fly ? { climb: beast.climb, swim: beast.swim, fly: beast.fly } : undefined;

/** The attacks of a beast's stat block, with its own numbers, keeping the icons the player chose. */
const beastAttacks = (beast: BeastFormDef, previous: Attack[]): Attack[] =>
  beast.attacks.map((def, index) => {
    const id = `g-form-${beast.id}-${index}`;
    const before = previous.find((a) => a.id === id);
    return {
      id,
      name: def.name,
      description: def.note,
      damage: def.damage,
      damageType: def.damageType,
      hitBonus: def.hit,
      actionType: 'action',
      iconName: before?.iconName ?? beast.iconName,
      color: before?.color,
      grant: `form:${beast.id}`,
    };
  });

/** Temporary hit points a feature gives when it starts; a Moon druid's forms give three times as many. */
function formTempHP(feature: FeatureDef, ctx: BuildContext, effects: Effect[]): number {
  const base = resolveAmount(feature.stance?.tempHP ?? 0, ctx);
  const isForm = resolveEffects(feature.stance?.effects, ctx).some((e) => e.type === 'form');
  const multiplier = isForm ? Math.max(1, ...effects.flatMap((e) => (e.type === 'wildShape' && e.tempHPMultiplier ? [e.tempHPMultiplier] : []))) : 1;
  return base * multiplier;
}

/**
 * Climbing, swimming and flying speeds of the effects, 0 for one equal to the walking speed; of
 * two grants of one kind the faster stays.
 */
function movementFrom(effects: Extract<Effect, { type: 'movement' }>[], walking: number): Character['movement'] {
  const out: NonNullable<Character['movement']> = {};
  for (const { mode, feet } of effects) {
    const current = out[mode];
    const value = feet ?? 0;
    const speedOf = (v: number) => (v === 0 ? walking : v);
    if (current === undefined || speedOf(value) > speedOf(current)) out[mode] = value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Darkvision: the longest range given outright, then every "+N, or N if you had none". */
function darkvisionFrom(effects: Extract<Effect, { type: 'darkvision' }>[]): number | undefined {
  let range = Math.max(0, ...effects.filter((e) => !e.extend).map((e) => e.range));
  for (const effect of effects.filter((e) => e.extend)) range = range > 0 ? range + effect.range : effect.range;
  return range > 0 ? range : undefined;
}

const signed = (dice: string, modifier: number): string =>
  modifier === 0 ? dice : `${dice}${modifier > 0 ? '+' : '-'}${Math.abs(modifier)}`;

const hasProperty = (weapon: WeaponDef, name: string) => weapon.properties.some((p) => p.startsWith(name));

/** Monk weapons: simple melee weapons and martial melee weapons with the Light property. */
const isMonkWeapon = (weapon: WeaponDef) =>
  weapon.kind === 'melee' && (weapon.category === 'simple' || hasProperty(weapon, 'Лёгкое'));

const matchesFilter = (weapon: WeaponDef, filter: WeaponDef['category'] | 'any' | 'melee' | 'monk' | 'simpleOrMartialMelee' | 'ranged') => {
  switch (filter) {
    case 'any':
      return true;
    case 'monk':
      return isMonkWeapon(weapon);
    case 'melee':
    case 'ranged':
      return weapon.kind === filter;
    case 'simpleOrMartialMelee':
      return weapon.category === 'simple' || weapon.kind === 'melee';
    default:
      return weapon.category === filter;
  }
};

/**
 * Whether the hero is proficient with a weapon, by the proficiencies of the build: a whole category
 * ("Воинское оружие"), martial weapons with some property (Rogue, Bard, Monk) or the weapon by name.
 */
export function weaponProficient(weapon: WeaponDef, effects: Effect[]): boolean {
  const values = new Set(effects.filter((e) => e.type === 'proficiency' && e.category === 'weapon').map((e) => (e as Extract<Effect, { type: 'proficiency' }>).value));
  if (values.has(weapon.name)) return true;
  if (weapon.category === 'simple') return values.has('Простое оружие');
  if (values.has('Воинское оружие')) return true;
  if (values.has('Воинское оружие (фехтовальное или лёгкое)')) return hasProperty(weapon, 'Фехтовальное') || hasProperty(weapon, 'Лёгкое');
  if (values.has('Воинское оружие (лёгкое)')) return hasProperty(weapon, 'Лёгкое');
  return false;
}

/** Weapons of the tables that can be thrown (a dagger, a javelin, a dart). */
const isThrown = (weapon: WeaponDef) => hasProperty(weapon, 'Метательное');

/**
 * A melee weapon of the tables that can be thrown gets its throw beside its own attack (sheets
 * equipped before throws existed get it here).
 */
function withThrows(attacks: Attack[], inventory: InventoryItem[]): Attack[] {
  // Two Light melee weapons in hand: each gives an extra attack with the other hand (a Bonus Action).
  const light = equippedTableWeapons(inventory).filter(({ weapon }) => weapon.kind === 'melee' && hasProperty(weapon, 'Лёгкое'));
  const offHand = light.length >= 2 ? new Set(light.map(({ item }) => item.id)) : new Set<string>();
  const kept = attacks.filter((a) => !a.id.endsWith(OFF_HAND) || offHand.has(a.weaponId ?? ''));
  return kept.flatMap((attack) => {
    const item = inventory.find((i) => i.id === attack.weaponId);
    const weapon = item && DND.weapons.find((w) => w.id === item.ref);
    if (!item || !weapon || attack.id !== weaponAttackId(item.id)) return [attack];
    const extra: Attack[] = [];
    if (weapon.kind === 'melee' && isThrown(weapon) && !kept.some((a) => a.id === weaponThrowId(item.id)))
      extra.push(weaponAttack({ ...item, thrown: true }, undefined, { throw: true }));
    if (offHand.has(item.id) && !kept.some((a) => a.id === attack.id + OFF_HAND))
      extra.push({ ...weaponAttack(item), id: attack.id + OFF_HAND, name: `${item.name}: второй рукой`, actionType: 'bonus' });
    return [attack, ...extra];
  });
}

/** Suffix of an extra attack with the other hand (two Light weapons). */
const OFF_HAND = '_offhand';

/** Equipped weapons of the tables, with their table entries. */
const equippedTableWeapons = (inventory: InventoryItem[]) =>
  inventory.flatMap((item) => {
    const weapon = item.equipped && item.type === 'weapon' ? DND.weapons.find((w) => w.id === item.ref) : undefined;
    return weapon ? [{ item, weapon }] : [];
  });

/** The die a versatile weapon deals in both hands: "Универсальное (1d10)" → "1d10". */
const versatileDie = (weapon: WeaponDef) =>
  /Универсальное \(([^)]+)\)/.exec(weapon.properties.find((p) => p.startsWith('Универсальное')) ?? '')?.[1];

/**
 * Attack and damage bonus of a preset weapon: Strength, Dexterity for ranged weapons, the better of
 * the two for finesse ones, or an ability a feature allows (Martial Arts, Pact of the Blade); the
 * proficiency bonus only when proficient, plus bonuses like Archery.
 */
function weaponAttackFor(
  attack: Character['attacks'][number],
  inventory: InventoryItem[],
  scores: Record<string, number>,
  proficiency: number,
  effects: Effect[] = [],
  ctx?: BuildContext,
): Character['attacks'][number] {
  const item = inventory.find((i) => i.id === attack.weaponId);
  const weapon = item && DND.weapons.find((w) => w.id === item.ref);
  if (!weapon) return attack;
  const modifierOf = (attribute: string) => abilityModifier(scores[attribute] ?? 10);
  const candidates: string[] = weapon.kind === 'ranged' ? ['dexterity'] : hasProperty(weapon, 'Фехтовальное') ? ['strength', 'dexterity'] : ['strength'];
  for (const effect of effects) {
    if (effect.type === 'weaponAbility' && matchesFilter(weapon, effect.weapons)) candidates.push(effect.ability);
  }
  const attribute = candidates.reduce((best, a) => (modifierOf(a) > modifierOf(best) ? a : best), candidates[0]!);
  const modifier = modifierOf(attribute);
  // A bigger die a feature allows (Martial Arts) replaces the weapon's own.
  const average = (dice: string) => {
    const m = /^(\d*)d(\d+)$/.exec(dice);
    return m ? Number(m[1] || 1) * (Number(m[2]) + 1) / 2 : 0;
  };
  const dice = effects
    .filter((e): e is Extract<Effect, { type: 'weaponDie' }> => e.type === 'weaponDie' && matchesFilter(weapon, e.weapons))
    .reduce((best, e) => (average(e.die) > average(best) ? e.die : best), weapon.damage);
  const hitBonus = effects
    .filter((e): e is Extract<Effect, { type: 'attackBonus' }> => e.type === 'attackBonus' && e.kind === weapon.kind)
    .reduce((sum, e) => sum + e.amount, 0);
  // A dart flies itself, as does a thrown dagger; a bow shoots arrows.
  const spendsItself = attack.id.endsWith('_throw') || (weapon.kind === 'ranged' && isThrown(weapon));
  // Fighting styles. Dueling: a melee weapon in one hand and no other weapon. Great Weapon Fighting: a
  // two-handed or versatile one. The other hand's attack adds no ability unless Two-Weapon Fighting
  // (or the ability is negative).
  const styles = new Set(effects.flatMap((e) => (e.type === 'weaponStyle' ? [e.style] : [])));
  const offHand = attack.id.endsWith(OFF_HAND);
  const melee = equippedTableWeapons(inventory).filter(({ weapon: w }) => w.kind === 'melee');
  const dueling =
    styles.has('dueling') && weapon.kind === 'melee' && !hasProperty(weapon, 'Двуручное') && melee.length <= 1 && !spendsItself;
  const bonus = ctx
    ? damageBonusFor(attribute, effects, ctx, { heavy: hasProperty(weapon, 'Тяжёлое'), melee: weapon.kind === 'melee' && !spendsItself, weapon: true })
    : { flat: 0, dice: [] };
  const extra = bonus.flat;
  const damageModifier = (offHand && !styles.has('twoWeapon') ? Math.min(0, modifier) : modifier + (dueling ? 2 : 0)) + extra;
  const damage = signed(dice, damageModifier);
  const heavy = weapon.kind === 'melee' && (hasProperty(weapon, 'Двуручное') || hasProperty(weapon, 'Универсальное'));
  const twoHanded = !offHand && !spendsItself ? versatileDie(weapon) : undefined;
  return {
    ...attack,
    usesAmmunition: weapon.kind === 'ranged' && !spendsItself,
    thrown: spendsItself || undefined,
    ranged: weapon.kind === 'ranged' || spendsItself || undefined,
    hitBonus: (weaponProficient(weapon, effects) ? proficiency : 0) + modifier + hitBonus,
    damage,
    // Made from the item every time, so the dice of a feature that has ended do not stay behind.
    damageComponents:
      withBonusDice(item.damageComponents?.length ? item.damageComponents : [{ damage, type: attack.damageType }], bonus.dice) ??
      item.damageComponents,
    // Dueling's +2 is for one hand: held in two, the versatile die goes without it.
    damageTwoHanded: twoHanded ? signed(twoHanded, modifier + extra) : undefined,
    minDie: styles.has('greatWeapon') && heavy && !spendsItself ? 3 : undefined,
    attribute,
  };
}

/**
 * Damage the features add to an attack made with an ability (Rage: +2 with Strength; Great Weapon
 * Master with a Heavy one): a flat bonus to its own damage, and dice of their own type dealt beside
 * it (Crimson Rite).
 */
function damageBonusFor(
  attribute: string,
  effects: Effect[],
  ctx: BuildContext,
  { heavy = false, melee = false, weapon = false }: { heavy?: boolean; melee?: boolean; weapon?: boolean } = {},
): { flat: number; dice: DamageComponent[] } {
  const fitting = effects.filter(
    (e): e is Extract<Effect, { type: 'damageBonus' }> =>
      e.type === 'damageBonus' && (!e.ability || e.ability === attribute) && (!e.heavy || heavy) && (!e.melee || melee) && (!e.weapon || weapon),
  );
  return {
    flat: fitting.reduce((sum, e) => sum + ('amount' in e ? resolveAmount(e.amount, ctx) : 0), 0),
    dice: fitting.flatMap((e) => ('dice' in e ? [{ damage: resolveDice(e.dice, ctx)!, type: e.damageType, extra: true }] : [])),
  };
}

/** An attack's damage with the dice the features deal beside it, as components; none without such dice. */
const withBonusDice = (base: DamageComponent[], dice: DamageComponent[]): DamageComponent[] | undefined =>
  dice.length > 0 ? [...base, ...dice] : undefined;

/**
 * Attacks the features give (Unarmed Strike with the Martial Arts die): rebuilt, keeping the player's
 * icon, their dice by the level of the class that gives them (a monk's, not the hero's).
 */
function grantedAttacks(collected: Collected, previous: Attack[], scores: Record<string, number>, proficiency: number): Attack[] {
  const out: Attack[] = [];
  for (const { effect, owner } of collected.effects) {
    if (effect.type !== 'attack') continue;
    const { ctx } = owner;
    const def: GrantedAttackDef = effect.attack;
    const id = `g-attack-${def.id}`;
    if (out.some((a) => a.id === id)) continue;
    const attribute = def.abilities.reduce((best, a) => (abilityModifier(scores[a] ?? 10) > abilityModifier(scores[best] ?? 10) ? a : best), def.abilities[0]!);
    const modifier = abilityModifier(scores[attribute] ?? 10);
    const dice = resolveDice(def.damage, ctx)!;
    const before = previous.find((a) => a.id === id);
    const bonus = damageBonusFor(attribute, collected.effects.map((e) => e.effect), ctx, { melee: !def.ranged });
    const damage = signed(dice, modifier + bonus.flat);
    out.push({
      id,
      name: def.name,
      description: def.description,
      damage,
      damageType: def.damageType,
      damageComponents: withBonusDice([{ damage, type: def.damageType }], bonus.dice),
      hitBonus: proficiency + modifier + (def.hitBonus !== undefined ? resolveAmount(def.hitBonus, ctx) : 0),
      actionType: def.actionType ?? 'action',
      ranged: def.ranged || undefined,
      attribute,
      iconName: before?.iconName ?? def.iconName,
      color: before?.color,
      grant: owner.key,
    });
  }
  return out;
}

// ------------------------------------------------------------------------------------------------
// Where an entry comes from
// ------------------------------------------------------------------------------------------------

/**
 * Where a granted entry of the sheet comes from, for people: "Вид «Эльф»", "Паладин, 2 уровень",
 * "Черта «Бдительный» · Предыстория «Солдат»". `grant` is the entry's `grant` field.
 */
export function describeGrant(build: DndBuild, grant: string | undefined): string | undefined {
  if (!grant) return undefined;
  if (grant === 'spellcasting') {
    const caster = castersOf(build)[0];
    return caster ? `Заклинания класса «${caster.def.name}»` : undefined;
  }
  if (grant === 'build') return 'Класс, вид и предыстория';

  const collected = collect(build);
  const granted = collected.features.find((f) => f.key === grant);
  const root = grant.split(':')[0];
  const entry = buildClasses(build).find((c) => c.def.id === granted?.classId);
  // A class feature tells its class level ("Волшебник, 2 уровень"), its subclass's or casting's under their name.
  const className =
    root === 'subclass'
      ? (entry?.subclass?.name ?? entry?.def.name)
      : root === 'casting' && entry?.subclass?.spellcasting
        ? entry.subclass.name
        : entry?.def.name;
  const origin =
    root === 'species'
      ? `Вид «${findSpecies(build.species)?.name ?? ''}»`
      : root === 'background'
        ? `Предыстория «${findBackground(build.background)?.name ?? ''}»`
        : `${className ?? ''}, ${granted?.classLevel ?? granted?.level ?? 1} уровень`;

  // A feat, a maneuver or an inline option names its own feature, then where it was picked.
  const via = collected.features.find(
    (f) => f.key !== grant && (f.source === 'feat' || f.source === 'option' || f.source === 'maneuver' || f.source === 'catalog') && grant.startsWith(f.key),
  );
  const catalogOf = (feature: FeatureDef) => CATALOG_NAMES[(feature as CatalogEntryDef).catalog] ?? 'Выбор';
  const own =
    granted?.source === 'feat'
      ? `Черта «${granted.feature.name}»`
      : granted?.source === 'maneuver'
        ? 'Приём мастера боя'
        : granted?.source === 'catalog'
          ? `${catalogOf(granted.feature)} «${granted.feature.name}»`
          : via?.source === 'feat'
            ? `Черта «${via.feature.name}»`
            : via?.source === 'catalog'
              ? `${catalogOf(via.feature)} «${via.feature.name}»`
              : undefined;
  return own ? `${own} · ${origin}` : origin;
}

// ------------------------------------------------------------------------------------------------
// Level plans and options
// ------------------------------------------------------------------------------------------------

export interface LevelPlan {
  /** The character level. */
  level: number;
  /** The class the level was taken in, and the class level it is. */
  classId?: string;
  classLevel: number;
  /** Features gained on this level (hidden ones are headings of the choices that follow). */
  features: GrantedFeature[];
  /** Choices of this level; picks already made are in `picked`. */
  choices: OpenChoice[];
  /** The subclass of the level's class has to be chosen on this level. */
  needsSubclass: boolean;
  hitDie: number;
}

/**
 * What a hero gets on character `level` of the build, in the class the build gives it to, with the
 * picks made so far (choices open more choices as they are made).
 */
export function levelPlan(build: DndBuild, level: number): LevelPlan {
  const collected = collect(build, level, buildScores(build, level));
  const at = classAtLevel(build, level);
  return {
    level,
    classId: at?.entry.def.id,
    classLevel: at?.classLevel ?? level,
    features: collected.features.filter((f) => f.level === level),
    choices: collected.choices.filter((c) => c.level === level),
    needsSubclass: !!at && at.classLevel === at.entry.def.subclassLevel && !at.entry.subclass,
    hitDie: at?.entry.def.hitDie ?? 8,
  };
}

/** A build with one more character level, taken in `classId` (a class new to the hero joins the end of the list). */
export function addLevel(build: DndBuild, classId: string): DndBuild {
  const level = heroLevel(build) + 1;
  const taken = build.classes.some((c) => c.class === classId);
  return {
    ...build,
    classes: taken
      ? build.classes.map((c) => (c.class === classId ? { ...c, levels: [...c.levels, level] } : c))
      : [...build.classes, { class: classId, levels: [level] }],
  };
}

/** Sets the subclass of one class of the build; the picks of another subclass go with it. */
export function setSubclass(build: DndBuild, classId: string, subclassId: string | undefined): DndBuild {
  const entry = buildClasses(build).find((c) => c.def.id === classId);
  const previous = entry?.subclass;
  // Picks of the old subclass's features, and of its spellcasting when it was the class's (an Eldritch Knight's).
  const prefixes = previous
    ? [
        ...Object.values(previous.levels).flat().map((f) => `subclass:${f.id}`),
        ...(previous.spellcasting ? [`casting:${classId}.`, `swap:${knownCantripsPool(classId)}@`, `swap:${knownSpellsPool(classId)}@`] : []),
      ]
    : [];
  return {
    ...build,
    classes: build.classes.map((c) => (c.class === classId ? { ...c, subclass: subclassId } : c)),
    choices: Object.fromEntries(Object.entries(build.choices).filter(([key]) => !prefixes.some((prefix) => key.startsWith(prefix)))),
  };
}

export interface OptionView {
  id: string;
  name: string;
  description: string;
  /** A short line under the name (feat category, spell level and school, weapon mastery). */
  meta?: string;
  /** Why it cannot be picked. */
  disabled?: string;
  /** Heading the option is filed under in a long list (spell level, feat category, weapon kind). */
  group?: string;
  /** Game-icons id of the picture shown on the option's card. */
  iconName?: string;
  /** Colour of the picture (a spell's damage type). */
  color?: string;
  /** May be taken more than once, in this very choice too (Agonizing Blast). */
  repeatable?: boolean;
}

const LANGUAGES = [
  'Общий', 'Общий язык жестов', 'Великаний', 'Гномий', 'Гоблинский', 'Дварфийский', 'Драконий', 'Орочий',
  'Полуросликов', 'Эльфийский', 'Бездны', 'Глубинная речь', 'Друидический', 'Инфернальный', 'Небесный',
  'Первичный', 'Сильван', 'Подземный', 'Воровской жаргон',
];

const ACTION_NAMES: Record<string, string> = {
  action: 'Действие',
  bonus: 'Бонусное действие',
  reaction: 'Реакция',
  passive: 'Без действия',
};

const FEAT_CATEGORY_NAMES: Record<string, string> = {
  origin: 'Черта происхождения',
  general: 'Общая черта',
  fightingStyle: 'Боевой стиль',
  epicBoon: 'Эпический дар',
};

/** Picks of other choices sharing a pool with this one. */
const poolPicks = (collected: Collected, open: OpenChoice): Set<string> =>
  new Set(collected.choices.filter((c) => c.key !== open.key && c.choice.pool && c.choice.pool === open.choice.pool).flatMap((c) => c.picked));

/** At least `min` in one of the scores, or in each of them when `all`. */
const meetsScores = (need: { list: AttributeId[]; min: number; all?: boolean }, scores: Record<string, number>): boolean =>
  need.all ? need.list.every((a) => (scores[a] ?? 10) >= need.min) : need.list.some((a) => (scores[a] ?? 10) >= need.min);

function featBlocker(feat: FeatDef, build: DndBuild, collected: Collected, scores: Record<string, number>, level: number, open: OpenChoice): string | undefined {
  const taken = collected.features.some((f) => f.feature.id === feat.id && !f.key.startsWith(open.key));
  if (taken && !feat.repeatable) return 'Уже есть';
  const pre = feat.prerequisite;
  if (!pre) return undefined;
  if (pre.level && level < pre.level) return `С ${pre.level}-го уровня`;
  if (pre.attributes && !meetsScores(pre.attributes, scores)) {
    return `${pre.attributes.list.map(attributeName).join(' или ')} ${pre.attributes.min}+`;
  }
  if (pre.proficiency) {
    const has = collected.effects.some(({ effect }) => effect.type === 'proficiency' && effect.value === pre.proficiency);
    if (!has) return `Нужно владение: ${pre.proficiency}`;
  }
  if (pre.spellcasting && castersOf(build).length === 0 && !collected.effects.some(({ effect }) => effect.type === 'spell')) {
    return 'Нужна способность творить заклинания';
  }
  return undefined;
}

/**
 * Options of an open choice at character `level`, with the reason each unavailable one cannot be
 * picked. Feats ask for a character level; what a class gives (invocations, Wild Shape beasts, an
 * option of a later level) asks for the level of that class.
 */
export function choiceOptions(build: DndBuild, level: number, open: OpenChoice): OptionView[] {
  const scores = buildScores(build, level);
  const collected = collect(build, level, scores);
  const { ctx } = open.owner;
  const classLevel = ctx.classLevel;
  const taken = poolPicks(collected, open);
  const source = open.choice.options;
  const proficientSkills = new Set(
    collected.effects
      .filter(({ effect, owner }) => effect.type === 'skill' && !owner.key.startsWith(open.key))
      .map(({ effect }) => (effect as Extract<Effect, { type: 'skill' }>).skill),
  );
  const ownPicks = new Set(open.picked);

  switch (source.from) {
    case 'skills':
      return (source.list ?? (SKILLS_LIST.map((s) => s.id) as SkillId[])).map((id) => ({
        id,
        name: skillName(id),
        description: '',
        disabled: proficientSkills.has(id) && !ownPicks.has(id) ? 'Уже владеете' : undefined,
      }));
    case 'expertise':
    {
      // A skill already in expertise from another feature is not offered twice.
      const expert = new Set(
        collected.effects
          .filter(({ effect, owner }) => effect.type === 'expertise' && !owner.key.startsWith(open.key))
          .map(({ effect }) => (effect as Extract<Effect, { type: 'expertise' }>).skill),
      );
      return [...proficientSkills]
        .filter((id) => !source.list || source.list.includes(id))
        .map((id) => ({ id, name: skillName(id), description: '', disabled: expert.has(id) && !ownPicks.has(id) ? 'Уже экспертиза' : undefined }));
    }
    case 'attributes':
      return (source.list ?? (ATTRIBUTE_IDS as AttributeId[])).map((id) => ({
        id,
        name: attributeName(id),
        description: `Сейчас ${scores[id] ?? 10}`,
        disabled: (scores[id] ?? 10) >= (source.max ?? 20) ? `Уже ${source.max ?? 20}` : undefined,
      }));
    case 'feats':
      return DND.feats
        .filter((feat) => source.categories.includes(feat.category))
        .map((feat) => ({
          id: feat.id,
          name: feat.name,
          description: feat.description,
          meta: FEAT_CATEGORY_NAMES[feat.category],
          group: FEAT_CATEGORY_NAMES[feat.category],
          iconName: feat.iconName,
          disabled: ownPicks.has(feat.id) ? undefined : featBlocker(feat, build, collected, scores, level, open),
        }));
    case 'maneuvers':
      return DND.maneuvers.map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        meta: ACTION_NAMES[m.action ?? 'passive'],
        group: ACTION_NAMES[m.action ?? 'passive'],
        iconName: m.iconName,
        disabled: taken.has(m.id) ? 'Уже изучен' : undefined,
      }));
    case 'catalog': {
      const known = new Set(collected.effects.filter(({ effect }) => effect.type === 'spell').map(({ effect }) => (effect as Extract<Effect, { type: 'spell' }>).spell));
      const owned = new Set(collected.features.filter((f) => !f.key.startsWith(open.key)).map((f) => f.feature.id));
      return DND.catalogs[source.catalog].map((entry) => {
        const pre = entry.prerequisite;
        const blocker =
          taken.has(entry.id) && !entry.repeatable
            ? 'Уже есть'
            : pre?.level && classLevel < pre.level
              ? `С ${pre.level}-го уровня`
              : pre?.spell && !known.has(pre.spell)
                ? `Нужно заклинание «${findSpell(pre.spell)?.name ?? pre.spell}»`
                : pre?.entry && !owned.has(pre.entry)
                  ? `Нужно «${findCatalogEntry(source.catalog, pre.entry)?.name ?? pre.entry}»`
                  : pre?.attributes && !meetsScores(pre.attributes, scores)
                    ? `${pre.attributes.list.map(attributeName).join(pre.attributes.all ? ' и ' : ' или ')} ${pre.attributes.min}+`
                    : pre?.skill && !proficientSkills.has(pre.skill)
                      ? `Нужно владение: ${skillName(pre.skill)}`
                      : undefined;
        return {
          id: entry.id,
          name: entry.name,
          description: entry.description,
          meta:
            [
              pre?.level && `${pre.level}+ уровень`,
              pre?.attributes && `${pre.attributes.list.map(attributeName).join(pre.attributes.all ? ' и ' : ' или ')} ${pre.attributes.min}+`,
              pre?.skill && skillName(pre.skill),
              pre?.text,
            ]
              .filter(Boolean)
              .join(' · ') || ACTION_NAMES[entry.action ?? 'passive'],
          group: pre?.level ? `С ${pre.level}-го уровня` : 'Без требований',
          iconName: entry.iconName,
          repeatable: entry.repeatable || undefined,
          disabled: ownPicks.has(entry.id) ? undefined : blocker,
        };
      });
    }
    case 'forget': {
      // Earlier picks of the pool still in force (or given up by this very choice).
      const forgottenHere = new Set(open.picked);
      return collected.poolPicks
        .filter((p) => p.pool === source.pool && p.level < open.level && (p.active || forgottenHere.has(p.id)))
        .map((p) => {
          const spell = findSpell(p.id);
          const entry = spell ? undefined : pickEntry(p.id);
          return {
            id: p.id,
            name: spell?.name ?? entry?.name ?? p.id,
            description: spell?.description ?? entry?.description ?? '',
            meta: `${spell ? (spell.level === 0 ? 'Заговор' : `${spell.level} круг`) + ' · ' : ''}выбрано на ${p.level} уровне`,
            iconName: spell?.iconName ?? entry?.iconName,
            color: spell ? spellColor(spell) : entry?.color,
          };
        });
    }
    case 'spells': {
      const maxLevel = resolveAmount(source.maxLevel, ctx);
      const known = new Set(
        collected.effects.filter(({ effect, owner }) => effect.type === 'spell' && !owner.key.startsWith(open.key)).map(({ effect }) => (effect as Extract<Effect, { type: 'spell' }>).spell),
      );
      const book = source.fromSpellbook
        ? new Set(collected.poolPicks.filter((p) => p.pool === 'spellbook' && p.active).map((p) => p.id))
        : undefined;
      return DND.spells
        .filter((s) => s.lists.some((l) => source.lists.includes(l)))
        .filter((s) => !book || book.has(s.id))
        .filter((s) => s.level >= (source.minLevel ?? 0) && s.level <= maxLevel)
        .filter((s) => !source.schools || source.schools.includes(s.school))
        .filter((s) => !source.ritual || s.ritual)
        .filter((s) => !source.ids || source.ids.includes(s.id))
        .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'ru'))
        .map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          meta: `${s.level === 0 ? 'Заговор' : `${s.level} круг`} · ${s.school}`,
          group: s.level === 0 ? 'Заговоры' : `${s.level} круг`,
          iconName: s.iconName,
          color: spellColor(s),
          // A spell of the book is what a spellbook pick is made from, so it is not "known" for it.
          disabled: ((!book && known.has(s.id)) || taken.has(s.id)) && !ownPicks.has(s.id) ? 'Уже известно' : undefined,
        }));
    }
    case 'weapons': {
      // Mastery is learnt only with weapons the hero is proficient with.
      const effects = collected.effects.map((e) => e.effect);
      return DND.weapons
        .filter((w) => {
          switch (source.filter) {
            case 'simple':
              return w.category === 'simple';
            case 'martial':
              return w.category === 'martial';
            case 'melee':
              return w.kind === 'melee';
            case 'simpleOrMartialMelee':
              return w.category === 'simple' || w.kind === 'melee';
            default:
              return true;
          }
        })
        .map((w) => {
          const mastery = DND.masteries.find((m) => m.id === w.mastery);
          return {
            id: w.id,
            name: w.name,
            description: mastery?.description ?? '',
            meta: `${mastery?.name ?? w.mastery} · ${w.damage} ${w.damageType.toLowerCase()}`,
            group: `${w.category === 'simple' ? 'Простое' : 'Воинское'} ${w.kind === 'melee' ? 'рукопашное' : 'дальнобойное'}`,
            iconName: DND_ICONS.weapons[w.id],
            disabled: taken.has(w.id) ? 'Уже выбрано' : !weaponProficient(w, effects) && !ownPicks.has(w.id) ? 'Нет владения' : undefined,
          };
        });
    }
    case 'beasts': {
      // Challenge 1/4 from level 2, 1/2 from 4, 1 from 8 (flying beasts too); Circle Forms go higher.
      // A choice of its own challenge (a Pale Moon curse) takes any beast up to it.
      const base = classLevel >= 8 ? 1 : classLevel >= 4 ? 1 / 2 : 1 / 4;
      const boosted = collected.effects.flatMap(({ effect }) =>
        effect.type === 'wildShape' && effect.maxCR !== undefined ? [resolveAmount(effect.maxCR, ctx)] : [],
      );
      const fixed = source.maxCR !== undefined;
      const maxCR = fixed ? source.maxCR! : Math.max(base, ...boosted);
      return [...DND.beasts]
        .sort((a, b) => a.cr - b.cr || a.name.localeCompare(b.name, 'ru'))
        .map((beast) => ({
          id: beast.id,
          name: beast.name,
          description: beastSummary(beast),
          meta: `Опасность ${challengeLabel(beast.cr)} · ${beast.size}`,
          group: `Опасность ${challengeLabel(beast.cr)}`,
          iconName: beast.iconName,
          disabled: ownPicks.has(beast.id)
            ? undefined
            : beast.cr > maxCR
              ? `Опасность выше ${challengeLabel(maxCR)}`
              : beast.fly && classLevel < 8 && !fixed
                ? 'Летающие звери — с 8-го уровня'
                : taken.has(beast.id)
                  ? 'Уже известен'
                  : undefined,
        }));
    }
    case 'tools':
      return (source.list ?? DND.gear.filter((g) => g.kind === 'tool').map((g) => g.name)).map((name) => ({ id: name, name, description: '' }));
    case 'languages': {
      const known = new Set(
        collected.effects
          .filter(({ effect, owner }) => effect.type === 'proficiency' && effect.category === 'language' && !owner.key.startsWith(open.key))
          .map(({ effect }) => (effect as Extract<Effect, { type: 'proficiency' }>).value),
      );
      return LANGUAGES.map((name) => ({ id: name, name, description: '', iconName: 'scroll-unfurled', disabled: known.has(name) && !ownPicks.has(name) ? 'Уже знаете' : undefined }));
    }
    case 'options':
      // Options sharing a pool across levels (Arcane Shots) are not offered again once taken.
      return source.options.map((o) => ({
        id: o.id,
        name: o.name,
        description: o.description,
        iconName: o.iconName,
        disabled: ownPicks.has(o.id)
          ? undefined
          : taken.has(o.id)
            ? 'Уже есть'
            : o.minLevel && classLevel < o.minLevel
              ? `С ${o.minLevel}-го уровня`
              : undefined,
      }));
  }
}

/**
 * Choices whose picks the sheet changes directly, any time (the known forms of Wild Shape) — all of
 * them, or those of one granted feature: the one holding the choice, or one its pick brought (the
 * offering of the picked type changes the type).
 */
export function sheetChoices(build: DndBuild, grant?: string): OpenChoice[] {
  return collect(build, heroLevel(build), buildScores(build)).choices.filter(
    (c) =>
      c.choice.onSheet &&
      (grant === undefined || c.owner.key === grant || grant.startsWith(`${c.key}=`) || grant.startsWith(`${c.key}:`)),
  );
}

/** Choices of a plan still waiting for picks (a choice with fewer options than its count is done when all are taken). */
export function unfinishedChoices(build: DndBuild, plan: LevelPlan): OpenChoice[] {
  return plan.choices.filter((open) => {
    if (open.choice.optional || open.picked.length >= open.count) return false;
    const available = choiceOptions(build, plan.level, open).filter((o) => !o.disabled).length;
    return open.picked.length < Math.min(open.count, available);
  });
}

/** Records the picks of a choice; picks that depended on replaced ones are dropped. */
export function setPicks(build: DndBuild, key: string, picks: string[]): DndBuild {
  const choices = Object.fromEntries(Object.entries(build.choices).filter(([k]) => !k.startsWith(`${key}=`) && !k.startsWith(`${key}:`)));
  return { ...build, choices: { ...choices, [key]: picks } };
}

/** A granted feature's numbers as they stand on the level it was collected for (damage that grows, a save DC), for previews. */
export function featureNumbers({ feature, ctx }: GrantedFeature): { damage?: string; saveDC?: number } {
  return {
    damage: resolveDice(feature.damage, ctx),
    saveDC: feature.saveDC !== undefined ? resolveAmount(feature.saveDC, ctx) : undefined,
  };
}
