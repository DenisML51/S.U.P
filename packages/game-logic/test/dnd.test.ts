import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Build, Character } from '@itd/schema';
import {
  DND,
  applyBuild,
  choiceOptions,
  collect,
  levelPlan,
  setPicks,
  startingSkills,
  unfinishedChoices,
  type FeatureDef,
} from '../src';
import { makeCharacter } from './helpers';

const build = (patch: Partial<Build> = {}): Build => ({
  ruleset: 'dnd2024',
  species: 'human',
  background: 'soldier',
  class: 'fighter',
  abilityMethod: 'pointBuy',
  baseAttributes: { strength: 15, dexterity: 13, constitution: 14, intelligence: 8, wisdom: 12, charisma: 10 },
  backgroundBonuses: { strength: 2, constitution: 1 },
  choices: {},
  hitPoints: [],
  level: 1,
  ...patch,
});

const fresh = (): Character => makeCharacter({ skills: startingSkills(), maxHP: 10, currentHP: 10 });
const apply = (b: Build, character = fresh()) => applyBuild(character, b).character;

describe('D&D content', () => {
  it('has unique ids within each kind', () => {
    for (const list of [DND.feats, DND.spells, DND.species, DND.backgrounds, DND.maneuvers, DND.weapons, DND.armor, DND.gear]) {
      const ids = list.map((entry: { id: string }) => entry.id);
      expect(ids.length).toBe(new Set(ids).size);
    }
  });

  it('refers only to spells, feats and items it has', () => {
    const spells = new Set(DND.spells.map((s) => s.id));
    const items = new Set([...DND.weapons, ...DND.armor, ...DND.gear].map((i) => i.id));
    const missing: string[] = [];
    const visit = (feature: FeatureDef) => {
      const effects = typeof feature.effects === 'function' ? [] : (feature.effects ?? []);
      for (const effect of effects) if (effect.type === 'spell' && !spells.has(effect.spell)) missing.push(effect.spell);
      for (const choice of feature.choices ?? []) {
        if (choice.options.from === 'options') {
          for (const option of choice.options.options) {
            const optionEffects = typeof option.effects === 'function' ? [] : (option.effects ?? []);
            for (const effect of optionEffects) if (effect.type === 'spell' && !spells.has(effect.spell)) missing.push(effect.spell);
            option.features?.forEach(visit);
          }
        }
      }
    };
    for (const classDef of DND.classes) {
      Object.values(classDef.levels).flat().forEach(visit);
      for (const subclass of classDef.subclasses) {
        Object.values(subclass.levels).flat().forEach(visit);
        for (const spell of Object.values(subclass.alwaysPrepared ?? {}).flat()) if (!spells.has(spell)) missing.push(spell);
      }
      for (const kit of classDef.startingEquipment) for (const item of kit.items) if (!items.has(item.ref)) missing.push(item.ref);
    }
    DND.species.forEach((s) => s.features.forEach(visit));
    DND.feats.forEach(visit);
    for (const background of DND.backgrounds) {
      if (!DND.feats.some((f) => f.id === background.feat)) missing.push(background.feat);
      for (const kit of background.equipment) for (const item of kit.items) if (!items.has(item.ref)) missing.push(item.ref);
    }
    expect(missing).toEqual([]);
  });

  it('uses only icons of the game-icons catalogue', () => {
    const catalogue = readFileSync(fileURLToPath(new URL('../../../apps/web/src/ui/gameIconCatalog.ts', import.meta.url)), 'utf8');
    const known = new Set([...catalogue.matchAll(/^\s+'?([a-z0-9-]+)'?: Gi/gm)].map((m) => m[1]));
    const used = new Set<string>();
    const scan = (value: unknown) => {
      if (Array.isArray(value)) value.forEach(scan);
      else if (value && typeof value === 'object') {
        for (const [key, inner] of Object.entries(value)) {
          if (key === 'iconName' && typeof inner === 'string') used.add(inner);
          else scan(inner);
        }
      }
    };
    scan([DND.classes, DND.species, DND.feats, DND.spells, DND.maneuvers]);
    expect([...used].filter((icon) => !known.has(icon))).toEqual([]);
  });
});

