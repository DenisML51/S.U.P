import { describe, expect, it } from 'vitest';
import type { Build, Character } from '@itd/schema';
import { DND, applyBuild, choiceOptions, levelPlan, setPicks, startingSkills } from '../src';
import { makeCharacter } from './helpers';

const fresh = (): Character => makeCharacter({ skills: startingSkills(), maxHP: 10, currentHP: 10 });
const resource = (c: Character, id: string) => c.resources.find((r) => r.id === id);
const ability = (c: Character, name: string) => c.abilities.find((a) => a.name === name);

const bard = (patch: Partial<Build> = {}): Build => ({
  ruleset: 'dnd2024',
  species: 'human',
  background: 'entertainer',
  class: 'bard',
  abilityMethod: 'pointBuy',
  // Charisma 15 + 2 = 17 (+3).
  baseAttributes: { strength: 8, dexterity: 14, constitution: 14, intelligence: 10, wisdom: 10, charisma: 15 },
  backgroundBonuses: { charisma: 2, dexterity: 1 },
  choices: {},
  hitPoints: [],
  level: 1,
  ...patch,
});

const cleric = (patch: Partial<Build> = {}): Build => ({
  ruleset: 'dnd2024',
  species: 'human',
  background: 'acolyte',
  class: 'cleric',
  abilityMethod: 'pointBuy',
  // Wisdom 15 + 2 = 17 (+3).
  baseAttributes: { strength: 12, dexterity: 10, constitution: 14, intelligence: 8, wisdom: 15, charisma: 13 },
  backgroundBonuses: { wisdom: 2, charisma: 1 },
  choices: {},
  hitPoints: [],
  level: 1,
  ...patch,
});

const NEW = [
  { cls: 'bard', id: 'college-of-the-moon', source: 'Forgotten Realms: Heroes of Faerûn', make: bard },
  { cls: 'bard', id: 'college-of-the-spirits', source: 'Ravenloft: The Horrors Within', make: bard },
  { cls: 'cleric', id: 'knowledge-domain', source: 'Forgotten Realms: Heroes of Faerûn', make: cleric },
  { cls: 'cleric', id: 'grave-domain', source: 'Ravenloft: The Horrors Within', make: cleric },
  { cls: 'cleric', id: 'arcana-domain', source: 'Arcana Unleashed', make: cleric },
] as const;

