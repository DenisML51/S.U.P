import { describe, expect, it } from 'vitest';
import type { DndBuild, Character } from '@itd/schema';
import { startingSkills } from '../src';
import { DND, applyBuild, choiceOptions, levelPlan, setPicks } from '../src/dnd';
import { makeCharacter, singleClass, type SingleClassBuild, atLevel } from './helpers';

const build = (patch: Partial<SingleClassBuild> = {}): DndBuild => singleClass({
  ruleset: 'dnd2024',
  species: 'human',
  background: 'acolyte',
  class: 'cleric',
  abilityMethod: 'pointBuy',
  // Wisdom 15 + 2 = 17 (+3), Constitution 14 (+2).
  baseAttributes: { strength: 12, dexterity: 10, constitution: 14, intelligence: 8, wisdom: 15, charisma: 13 },
  backgroundBonuses: { wisdom: 2, charisma: 1 },
  choices: {},
  hitPoints: [],
  level: 1,
  ...patch,
});

const fresh = (): Character => makeCharacter({ skills: startingSkills(), maxHP: 10, currentHP: 10 });
const run = (b: DndBuild) => applyBuild(fresh(), b);
const apply = (b: DndBuild) => run(b).character;
const resource = (c: Character, id: string) => c.resources.find((r) => r.id === id);
const ability = (c: Character, name: string) => c.abilities.find((a) => a.name === name);

const ORDER = 'class:cleric.divine-order/order';

