import type { Ability, Build, Character, CharacterDraft, InventoryItem, Resistance, Resource, Spell, Trait } from '@itd/schema';
import { ATTRIBUTES_LIST, SKILLS_LIST } from '../content/attributes';
import { spellColor } from '../content/combat';
import { abilityModifier } from '../rules/abilities';
import { calculateArmorClass } from '../rules/armor';
import { DND } from './content';
import { proficiencyForLevel, resolveAmount } from './helpers';
import type {
  AttributeId,
  BuildContext,
  ChoiceDef,
  ClassDef,
  Effect,
  FeatDef,
  FeatureDef,
  OptionDef,
  SkillId,
  SpeciesDef,
  SpellDef,
  SpellcastingDef,
  SubclassDef,
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

export const findClass = (id: string | undefined): ClassDef | undefined => DND.classes.find((c) => c.id === id);
export const findSubclass = (classDef: ClassDef | undefined, id: string | undefined): SubclassDef | undefined =>
  classDef?.subclasses.find((s) => s.id === id);
export const findSpecies = (id: string | undefined): SpeciesDef | undefined => DND.species.find((s) => s.id === id);
export const findBackground = (id: string | undefined) => DND.backgrounds.find((b) => b.id === id);
export const findFeat = (id: string | undefined): FeatDef | undefined => DND.feats.find((f) => f.id === id);
export const findSpell = (id: string | undefined): SpellDef | undefined => DND.spells.find((s) => s.id === id);

const ATTRIBUTE_IDS = ATTRIBUTES_LIST.map((a) => a.id);
const attributeName = (id: string) => ATTRIBUTES_LIST.find((a) => a.id === id)?.name ?? id;
const skillName = (id: string) => SKILLS_LIST.find((s) => s.id === id)?.name ?? id;

/** Spell slots of the class or its subclass at a class level; empty for non-casters. */
export function spellcastingOf(build: Pick<Build, 'class' | 'subclass'>): SpellcastingDef | undefined {
  const classDef = findClass(build.class);
  return classDef?.spellcasting ?? findSubclass(classDef, build.subclass)?.spellcasting;
}

const slotsAt = (casting: SpellcastingDef | undefined, classLevel: number): number[] =>
  casting?.slots[classLevel - 1] ?? [];

// ------------------------------------------------------------------------------------------------
// Walking the content
// ------------------------------------------------------------------------------------------------

export type SourceKind = 'species' | 'background' | 'class' | 'subclass' | 'feat' | 'option' | 'maneuver';

export interface GrantedFeature {
  /** Stable path of the feature in the build, unique per hero. */
  key: string;
  feature: FeatureDef;
  /** Character level it was gained at. */
  level: number;
  source: SourceKind;
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
}

/** A context good enough to evaluate effects before ability increases are known. */
const contextFor = (level: number, scores: Record<string, number>): BuildContext => ({
  level,
  classLevel: level,
  proficiencyBonus: proficiencyForLevel(level),
  score: (attribute) => scores[attribute] ?? 10,
  modifier: (attribute) => abilityModifier(scores[attribute] ?? 10),
});

const resolveEffects = (effects: FeatureDef['effects'], ctx: BuildContext): Effect[] =>
  (typeof effects === 'function' ? effects(ctx) : effects) ?? [];

/** Synthetic feature for things the content describes as data rather than features. */
const synthetic = (id: string, name: string, description: string, extra: Partial<FeatureDef> = {}): FeatureDef => ({
  id,
  name,
  description,
  hidden: true,
  ...extra,
});

/**
 * Walks every feature a build has up to `level`: species, background, class levels, subclass
 * levels, and everything picked through choices (feats, maneuvers, inline options).
 */
export function collect(build: Build, level = build.level, scores?: Record<string, number>): Collected {
  const ctx = contextFor(level, scores ?? baseScores(build));
  const out: Collected = { features: [], choices: [], effects: [], masteries: [], spellAbilities: [] };

  const visitFeature = (feature: FeatureDef, ownerKey: string, gainedAt: number, source: SourceKind) => {
    if (feature.minLevel && level < feature.minLevel) return;
    const granted: GrantedFeature = { key: `${ownerKey}:${feature.id}`, feature, level: Math.max(gainedAt, feature.minLevel ?? 0), source };
    out.features.push(granted);
    for (const effect of resolveEffects(feature.effects, ctx)) out.effects.push({ effect, owner: granted });
    for (const choice of feature.choices ?? []) {
      const key = `${granted.key}/${choice.id}`;
      const picked = build.choices[key] ?? [];
      out.choices.push({ key, choice, count: resolveAmount(choice.count, ctx), picked, level: granted.level, owner: granted });
      for (const pick of picked) visitPick(choice, pick, key, granted);
    }
  };

  const visitPick = (choice: ChoiceDef, pick: string, choiceKey: string, owner: GrantedFeature) => {
    const options = choice.options;
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
        if (feat) visitFeature(feat, choiceKey, owner.level, 'feat');
        break;
      }
      case 'maneuvers': {
        const maneuver = DND.maneuvers.find((m) => m.id === pick);
        if (maneuver) visitFeature(maneuver, choiceKey, owner.level, 'maneuver');
        break;
      }
      case 'spells':
        add({ type: 'spell', spell: pick, alwaysPrepared: true, ability: choice.spellAbility });
        break;
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
        for (const effect of resolveEffects(option.effects, ctx)) add(effect);
        for (const feature of option.features ?? []) visitFeature(feature, `${choiceKey}=${option.id}`, owner.level, 'option');
        break;
      }
    }
  };

  // Species and background: level 1.
  const species = findSpecies(build.species);
  if (species) {
    out.effects.push({
      effect: { type: 'baseSpeed', value: species.speed },
      owner: { key: 'species', feature: synthetic('species', species.name, ''), level: 1, source: 'species' },
    });
    for (const feature of species.features) visitFeature(feature, 'species', 1, 'species');
  }

  const background = findBackground(build.background);
  if (background) {
    const owner: GrantedFeature = {
      key: 'background',
      feature: synthetic('background', background.name, background.description),
      level: 1,
      source: 'background',
    };
    out.features.push(owner);
    for (const skill of background.skills) out.effects.push({ effect: { type: 'skill', skill }, owner });
    out.effects.push({ effect: { type: 'proficiency', category: 'tool', value: background.tool }, owner });
    const feat = findFeat(background.feat);
    if (feat) visitFeature(feat, 'background', 1, 'feat');
    // Every 2024 hero speaks Common and two more languages of the player's choice.
    visitFeature(
      synthetic('origin.languages', 'Языки', 'Вы знаете Общий язык и ещё два языка на выбор.', {
        effects: [{ type: 'proficiency', category: 'language', value: 'Общий' }],
        choices: [{ id: 'languages', label: 'Языки (2)', count: 2, options: { from: 'languages' } }],
      }),
      'background',
      1,
      'background',
    );
  }

  // Class and subclass levels.
  const classDef = findClass(build.class);
  if (classDef) {
    const owner: GrantedFeature = {
      key: 'class',
      feature: synthetic(`${classDef.id}.proficiencies`, classDef.name, classDef.description),
      level: 1,
      source: 'class',
    };
    out.features.push(owner);
    for (const attribute of classDef.saves) out.effects.push({ effect: { type: 'save', attribute }, owner });
    for (const effect of classDef.proficiencies) out.effects.push({ effect, owner });
    visitFeature(
      synthetic(`${classDef.id}.skills`, 'Навыки класса', `Владение ${classDef.skillChoices.count} навыками из списка класса.`, {
        choices: [{ id: 'skills', label: `Навыки (${classDef.skillChoices.count})`, count: classDef.skillChoices.count, options: { from: 'skills', list: classDef.skillChoices.list } }],
      }),
      'class',
      1,
      'class',
    );

    const subclass = findSubclass(classDef, build.subclass);
    const casting = classDef.spellcasting ?? subclass?.spellcasting;
    for (let classLevel = 1; classLevel <= level; classLevel += 1) {
      for (const feature of classDef.levels[classLevel] ?? []) visitFeature(feature, 'class', classLevel, 'class');
      if (subclass && classLevel >= classDef.subclassLevel) {
        for (const feature of subclass.levels[classLevel] ?? []) visitFeature(feature, 'subclass', classLevel, 'subclass');
        for (const spell of subclass.alwaysPrepared?.[classLevel] ?? []) {
          out.effects.push({ effect: { type: 'spell', spell, alwaysPrepared: true }, owner });
        }
      }
      if (casting?.mode === 'known') visitKnownSpells(casting, classLevel, subclass?.spellcasting ? subclass.name : classDef.name);
    }
  }

  /** A caster who learns spells picks the new ones on the level they come. */
  function visitKnownSpells(casting: SpellcastingDef, classLevel: number, owner: string) {
    const at = (l: number) => contextFor(l, scores ?? baseScores(build));
    const cantrips = (l: number) => (l < 1 ? 0 : resolveAmount(casting.cantrips ?? 0, at(l)));
    const prepared = (l: number) => (l < 1 ? 0 : resolveAmount(casting.prepared, at(l)));
    const newCantrips = cantrips(classLevel) - cantrips(classLevel - 1);
    const newSpells = prepared(classLevel) - prepared(classLevel - 1);
    if (newCantrips <= 0 && newSpells <= 0) return;
    const maxLevel = slotsAt(casting, classLevel).length;
    const choices: ChoiceDef[] = [];
    if (newCantrips > 0) {
      choices.push({ id: 'cantrips', label: `Заговоры (${newCantrips})`, count: newCantrips, pool: 'known-cantrips', spellAbility: casting.ability, options: { from: 'spells', lists: [casting.list], maxLevel: 0 } });
    }
    if (newSpells > 0) {
      choices.push({ id: 'spells', label: `Заклинания (${newSpells})`, count: newSpells, pool: 'known-spells', spellAbility: casting.ability, options: { from: 'spells', lists: [casting.list], minLevel: 1, maxLevel } });
    }
    visitFeature(
      synthetic(`spells-${classLevel}`, owner, 'Вы изучаете новые заклинания.', { choices }),
      'casting',
      classLevel,
      'subclass',
    );
  }

  return out;
}