describe('build engine', () => {
  it('writes a level-1 fighter onto the sheet', () => {
    const character = apply(build());
    expect(character.class).toBe('Воин');
    expect(character.race).toBe('Человек');
    expect(character.attributes.strength).toBe(17);
    expect(character.attributes.constitution).toBe(15);
    expect(character.maxHP).toBe(12);
    expect(character.currentHP).toBe(12);
    expect(character.proficiencyBonus).toBe(2);
    expect(character.savingThrowProficiencies).toEqual(expect.arrayContaining(['strength', 'constitution']));
    expect(character.resources.find((r) => r.id === 'fighter.second-wind')?.max).toBe(2);
    expect(character.abilities.some((a) => a.name === 'Второе дыхание' && a.actionType === 'bonus')).toBe(true);
    expect(character.traits.find((t) => t.id === 'g-proficiencies')?.description).toContain('Тяжёлые доспехи');
  });

  it('asks for the picks of level 1 and records them', () => {
    let b = build();
    const plan = levelPlan(b, 1);
    const style = plan.choices.find((c) => c.key === 'class:fighter.fighting-style/style')!;
    expect(style).toBeDefined();
    const options = choiceOptions(b, 1, style);
    expect(options.some((o) => o.id === 'defense')).toBe(true);
    expect(options.every((o) => DND.feats.find((f) => f.id === o.id)?.category === 'fightingStyle')).toBe(true);

    b = setPicks(b, style.key, ['defense']);
    expect(unfinishedChoices(b, levelPlan(b, 1)).some((c) => c.key === style.key)).toBe(false);
    expect(collect(b).features.some((f) => f.feature.id === 'defense')).toBe(true);
  });

  it('builds a 5th-level Oath of Devotion paladin with slots, prepared spells and oath spells', () => {
    const character = apply(
      build({
        class: 'paladin',
        subclass: 'oath-of-devotion',
        level: 5,
        baseAttributes: { strength: 15, dexterity: 10, constitution: 14, intelligence: 8, wisdom: 10, charisma: 15 },
        backgroundBonuses: { strength: 1, charisma: 2 },
        hitPoints: [2, 3, 4, 5].map((level) => ({ level, method: 'average' as const, value: 6 })),
      }),
    );
    expect(character.resources.find((r) => r.id === 'slot-1')?.max).toBe(4);
    expect(character.resources.find((r) => r.id === 'slot-2')?.max).toBe(2);
    expect(character.resources.some((r) => r.id === 'slot-3')).toBe(false);
    expect(character.resources.find((r) => r.id === 'paladin.lay-on-hands')?.max).toBe(25);
    expect(character.resources.find((r) => r.id === 'paladin.channel-divinity')?.max).toBe(2);
    expect(character.maxPreparedSpells.total).toBe(6);
    const smite = character.spells.find((s) => s.id === 'spell-divine-smite');
    expect(smite?.alwaysPrepared && smite.prepared).toBe(true);
    expect(character.spells.find((s) => s.id === 'spell-aid')?.alwaysPrepared).toBe(true);
    expect(character.spells.some((s) => s.level === 3)).toBe(false);
    expect(character.spellcastingDifficultyValue).toBe(8 + 3 + 3);
    // d10 + 2 at level 1, then (6 + 2) four times.
    expect(character.maxHP).toBe(12 + 4 * 8);
  });

  it('keeps damage taken, spent uses and preparation through a level-up', () => {
    const b = build({ class: 'paladin', level: 1 });
    let character = apply(b);
    character = {
      ...character,
      currentHP: character.currentHP - 5,
      resources: character.resources.map((r) => (r.id === 'paladin.lay-on-hands' ? { ...r, current: 1 } : r)),
      spells: character.spells.map((s) => (s.id === 'spell-bless' ? { ...s, prepared: true } : s)),
    };
    const next = apply({ ...b, level: 2, hitPoints: [{ level: 2, method: 'roll', value: 7 }] }, character);
    expect(next.maxHP).toBe(character.maxHP + 7 + 2);
    expect(next.currentHP).toBe(next.maxHP - 5);
    expect(next.resources.find((r) => r.id === 'paladin.lay-on-hands')).toMatchObject({ max: 10, current: 6 });
    expect(next.spells.find((s) => s.id === 'spell-bless')?.prepared).toBe(true);
  });

  it('applies ability score improvements without passing 20', () => {
    const b = build({
      level: 4,
      choices: { 'class:fighter.asi-4/feat': ['ability-score-improvement'] },
    });
    const key = 'class:fighter.asi-4/feat:ability-score-improvement';
    const asiChoice = levelPlan(b, 4).choices.find((c) => c.key.startsWith(key))!;
    expect(asiChoice).toBeDefined();
    const character = apply(setPicks(b, asiChoice.key, ['strength', 'strength']));
    expect(character.attributes.strength).toBe(19);
    const capped = apply(setPicks({ ...b, baseAttributes: { ...b.baseAttributes, strength: 18 } }, asiChoice.key, ['strength', 'strength']));
    expect(capped.attributes.strength).toBe(20);
  });

  it('opens the subclass on level 3 and the subclass choices after it is chosen', () => {
    expect(levelPlan(build(), 3).needsSubclass).toBe(true);
    const plan = levelPlan(build({ subclass: 'battle-master' }), 3);
    expect(plan.needsSubclass).toBe(false);
    expect(plan.choices.some((c) => c.choice.options.from === 'maneuvers' && c.count === 3)).toBe(true);
  });

  it('offers an Eldritch Knight new wizard spells on the levels they come', () => {
    const b = build({ subclass: 'eldritch-knight', level: 3 });
    const plan = levelPlan(b, 3);
    const spells = plan.choices.find((c) => c.choice.id === 'spells')!;
    expect(spells.count).toBe(3);
    const options = choiceOptions(b, 3, spells);
    expect(options.length).toBeGreaterThan(10);
    expect(options.every((o) => o.meta?.startsWith('1 круг'))).toBe(true);
    expect(levelPlan(b, 4).choices.find((c) => c.choice.id === 'spells')?.count).toBe(1);
  });

  it('drops picks that depended on a replaced pick', () => {
    let b = setPicks(build(), 'class:fighter.fighting-style/style', ['defense']);
    b = setPicks(b, 'class:fighter.fighting-style/style:defense/x', ['y']);
    b = setPicks(b, 'class:fighter.fighting-style/style', ['archery']);
    expect(Object.keys(b.choices)).toEqual(['class:fighter.fighting-style/style']);
  });
});