describe('supplement subclasses of the bard and the cleric', () => {
  it('appends them after the PHB ones with their books', () => {
    const ids = (cls: string) => DND.classes.find((c) => c.id === cls)!.subclasses.map((s) => s.id);
    expect(ids('bard')).toEqual(['college-of-dance', 'college-of-glamour', 'college-of-lore', 'college-of-valor', 'college-of-the-moon', 'college-of-the-spirits']);
    expect(ids('cleric')).toEqual(['life-domain', 'light-domain', 'trickery-domain', 'war-domain', 'knowledge-domain', 'grave-domain', 'arcana-domain']);
    for (const { cls, id, source } of NEW) {
      expect(DND.classes.find((c) => c.id === cls)!.subclasses.find((s) => s.id === id)?.source).toBe(source);
    }
  });

  it('applies each at level 3 and 20 with nothing missing', () => {
    for (const { cls, id, make } of NEW) {
      const subclass = DND.classes.find((c) => c.id === cls)!.subclasses.find((s) => s.id === id)!;
      for (const level of [3, 20]) {
        const { character, missing } = applyBuild(fresh(), make({ level, subclass: id }));
        expect(character.subclass).toBe(subclass.name);
        expect(missing).toEqual([]);
      }
      const c20 = applyBuild(fresh(), make({ level: 20, subclass: id })).character;
      for (const spell of Object.values(subclass.alwaysPrepared ?? {}).flat()) {
        expect(c20.spells.find((s) => s.id === `spell-${spell}`)?.alwaysPrepared).toBe(true);
      }
    }
  });

  // ----------------------------------------------------------------------------------------------
  // Bard
  // ----------------------------------------------------------------------------------------------

  it('College of the Moon: inspiration, primal lore and moonbeam', () => {
    const b3 = bard({ level: 3, subclass: 'college-of-the-moon' });
    const c3 = applyBuild(fresh(), b3).character;
    expect(ability(c3, 'Вдохновение луны: лунная живучесть')).toMatchObject({ damage: '1d6', resourceId: 'bard.bardic-inspiration' });
    expect(c3.traits.find((t) => t.id === 'g-proficiencies')?.description).toContain('Друидический');
    expect(c3.spells.some((s) => s.id === 'spell-moonbeam')).toBe(false);

    const plan = levelPlan(b3, 3);
    const cantrip = plan.choices.find((c) => c.key.endsWith('moon.primal-lore/cantrip'))!;
    expect(cantrip.count).toBe(1);
    const options = choiceOptions(b3, 3, cantrip).map((o) => o.id);
    expect(options).toContain('druidcraft');
    expect(options.every((id) => DND.spells.find((s) => s.id === id)?.level === 0)).toBe(true);
    const skill = plan.choices.find((c) => c.key.endsWith('moon.primal-lore/skill'))!;
    expect(choiceOptions(b3, 3, skill).map((o) => o.id).sort()).toEqual(['animalHandling', 'insight', 'medicine', 'nature', 'perception', 'survival']);

    const picked = setPicks(b3, cantrip.key, ['druidcraft']);
    expect(applyBuild(fresh(), picked).character.spells.find((s) => s.id === 'spell-druidcraft')?.alwaysPrepared).toBe(true);
    // The druid cantrip may be replaced on a later bard level.
    expect(levelPlan({ ...picked, level: 4 }, 4).choices.some((c) => c.key.includes('moon-cantrip@4'))).toBe(true);

    const c6 = applyBuild(fresh(), bard({ level: 6, subclass: 'college-of-the-moon' })).character;
    expect(c6.spells.find((s) => s.id === 'spell-moonbeam')?.alwaysPrepared).toBe(true);
    expect(resource(c6, 'moon.blessing-of-moonlight')).toMatchObject({ max: 1, recovery: 'long' });
    expect(ability(c6, 'Благословение лунного света')).toMatchObject({ damage: '2d4', damageType: 'Лечение' });

    const c14 = applyBuild(fresh(), bard({ level: 14, subclass: 'college-of-the-moon' })).character;
    expect(ability(c14, 'Вечернее великолепие')).toBeDefined();
    expect(ability(c14, 'Вдохновение луны: лунная живучесть')?.damage).toBe('1d10');
  });

  it('College of the Spirits: guidance, spirits and spirit guardians', () => {
    const c3 = applyBuild(fresh(), bard({ level: 3, subclass: 'college-of-the-spirits' })).character;
    expect(c3.spells.find((s) => s.id === 'spell-guidance')?.alwaysPrepared).toBe(true);
    expect(ability(c3, 'Замогильные духи')).toMatchObject({ actionType: 'bonus', damage: '1d6', resourceId: 'bard.bardic-inspiration' });
    expect(ability(c3, 'Выпустить духа')).toMatchObject({ actionType: 'action', saveDC: 8 + 2 + 3 });
    const proficiencies = c3.traits.find((t) => t.id === 'g-proficiencies')?.description ?? '';
    expect(proficiencies).toContain('Игральные карты');

    const c6 = applyBuild(fresh(), bard({ level: 6, subclass: 'college-of-the-spirits' })).character;
    expect(c6.spells.find((s) => s.id === 'spell-spirit-guardians')?.alwaysPrepared).toBe(true);
    expect(resource(c6, 'spirits.spirit-manifestation')).toMatchObject({ max: 1, recovery: 'long' });
    expect(ability(c6, 'Улучшенный призыв: силы с того света')?.damage).toBe('1d6');

    const c14 = applyBuild(fresh(), bard({ level: 14, subclass: 'college-of-the-spirits' })).character;
    expect(ability(c14, 'Мистическая связь')).toBeDefined();
    expect(ability(c14, 'Выпустить духа')?.saveDC).toBe(8 + 5 + 3);
  });

  // ----------------------------------------------------------------------------------------------
  // Cleric
  // ----------------------------------------------------------------------------------------------

  it('Knowledge Domain: expertise, mind magic, Intelligence saves and foresight', () => {
    const b3 = cleric({ level: 3, subclass: 'knowledge-domain' });
    const plan = levelPlan(b3, 3);
    const skills = plan.choices.find((c) => c.key.endsWith('knowledge.blessings-of-knowledge/skills'))!;
    expect(skills.count).toBe(2);
    expect(choiceOptions(b3, 3, skills).map((o) => o.id).sort()).toEqual(['arcana', 'history', 'nature', 'religion']);
    expect(plan.choices.some((c) => c.key.endsWith('knowledge.blessings-of-knowledge/tool'))).toBe(true);

    const c3 = applyBuild(fresh(), setPicks(b3, skills.key, ['arcana', 'history'])).character;
    expect(c3.skills.find((s) => s.id === 'arcana')).toMatchObject({ proficient: true, expertise: true });
    expect(c3.skills.find((s) => s.id === 'history')).toMatchObject({ proficient: true, expertise: true });
    expect(ability(c3, 'Магия разума')).toMatchObject({ actionType: 'action', resourceId: 'cleric.channel-divinity' });
    expect(c3.spells.find((s) => s.id === 'spell-mind-spike')?.alwaysPrepared).toBe(true);
    expect(c3.spells.some((s) => s.id === 'spell-tongues')).toBe(false);

    const c6 = applyBuild(fresh(), cleric({ level: 6, subclass: 'knowledge-domain' })).character;
    expect(c6.savingThrowProficiencies).toContain('intelligence');

    const c17 = applyBuild(fresh(), cleric({ level: 17, subclass: 'knowledge-domain' })).character;
    expect(ability(c17, 'Божественное предзнание')?.actionType).toBe('bonus');
    expect(resource(c17, 'knowledge.divine-foresight')).toMatchObject({ max: 1, recovery: 'long' });
  });

  it('Grave Domain: path to the grave, sentinel and keeper of souls', () => {
    const c3 = applyBuild(fresh(), cleric({ level: 3, subclass: 'grave-domain' })).character;
    expect(ability(c3, 'Круговорот жизни и смерти')).toMatchObject({ damage: '1d4', damageType: 'Некротический' });
    expect(ability(c3, 'Путь к могиле')).toMatchObject({ actionType: 'bonus', damage: '3', resourceId: 'cleric.channel-divinity' });
    expect(c3.spells.find((s) => s.id === 'spell-spare-the-dying')?.alwaysPrepared).toBe(true);

    const c6 = applyBuild(fresh(), cleric({ level: 6, subclass: 'grave-domain' })).character;
    expect(resource(c6, 'grave.sentinel-at-deaths-door')).toMatchObject({ max: 3, recovery: 'long' });
    expect(ability(c6, 'Страж на пороге смерти')?.actionType).toBe('reaction');

    const c11 = applyBuild(fresh(), cleric({ level: 11, subclass: 'grave-domain' })).character;
    expect(ability(c11, 'Круговорот жизни и смерти')?.damage).toBe('1d6');

    const c17 = applyBuild(fresh(), cleric({ level: 17, subclass: 'grave-domain' })).character;
    expect(ability(c17, 'Хранитель душ')).toMatchObject({ damage: '34', damageType: 'Лечение' });
    expect(resource(c17, 'grave.keeper-of-souls')).toMatchObject({ max: 1, recovery: 'short' });
    expect(ability(c17, 'Усовершенствованная некромантия')?.resourceId).toBe('cleric.channel-divinity');
  });

  it('Arcana Domain: modify magic, wizard cantrips, dispelling recovery and arcane mastery', () => {
    const b3 = cleric({ level: 3, subclass: 'arcana-domain' });
    const c3 = applyBuild(fresh(), b3).character;
    expect(ability(c3, 'Изменение магии: укрепляющее заклинание')).toMatchObject({ damage: '2d8+3', resourceId: 'cleric.channel-divinity' });
    expect(ability(c3, 'Изменение магии: упорное заклинание')).toMatchObject({ damage: '1d6', resourceId: 'cleric.channel-divinity' });

    const plan = levelPlan(b3, 3);
    const cantrips = plan.choices.find((c) => c.key.endsWith('arcana.arcane-initiate/cantrips'))!;
    expect(cantrips.count).toBe(2);
    expect(choiceOptions(b3, 3, cantrips).map((o) => o.id)).toContain('fire-bolt');
    const skill = plan.choices.find((c) => c.key.endsWith('arcana.arcane-initiate/skill'))!;
    expect(choiceOptions(b3, 3, skill).map((o) => o.id)).toContain('arcana');

    const picked = setPicks(b3, cantrips.key, ['fire-bolt', 'mage-hand']);
    const withCantrips = applyBuild(fresh(), picked).character;
    expect(withCantrips.spells.find((s) => s.id === 'spell-fire-bolt')?.alwaysPrepared).toBe(true);
    expect(levelPlan({ ...picked, level: 4 }, 4).choices.some((c) => c.key.includes('arcana-cantrips@4'))).toBe(true);

    const c6 = applyBuild(fresh(), cleric({ level: 6, subclass: 'arcana-domain' })).character;
    expect(resource(c6, 'arcana.dispelling-recovery')).toMatchObject({ max: 1, recovery: 'short' });

    const b17 = cleric({ level: 17, subclass: 'arcana-domain' });
    const plan17 = levelPlan(b17, 17);
    for (const circle of [6, 7, 8, 9]) {
      const choice = plan17.choices.find((c) => c.key.endsWith(`arcana.arcane-mastery/spell-${circle}`))!;
      const ids = choiceOptions(b17, 17, choice).map((o) => o.id);
      expect(ids.length).toBeGreaterThan(0);
      expect(ids.every((id) => DND.spells.find((s) => s.id === id)?.level === circle)).toBe(true);
    }
    const nine = plan17.choices.find((c) => c.key.endsWith('arcana.arcane-mastery/spell-9'))!;
    const wished = applyBuild(fresh(), setPicks(b17, nine.key, ['wish'])).character;
    expect(wished.spells.find((s) => s.id === 'spell-wish')?.alwaysPrepared).toBe(true);
  });
});