// ------------------------------------------------------------------------------------------------
// Numbers
// ------------------------------------------------------------------------------------------------

const baseScores = (build: Build): Record<string, number> =>
  Object.fromEntries(
    ATTRIBUTE_IDS.map((id) => [id, (build.baseAttributes[id] ?? 10) + (build.backgroundBonuses[id] ?? 0)]),
  );

/** Final ability scores: base, background, then every increase in the order it was gained. */
export function buildScores(build: Build, level = build.level): Record<string, number> {
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

export const averageHitPoints = (hitDie: number): number => hitDie / 2 + 1;

/** Maximum hit points of a build: the full die at level 1, then rolled or average gains. */
export function buildMaxHP(build: Build, collected: Collected, scores: Record<string, number>, level = build.level): number {
  const classDef = findClass(build.class);
  if (!classDef) return 1;
  const constitution = abilityModifier(scores.constitution ?? 10);
  const ctx = contextFor(level, scores);
  let total = Math.max(1, classDef.hitDie + constitution);
  for (let l = 2; l <= level; l += 1) {
    const gained = build.hitPoints.find((entry) => entry.level === l)?.value ?? averageHitPoints(classDef.hitDie);
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

/** Picture of a passive trait whose content has none: where it comes from. */
const SOURCE_ICONS: Record<SourceKind, string> = {
  species: 'dna1',
  background: 'scroll-unfurled',
  class: 'sparkles',
  subclass: 'sparkles',
  feat: 'sparkles',
  option: 'sparkles',
  maneuver: 'crossed-swords',
};

const CATEGORY_TITLES: Record<string, string> = { armor: 'Доспехи', weapon: 'Оружие', tool: 'Инструменты', language: 'Языки' };

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
    prepared: previous?.prepared ?? false,
    resourceId: def.level > 0 ? `slot-${def.level}` : undefined,
    resourceCost: def.level > 0 ? 1 : undefined,
    iconName: previous?.iconName ?? def.iconName,
    color: previous?.color ?? def.color,
    ...patch,
  };
}

export interface ApplyResult<C extends CharacterDraft = Character> {
  character: C;
  /** Content the build refers to but the presets do not have yet (a spell id, a feat id). */
  missing: string[];
}

/**
 * Writes a build onto the sheet. Granted entries are replaced; their use counters, preparation
 * and the icons the player chose survive. Damage taken survives a change of maximum hit points.
 */
export function applyBuild<C extends CharacterDraft>(character: C, build: Build): ApplyResult<C> {
  const level = build.level;
  const missing: string[] = [];
  const scores = buildScores(build, level);
  const collected = collect(build, level, scores);
  const ctx = contextFor(level, scores);
  const classDef = findClass(build.class);
  const subclass = findSubclass(classDef, build.subclass);
  const species = findSpecies(build.species);
  const proficiency = proficiencyForLevel(level);

  const effects = collected.effects.map((e) => e.effect);
  const ofType = <T extends Effect['type']>(type: T) => effects.filter((e): e is Extract<Effect, { type: T }> => e.type === type);

  // Abilities, saves, skills.
  const savingThrowProficiencies = [...new Set([...character.savingThrowProficiencies, ...ofType('save').map((e) => e.attribute)])];
  const skillGrants = new Set(ofType('skill').map((e) => e.skill as string));
  const expertiseGrants = new Set(ofType('expertise').map((e) => e.skill as string));
  const skills = character.skills.map((skill) => ({
    ...skill,
    proficient: skill.proficient || skillGrants.has(skill.id),
    expertise: skill.expertise || expertiseGrants.has(skill.id),
  }));

  // Hit points: keep the damage already taken.
  const maxHP = buildMaxHP(build, collected, scores, level);
  const damage = character.build ? Math.max(0, character.maxHP - character.currentHP) : 0;
  const currentHP = Math.max(0, maxHP - damage);

  // Speed and initiative.
  const baseSpeed = Math.max(0, ...ofType('baseSpeed').map((e) => e.value), species?.speed ?? 0) || 30;
  const speed = baseSpeed + ofType('speed').reduce((sum, e) => sum + e.amount, 0);
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

  // Resources: the pools of features, then spell slots.
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
  for (const granted of collected.features) {
    const def = granted.feature.resource;
    if (!def) continue;
    pushResource({
      id: def.id,
      name: def.name,
      iconName: def.iconName ?? granted.feature.iconName ?? '',
      current: 0,
      max: Math.max(0, resolveAmount(def.max, ctx)),
      description: def.description ?? '',
      color: def.color,
      grant: granted.key,
    });
  }
  const casting = classDef?.spellcasting ?? subclass?.spellcasting;
  const slots = slotsAt(casting, level);
  slots.forEach((count, index) =>
    pushResource({
      id: `slot-${index + 1}`,
      name: `Ячейки ${index + 1} круга`,
      iconName: 'magic-swirl',
      current: 0,
      max: count,
      description: '',
      spellSlotLevel: index + 1,
      grant: 'spellcasting',
    }),
  );

  // Abilities and traits from features.
  const previousAbilities = new Map(character.abilities.map((a) => [a.id, a]));
  const abilities: Ability[] = [];
  const traits: Trait[] = [];
  for (const granted of collected.features) {
    const { feature } = granted;
    if (feature.hidden) continue;
    const id = grantedId(granted);
    if (feature.action) {
      const previous = previousAbilities.get(id);
      abilities.push({
        id,
        name: feature.name,
        description: feature.description,
        actionType: feature.action,
        resourceId: feature.resource?.id ?? feature.usesResource?.id,
        resourceCost: feature.resource || feature.usesResource ? (feature.usesResource?.cost ?? 1) : undefined,
        effect: '',
        damage: feature.damage,
        damageType: feature.damageType,
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
  }

  // Spells: the class list for a preparing caster, then every spell granted by a feature.
  const previousSpells = new Map(character.spells.map((s) => [s.id, s]));
  const spells = new Map<string, Spell>();
  const castingAbility = casting?.ability ?? 'charisma';
  if (casting?.mode === 'prepared') {
    const maxLevel = slots.length;
    for (const def of DND.spells) {
      if (!def.lists.includes(casting.list) || def.level < 1 || def.level > maxLevel) continue;
      spells.set(def.id, spellEntry(def, previousSpells.get(`spell-${def.id}`), { grant: 'spellcasting' }));
    }
  }
  for (const { effect, owner } of collected.effects) {
    if (effect.type !== 'spell') continue;
    const def = findSpell(effect.spell);
    if (!def) {
      missing.push(`spell:${effect.spell}`);
      continue;
    }
    const chosenAbility = collected.spellAbilities.find((s) => owner.key.startsWith(s.prefix))?.ability;
    const ability = chosenAbility ?? effect.ability;
    spells.set(
      def.id,
      spellEntry(def, previousSpells.get(`spell-${def.id}`), {
        prepared: true,
        alwaysPrepared: true,
        ability: ability && ability !== castingAbility ? ability : undefined,
        grant: owner.key,
      }),
    );
  }

  const maxPreparedSpells = { ...character.maxPreparedSpells };
  if (casting?.mode === 'prepared') maxPreparedSpells.total = resolveAmount(casting.prepared, ctx);

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
    class: classDef?.name ?? character.class,
    subclass: subclass?.name ?? '',
    level,
    proficiencyBonus: proficiency,
    attributes: { ...character.attributes, ...scores },
    savingThrowProficiencies,
    skills,
    maxHP,
    currentHP,
    speed,
    initiativeBonus: initiative || undefined,
    armorClassBonus: {
      always: ofType('armorClass').filter((e) => !e.armored).reduce((sum, e) => sum + e.amount, 0),
      armored: ofType('armorClass').filter((e) => e.armored).reduce((sum, e) => sum + e.amount, 0),
    },
    resistances,
    resources: [...resources, ...character.resources.filter((r) => !r.grant && !resources.some((g) => g.id === r.id))],
    abilities: [...abilities, ...character.abilities.filter((a) => !a.grant)],
    traits: [...traits, ...character.traits.filter((t) => !t.grant)],
    spells: [...spells.values(), ...character.spells.filter((s) => !s.grant && !spells.has(s.id.replace(/^spell-/, '')))],
    maxPreparedSpells,
    spellcastingDifficultyName: casting ? 'СЛ заклинаний' : character.spellcastingDifficultyName,
    spellcastingDifficultyValue: casting
      ? 8 + proficiency + abilityModifier(scores[casting.ability] ?? 10)
      : character.spellcastingDifficultyValue,
    attacks: character.attacks.map((attack) => weaponAttackFor(attack, character.inventory, scores, proficiency)),
    build,
  };
  // Armour class follows the worn gear and the bonuses just written.
  return { character: { ...result, armorClass: calculateArmorClass(result) }, missing: [...new Set(missing)] };
}

/** Attack and damage bonus of a preset weapon: proficiency plus Strength, Dexterity for finesse or ranged. */
function weaponAttackFor(
  attack: Character['attacks'][number],
  inventory: InventoryItem[],
  scores: Record<string, number>,
  proficiency: number,
): Character['attacks'][number] {
  const item = inventory.find((i) => i.id === attack.weaponId);
  const weapon = item && DND.weapons.find((w) => w.id === item.ref);
  if (!weapon) return attack;
  const strength = abilityModifier(scores.strength ?? 10);
  const dexterity = abilityModifier(scores.dexterity ?? 10);
  const finesse = weapon.properties.some((p) => p.startsWith('Фехтовальное'));
  const modifier = weapon.kind === 'ranged' ? dexterity : finesse ? Math.max(strength, dexterity) : strength;
  const sign = modifier >= 0 ? '+' : '-';
  return {
    ...attack,
    hitBonus: proficiency + modifier,
    damage: modifier === 0 ? weapon.damage : `${weapon.damage}${sign}${Math.abs(modifier)}`,
    attribute: weapon.kind === 'ranged' || (finesse && dexterity > strength) ? 'dexterity' : 'strength',
  };
}

// ------------------------------------------------------------------------------------------------
// Level plans and options
// ------------------------------------------------------------------------------------------------

export interface LevelPlan {
  level: number;
  /** Features gained on this level (hidden ones are headings of the choices that follow). */
  features: GrantedFeature[];
  /** Choices of this level; picks already made are in `picked`. */
  choices: OpenChoice[];
  /** The subclass has to be chosen on this level. */
  needsSubclass: boolean;
  hitDie: number;
}

/** What a hero gets on `level` with the picks made so far (choices open more choices as they are made). */
export function levelPlan(build: Build, level: number): LevelPlan {
  const target = { ...build, level };
  const collected = collect(target, level, buildScores(target, level));
  const classDef = findClass(build.class);
  return {
    level,
    features: collected.features.filter((f) => f.level === level),
    choices: collected.choices.filter((c) => c.level === level),
    needsSubclass: !!classDef && level === classDef.subclassLevel && !build.subclass,
    hitDie: classDef?.hitDie ?? 8,
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

function featBlocker(feat: FeatDef, build: Build, collected: Collected, scores: Record<string, number>, level: number, open: OpenChoice): string | undefined {
  const taken = collected.features.some((f) => f.feature.id === feat.id && !f.key.startsWith(open.key));
  if (taken && !feat.repeatable) return 'Уже есть';
  const pre = feat.prerequisite;
  if (!pre) return undefined;
  if (pre.level && level < pre.level) return `С ${pre.level}-го уровня`;
  if (pre.attributes && !pre.attributes.list.some((a) => (scores[a] ?? 10) >= pre.attributes!.min)) {
    return `${pre.attributes.list.map(attributeName).join(' или ')} ${pre.attributes.min}+`;
  }
  if (pre.proficiency) {
    const has = collected.effects.some(({ effect }) => effect.type === 'proficiency' && effect.value === pre.proficiency);
    if (!has) return `Нужно владение: ${pre.proficiency}`;
  }
  if (pre.spellcasting && !spellcastingOf(build) && !collected.effects.some(({ effect }) => effect.type === 'spell')) {
    return 'Нужна способность творить заклинания';
  }
  return undefined;
}

/** Options of an open choice, with the reason each unavailable one cannot be picked. */
export function choiceOptions(build: Build, level: number, open: OpenChoice): OptionView[] {
  const target = { ...build, level };
  const scores = buildScores(target, level);
  const collected = collect(target, level, scores);
  const ctx = contextFor(level, scores);
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
      return [...proficientSkills].map((id) => ({ id, name: skillName(id), description: '' }));
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
    case 'spells': {
      const maxLevel = resolveAmount(source.maxLevel, ctx);
      const known = new Set(
        collected.effects.filter(({ effect, owner }) => effect.type === 'spell' && !owner.key.startsWith(open.key)).map(({ effect }) => (effect as Extract<Effect, { type: 'spell' }>).spell),
      );
      return DND.spells
        .filter((s) => s.lists.some((l) => source.lists.includes(l)))
        .filter((s) => s.level >= (source.minLevel ?? 0) && s.level <= maxLevel)
        .filter((s) => !source.schools || source.schools.includes(s.school))
        .filter((s) => !source.ritual || s.ritual)
        .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'ru'))
        .map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          meta: `${s.level === 0 ? 'Заговор' : `${s.level} круг`} · ${s.school}`,
          group: s.level === 0 ? 'Заговоры' : `${s.level} круг`,
          iconName: s.iconName,
          color: spellColor(s),
          disabled: (known.has(s.id) || taken.has(s.id)) && !ownPicks.has(s.id) ? 'Уже известно' : undefined,
        }));
    }
    case 'weapons':
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
            disabled: taken.has(w.id) ? 'Уже выбрано' : undefined,
          };
        });
    case 'tools':
      return (source.list ?? DND.gear.filter((g) => g.kind === 'tool').map((g) => g.name)).map((name) => ({ id: name, name, description: '' }));
    case 'languages': {
      const known = new Set(
        collected.effects
          .filter(({ effect, owner }) => effect.type === 'proficiency' && effect.category === 'language' && !owner.key.startsWith(open.key))
          .map(({ effect }) => (effect as Extract<Effect, { type: 'proficiency' }>).value),
      );
      return LANGUAGES.map((name) => ({ id: name, name, description: '', disabled: known.has(name) && !ownPicks.has(name) ? 'Уже знаете' : undefined }));
    }
    case 'options':
      return source.options.map((o) => ({ id: o.id, name: o.name, description: o.description }));
  }
}

/** Choices of a plan still waiting for picks (a choice with fewer options than its count is done when all are taken). */
export function unfinishedChoices(build: Build, plan: LevelPlan): OpenChoice[] {
  return plan.choices.filter((open) => {
    if (open.picked.length >= open.count) return false;
    const available = choiceOptions(build, plan.level, open).filter((o) => !o.disabled).length;
    return open.picked.length < Math.min(open.count, available);
  });
}

/** Records the picks of a choice; picks that depended on replaced ones are dropped. */
export function setPicks(build: Build, key: string, picks: string[]): Build {
  const choices = Object.fromEntries(Object.entries(build.choices).filter(([k]) => !k.startsWith(`${key}=`) && !k.startsWith(`${key}:`)));
  return { ...build, choices: { ...choices, [key]: picks } };
}