describe('hero creation from presets', () => {
  it('fills the inventory and purse from the starting kits and sets the experience of the level', async () => {
    const { createDndHero, DND: content } = await import('../src');
    const paladin = content.classes.find((c) => c.id === 'paladin')!;
    const soldier = content.backgrounds.find((b) => b.id === 'soldier')!;
    const kitA = paladin.startingEquipment[0]!;
    const backgroundGold = soldier.equipment[0]!.gold;
    const draft = createDndHero({
      name: 'Тест',
      build: build({ class: 'paladin', level: 3, subclass: 'oath-of-vengeance' }),
      classKitId: kitA.id,
      backgroundKitId: soldier.equipment[0]!.id,
    });
    expect(draft.class).toBe('Паладин');
    expect(draft.subclass).toBe('Клятва мести');
    expect(draft.experience).toBe(900);
    expect(draft.currentHP).toBe(draft.maxHP);
    expect(draft.currency.gold).toBe(kitA.gold + backgroundGold);
    expect(draft.inventory.length).toBeGreaterThan(3);
    expect(draft.inventory.some((i) => i.type === 'weapon' && i.ref)).toBe(true);
    expect(draft.limbs.every((l) => l.maxHP > 0)).toBe(true);
  });
});

describe('armour class from features', () => {
  it('adds Defense while armoured only', async () => {
    const { createDndHero } = await import('../src');
    const base = build({ class: 'fighter', choices: { 'class:fighter.fighting-style/style': ['defense'] } });
    const armoured = createDndHero({ name: 'Т', build: base, classKitId: 'a', backgroundKitId: 'a' });
    const plain = createDndHero({ name: 'Т', build: { ...base, choices: {} }, classKitId: 'a', backgroundKitId: 'a' });
    expect(armoured.armorClass).toBe(plain.armorClass + 1);
    const unarmoured = createDndHero({ name: 'Т', build: base, classKitId: 'c', backgroundKitId: 'b' });
    // No armour: 10 + Dexterity (13 → +1), and Defense does not apply.
    expect(unarmoured.armorClass).toBe(11);
  });
});

describe('where an entry comes from', () => {
  it('names the species, the class level and the feat a grant comes from', async () => {
    const { describeGrant } = await import('../src');
    const b = build({ choices: { 'class:fighter.fighting-style/style': ['defense'] } });
    expect(describeGrant(b, 'class:fighter.second-wind')).toBe('Воин, 1 уровень');
    expect(describeGrant(b, 'background:savage-attacker')).toBe('Черта «Неистово атакующий» · Предыстория «Солдат»');
    expect(describeGrant(b, 'class:fighter.fighting-style/style:defense')).toBe('Черта «Оборона» · Воин, 1 уровень');
    expect(describeGrant(b, 'species:human.resourceful')).toBe('Вид «Человек»');
  });
});