describe('cleric', () => {
  it('writes a level-1 cleric onto the sheet', () => {
    const c = apply(build());
    expect(c.class).toBe('Жрец');
    expect(c.maxHP).toBe(8 + 2);
    expect(c.savingThrowProficiencies).toEqual(expect.arrayContaining(['wisdom', 'charisma']));
    const proficiencies = c.traits.find((t) => t.id === 'g-proficiencies')?.description ?? '';
    expect(proficiencies).toContain('Средние доспехи');
    expect(proficiencies).toContain('Щиты');
    expect(proficiencies).not.toContain('Тяжёлые доспехи');
    expect(c.maxPreparedSpells.total).toBe(4);
    expect(resource(c, 'slot-1')?.max).toBe(2);
    expect(c.spellcastingDifficultyValue).toBe(8 + 2 + 3);
    expect(c.spells.some((s) => s.id === 'spell-bless')).toBe(true);
    expect(c.spells.some((s) => s.level === 2)).toBe(false);
    expect(resource(c, 'cleric.channel-divinity')).toBeUndefined();
  });

  it('asks for three cantrips and the Divine Order on level 1', () => {
    const plan = levelPlan(atLevel(build(), 1), 1);
    expect(plan.choices.find((c) => c.key.startsWith('casting:') && c.choice.id === 'cantrips')?.count).toBe(3);
    expect(plan.choices.some((c) => c.key === ORDER)).toBe(true);
    expect(levelPlan(atLevel(build(), 4), 4).choices.find((c) => c.key.startsWith('casting:') && c.choice.id === 'cantrips')?.count).toBe(1);
    expect(levelPlan(atLevel(build(), 10), 10).choices.find((c) => c.key.startsWith('casting:') && c.choice.id === 'cantrips')?.count).toBe(1);
    expect(levelPlan(atLevel(build(), 5), 5).choices.some((c) => c.key.startsWith('casting:') && c.choice.id === 'cantrips')).toBe(false);
  });

  it('gives the Protector heavy armour and martial weapons', () => {
    const c = apply(setPicks(build(), ORDER, ['protector']));
    const proficiencies = c.traits.find((t) => t.id === 'g-proficiencies')?.description ?? '';
    expect(proficiencies).toContain('Тяжёлые доспехи');
    expect(proficiencies).toContain('Воинское оружие');
  });

  it('gives the Thaumaturge a cantrip from the shared pool and a Wisdom bonus to Arcana and Religion', () => {
    let b = build({ choices: { 'casting:cleric.spells-1/cantrips': ['guidance', 'sacred-flame', 'thaumaturgy'] } });
    b = setPicks(b, ORDER, ['thaumaturge']);
    const extra = levelPlan(atLevel(b, 1), 1).choices.find((c) => c.key === `${ORDER}=thaumaturge:cleric.thaumaturge/cantrip`)!;
    expect(extra).toBeDefined();
    const options = choiceOptions(atLevel(b, 1), 1, extra);
    expect(options.find((o) => o.id === 'guidance')?.disabled).toBeTruthy();
    expect(options.every((o) => o.meta?.startsWith('Заговор'))).toBe(true);
    const c = apply(setPicks(b, extra.key, ['light']));
    expect(c.skills.find((s) => s.id === 'arcana')?.bonus).toBe(3);
    expect(c.skills.find((s) => s.id === 'religion')?.bonus).toBe(3);
    expect(c.spells.find((s) => s.id === 'spell-light')?.alwaysPrepared).toBe(true);
  });

  it('offers to replace a cantrip on later levels', () => {
    const b = build({ level: 2, choices: { 'casting:cleric.spells-1/cantrips': ['guidance', 'sacred-flame', 'thaumaturgy'] } });
    const swap = levelPlan(atLevel(b, 2), 2).choices.find((c) => c.key === 'swap:cleric.known-cantrips@2/forget');
    expect(swap).toBeDefined();
  });

  it('grows Channel Divinity, Divine Spark and Sear Undead with level', () => {
    const at = (level: number) => apply(build({ level }));
    expect(resource(at(2), 'cleric.channel-divinity')).toMatchObject({ max: 2, recovery: 'short', recoveryAmount: 1 });
    expect(resource(at(6), 'cleric.channel-divinity')?.max).toBe(3);
    expect(resource(at(18), 'cleric.channel-divinity')?.max).toBe(4);
    expect(ability(at(2), 'Божественная искра')).toMatchObject({ damage: '1d8+3', saveAttribute: 'constitution', saveDC: 13, resourceId: 'cleric.channel-divinity' });
    expect(ability(at(7), 'Божественная искра')?.damage).toBe('2d8+3');
    expect(ability(at(13), 'Божественная искра')?.damage).toBe('3d8+3');
    expect(ability(at(18), 'Божественная искра')?.damage).toBe('4d8+3');
    expect(ability(at(2), 'Изгнание нежити')).toMatchObject({ saveAttribute: 'wisdom', saveDC: 13 });
    expect(ability(at(9), 'Изгнание нежити')?.saveDC).toBe(8 + 4 + 3);
    expect(ability(at(5), 'Испепеление нежити')?.damage).toBe('3d8');
    expect(resource(at(10), 'cleric.divine-intervention')).toMatchObject({ max: 1, recovery: 'long' });
    expect(at(20).traits.some((t) => t.name === 'Великое божественное вмешательство')).toBe(true);
  });

  it('improves the chosen Blessed Strikes on level 14', () => {
    const key = 'class:cleric.blessed-strikes/strikes';
    const strike = (level: number) => ability(apply(setPicks(build({ level }), key, ['divine-strike'])), 'Божественный удар');
    expect(strike(7)?.damage).toBe('1d8');
    expect(strike(14)?.damage).toBe('2d8');
    const potent = (level: number) => apply(setPicks(build({ level }), key, ['potent-spellcasting']));
    expect(potent(7).abilities.some((a) => a.name === 'Могущественные заклинания')).toBe(true);
    expect(potent(13).abilities.some((a) => a.id.startsWith('g-cleric.improved-potent-spellcasting'))).toBe(false);
    expect(potent(14).abilities.some((a) => a.id.startsWith('g-cleric.improved-potent-spellcasting'))).toBe(true);
    expect(levelPlan(atLevel(setPicks(build(), key, ['divine-strike']), 14), 14).features.some((f) => f.feature.id === 'cleric.improved-divine-strike')).toBe(true);
  });

  it('has full-caster slots and the prepared count of the table', () => {
    const c5 = apply(build({ level: 5 }));
    expect(resource(c5, 'slot-3')?.max).toBe(2);
    expect(c5.maxPreparedSpells.total).toBe(9);
    const c20 = apply(build({ level: 20 }));
    expect(resource(c20, 'slot-9')?.max).toBe(1);
    expect(resource(c20, 'slot-7')?.max).toBe(2);
    expect(c20.maxPreparedSpells.total).toBe(22);
  });

  it('builds every domain at level 20 with nothing missing but spells still being written', () => {
    const cleric = DND.classes.find((c) => c.id === 'cleric')!;
    expect(cleric.subclasses.filter((s) => !s.source).map((s) => s.id)).toEqual(['life-domain', 'light-domain', 'trickery-domain', 'war-domain']);
    for (const subclass of cleric.subclasses) {
      const { character, missing } = run(build({ level: 20, subclass: subclass.id }));
      expect(character.subclass).toBe(subclass.name);
      expect(missing.filter((m) => !m.startsWith('spell:'))).toEqual([]);
      for (const spell of Object.values(subclass.alwaysPrepared ?? {}).flat()) {
        const entry = character.spells.find((s) => s.id === `spell-${spell}`);
        if (entry) expect(entry.alwaysPrepared).toBe(true);
        else expect(missing).toContain(`spell:${spell}`);
      }
    }
  });

  it('gives domain spells by class level', () => {
    const life3 = apply(build({ level: 3, subclass: 'life-domain' }));
    expect(life3.spells.find((s) => s.id === 'spell-aid')?.alwaysPrepared).toBe(true);
    expect(life3.spells.some((s) => s.id === 'spell-revivify')).toBe(false);
    const life5 = apply(build({ level: 5, subclass: 'life-domain' }));
    expect(life5.spells.find((s) => s.id === 'spell-revivify')?.alwaysPrepared).toBe(true);
  });

  it('writes the domain features with their numbers', () => {
    const life = apply(build({ level: 3, subclass: 'life-domain' }));
    expect(ability(life, 'Сохранение жизни')).toMatchObject({ damage: '15', damageType: 'Лечение', resourceId: 'cleric.channel-divinity' });

    const light3 = apply(build({ level: 3, subclass: 'light-domain' }));
    expect(ability(light3, 'Сияние рассвета')).toMatchObject({ damage: '2d10+3', saveAttribute: 'constitution', saveDC: 13 });
    expect(resource(light3, 'light.warding-flare')).toMatchObject({ max: 3, recovery: 'long' });
    expect(resource(apply(build({ level: 6, subclass: 'light-domain' })), 'light.warding-flare')?.recovery).toBe('short');
    expect(resource(apply(build({ level: 17, subclass: 'light-domain' })), 'light.corona-of-light')?.max).toBe(3);

    const war = apply(build({ level: 3, subclass: 'war-domain' }));
    expect(resource(war, 'war.war-priest')).toMatchObject({ max: 3, recovery: 'short' });
    expect(ability(war, 'Направленный удар')?.actionType).toBe('reaction');
    const war17 = apply(build({ level: 17, subclass: 'war-domain' }));
    expect(war17.resistances.map((r) => r.type)).toEqual(expect.arrayContaining(['Дробящий', 'Колющий', 'Рубящий']));

    const trickery = apply(build({ level: 3, subclass: 'trickery-domain' }));
    expect(ability(trickery, 'Двуличность')).toMatchObject({ actionType: 'bonus', resourceId: 'cleric.channel-divinity' });
  });

  it('starts with the PHB kit', () => {
    const cleric = DND.classes.find((c) => c.id === 'cleric')!;
    expect(cleric.startingEquipment.map((k) => k.gold)).toEqual([7, 110]);
    expect(cleric.startingEquipment[0]!.items.map((i) => i.ref)).toEqual(['chain-shirt', 'shield', 'mace', 'holy-symbol', 'priests-pack']);
  });
});
