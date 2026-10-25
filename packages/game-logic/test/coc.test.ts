import { describe, expect, it } from 'vitest';
import { CharacterSchema, createCharacterDocument, type CocBuild } from '@itd/schema';
import { maxSanityOf, rulesOf } from '../src';
import {
  ARCHETYPES,
  OCCUPATIONS,
  TALENTS,
  WEAPONS,
  afterIntRoll,
  afterSkillRoll,
  ageRules,
  addItem,
  applyDamage,
  castSpell,
  changeItemCount,
  checkSkill,
  createInvestigator,
  damageBonusOf,
  derivedOf,
  developSkills,
  fireWeapon,
  formulaPoints,
  gainMythos,
  heal,
  loseSanity,
  moveRate,
  parseSpellCost,
  reloadWeapon,
  setCharacteristic,
  rollCharacteristics,
  rollPercentile,
  sanityLoss,
  skillDef,
  successLevel,
  takeDamage,
  wealthOf,
  weaponDamage,
  type Characteristics,
} from '../src/coc';

/** Plays back the given numbers in [0, 1) as the random source, then repeats the last. */
const sequence = (...values: number[]) => {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
};
/** A die face as the random source: rollDie(sides) gives `face`. */
const face = (value: number, sides: number) => (value - 1) / sides + 1e-9;

const harvey: Characteristics = { str: 45, con: 60, siz: 65, dex: 50, app: 55, int: 80, pow: 70, edu: 85 };
const build = (patch: Partial<CocBuild> = {}): CocBuild => ({
  ruleset: 'coc7',
  variant: 'classic',
  era: '1920s',
  occupation: 'professor',
  talents: [],
  age: 35,
  ...patch,
});

const investigator = (patch: Partial<CocBuild> = {}) =>
  createCharacterDocument(
    createInvestigator({
      name: 'Харви Уолтерс',
      build: build(patch),
      characteristics: harvey,
      luck: 55,
      skills: { 'library-use': 70, 'credit-rating': 30, 'cthulhu-mythos': 4 },
      occupationSkills: ['library-use'],
      weapons: ['revolver-38'],
    }),
  );

describe('Call of Cthulhu content', () => {
  const resolves = (id: string) => {
    const found = skillDef(id);
    return !!found && (!id.includes(':') || !!found.skill.specialities);
  };

  it('refers only to skills that exist', () => {
    for (const occupation of OCCUPATIONS)
      for (const choice of occupation.skills) {
        if ('skill' in choice) expect(resolves(choice.skill), `${occupation.id}: ${choice.skill}`).toBe(true);
        if ('from' in choice)
          for (const id of choice.from) expect(resolves(id), `${occupation.id}: ${id}`).toBe(true);
      }
    for (const archetype of ARCHETYPES)
      for (const id of archetype.skills) expect(resolves(id), `${archetype.id}: ${id}`).toBe(true);
    for (const weapon of WEAPONS) expect(resolves(weapon.skill), `${weapon.id}: ${weapon.skill}`).toBe(true);
  });

  it('suggests only talents and occupations that exist', () => {
    const talents = new Set(TALENTS.map((t) => t.id));
    const occupations = new Set(OCCUPATIONS.map((o) => o.id));
    for (const archetype of ARCHETYPES) {
      for (const id of archetype.suggestedTalents ?? [])
        expect(talents.has(id), `${archetype.id}: ${id}`).toBe(true);
      for (const id of archetype.occupations ?? [])
        expect(occupations.has(id), `${archetype.id}: ${id}`).toBe(true);
    }
  });

  it('has unique ids', () => {
    for (const list of [OCCUPATIONS, ARCHETYPES, TALENTS, WEAPONS]) {
      const ids = list.map((entry) => entry.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe('Call of Cthulhu creation', () => {
  it('rolls characteristics in steps of five within their ranges', () => {
    const c = rollCharacteristics(sequence(0));
    expect(c.str).toBe(15);
    expect(c.siz).toBe(40);
    const top = rollCharacteristics(sequence(0.9999));
    expect(top.str).toBe(90);
    expect(top.edu).toBe(90);
  });

  it('derives hit points, magic, sanity, damage bonus and move', () => {
    expect(derivedOf(harvey)).toMatchObject({
      maxHP: 12,
      maxMP: 14,
      startingSanity: 70,
      damageBonus: '0',
      build: 0,
      move: 7,
    });
    expect(derivedOf(harvey, 'pulp').maxHP).toBe(25);
    expect(damageBonusOf(64)).toEqual({ damageBonus: '-2', build: -2 });
    expect(damageBonusOf(165)).toEqual({ damageBonus: '+1d6', build: 2 });
    expect(damageBonusOf(300)).toEqual({ damageBonus: '+3d6', build: 4 });
    expect(moveRate({ ...harvey, str: 70, dex: 70 })).toBe(9);
    expect(moveRate({ ...harvey, str: 70, dex: 70 }, 62)).toBe(6);
  });

  it('ages an investigator by the table', () => {
    expect(ageRules(17)).toMatchObject({ youth: true, eduChecks: 0 });
    expect(ageRules(45)).toMatchObject({ eduChecks: 2, physicalLoss: 5, appLoss: 5, moveLoss: 1 });
    expect(ageRules(85)).toMatchObject({ physicalLoss: 80 });
  });

  it('counts occupation points, taking the better of a choice', () => {
    expect(formulaPoints([{ characteristic: 'edu', times: 4 }], harvey)).toBe(340);
    expect(
      formulaPoints(
        [
          { characteristic: 'edu', times: 2 },
          { characteristic: ['dex', 'str'], times: 2 },
        ],
        harvey,
      ),
    ).toBe(270);
  });

  it('writes a valid sheet with every standard skill, money and weapons', () => {
    const doc = investigator();
    expect(CharacterSchema.safeParse(doc).success).toBe(true);
    expect(doc.maxHP).toBe(12);
    expect(doc.sanity).toBe(70);
    const skill = (id: string) => doc.coc!.skills.find((s) => s.id === id);
    expect(skill('library-use')).toMatchObject({ value: 70, occupation: true });
    expect(skill('dodge')?.value).toBe(25);
    expect(skill('language-own')?.value).toBe(85);
    expect(skill('fighting:brawl')?.value).toBe(25);
    expect(skill('computer-use')).toBeUndefined();
    expect(doc.coc!.cash).toBe(60);
    expect(doc.attacks.map((a) => a.skill)).toEqual(['fighting:brawl', 'firearms:handgun']);
  });

  it('caps sanity at 99 less Cthulhu Mythos', () => {
    expect(maxSanityOf(investigator())).toBe(95);
  });
});

describe('Call of Cthulhu rolls', () => {
  it('grades a roll against the value', () => {
    expect(successLevel(1, 40)).toBe('critical');
    expect(successLevel(8, 40)).toBe('extreme');
    expect(successLevel(20, 40)).toBe('hard');
    expect(successLevel(40, 40)).toBe('regular');
    expect(successLevel(41, 40)).toBe('failure');
    expect(successLevel(96, 40)).toBe('fumble');
    expect(successLevel(96, 60)).toBe('failure');
    expect(successLevel(100, 99)).toBe('fumble');
  });

  it('keeps the lowest tens die with a bonus die and the highest with a penalty die', () => {
    // units 3, tens 70 and 20
    const random = () => sequence(face(4, 10), face(8, 10), face(3, 10));
    expect(rollPercentile(1, 0, random()).total).toBe(23);
    expect(rollPercentile(0, 1, random()).total).toBe(73);
    expect(rollPercentile(1, 1, random()).total).toBe(73);
  });

  it('reads 00 and 0 as 100', () => {
    expect(rollPercentile(0, 0, sequence(face(1, 10), face(1, 10))).total).toBe(100);
  });

  it('needs a hard success for a hard check', () => {
    const roll = checkSkill(60, { difficulty: 'hard' }, sequence(face(1, 10), face(5, 10))); // 40
    expect(roll.level).toBe('regular');
    expect(roll.success).toBe(false);
  });
});

describe('Call of Cthulhu sanity, wounds and development', () => {
  it('calls for an INT roll on a loss of five and indefinite insanity on a fifth of the day', () => {
    const doc = { ...investigator(), sanity: 70 };
    expect(sanityLoss(doc, 5)).toMatchObject({ sanity: 65, needsIntRoll: true, indefinite: false });
    expect(sanityLoss({ ...doc, sanity: 60 }, 4)).toMatchObject({ sanity: 56, indefinite: true });
    expect(sanityLoss({ ...doc, sanity: 3 }, 6)).toMatchObject({ sanity: 0, permanent: true });
  });

  it('turns half the hit points at once into a major wound, and 0 with it into dying', () => {
    const doc = investigator();
    expect(takeDamage(doc, 5)).toMatchObject({ currentHP: 7, majorWound: false });
    expect(takeDamage(doc, 6)).toMatchObject({ currentHP: 6, majorWound: true });
    expect(takeDamage({ ...doc, currentHP: 4 }, 6)).toMatchObject({ currentHP: 0, dying: true });
    expect(takeDamage({ ...doc, currentHP: 4 }, 4)).toMatchObject({
      currentHP: 0,
      unconscious: true,
      dying: false,
    });
    expect(takeDamage(doc, 13).dead).toBe(true);
  });

  it('raises ticked skills that roll over their value and clears every tick', () => {
    const doc = investigator();
    const ticked = {
      ...doc,
      coc: {
        ...doc.coc!,
        skills: doc.coc!.skills.map((s) =>
          s.id === 'library-use' || s.id === 'listen' ? { ...s, check: true } : s,
        ),
      },
    };
    // library-use 70: roll 90 → +1d10 (6); listen 20: roll 10 → nothing
    const { character, rolls } = developSkills(ticked, sequence(face(90, 100), face(6, 10), face(10, 100)));
    const skill = (id: string) => character.coc!.skills.find((s) => s.id === id)!;
    expect(skill('library-use')).toMatchObject({ value: 76, check: false });
    expect(skill('listen')).toMatchObject({ value: 20, check: false });
    expect(rolls).toHaveLength(2);
  });

  it('prices a life by Credit Rating and era', () => {
    expect(wealthOf(30, '1920s')).toMatchObject({ cash: 60, assets: 1500, spendingLevel: 10 });
    expect(wealthOf(30, 'modern').cash).toBe(1200);
  });
});

describe('Call of Cthulhu as a rules system', () => {
  it('rebuilds derived numbers and talents, keeping damage taken and own traits', () => {
    const doc = investigator({ variant: 'pulp', talents: ['tough-guy'] });
    const hurt = { ...doc, currentHP: doc.maxHP - 3, traits: [{ id: 'own', name: 'Своё', description: '' }] };
    const rebuilt = rulesOf(hurt.build!).rebuild(hurt, hurt.build!);
    expect(rebuilt.maxHP).toBe(25);
    expect(rebuilt.currentHP).toBe(22);
    expect(rebuilt.traits.map((t) => t.id)).toEqual(['talent-tough-guy', 'own']);
  });
});

describe('Call of Cthulhu mechanics on the sheet', () => {
  it('wounds: major wound, unconscious, dying and dead go onto the sheet; healing takes them off', () => {
    const doc = investigator();
    const wounded = applyDamage(6)(doc);
    expect(wounded).toMatchObject({ currentHP: 6, conditions: ['major-wound'] });
    const dying = applyDamage(6)(wounded);
    expect(dying.conditions).toEqual(['major-wound', 'dying']);
    const saved = heal(1)(dying);
    expect(saved).toMatchObject({ currentHP: 1, conditions: ['major-wound'] });
    expect(heal(99)(saved).conditions).toEqual([]);
    expect(applyDamage(13)(doc).conditions).toContain('dead');
  });

  it('sanity: the loss, indefinite and temporary insanity go onto the sheet', () => {
    const base = investigator();
    const doc = { ...base, sanity: 60, coc: { ...base.coc!, sanityAtDayStart: 60 } };
    const big = loseSanity(13);
    expect(big.outcome(doc)).toMatchObject({ needsIntRoll: true, indefinite: true });
    const after = afterIntRoll(true)(big.edit(doc));
    expect(after.sanity).toBe(47);
    expect(after.conditions).toEqual(['indefinite-insanity', 'temporary-insanity']);
    expect(afterIntRoll(false)(loseSanity(5).edit(doc)).conditions).toEqual([]);
  });

  it('Mythos lowers the sanity cap, and sanity with it', () => {
    const doc = { ...investigator(), sanity: 94 };
    const after = gainMythos(10)(doc);
    expect(after.coc!.skills.find((s) => s.id === 'cthulhu-mythos')?.value).toBe(14);
    expect(after.sanity).toBe(85);
  });

  it('ticks a skill after a success, but never Credit Rating', () => {
    const doc = investigator();
    const tick = (id: string) =>
      afterSkillRoll(id, { success: true })(doc).coc!.skills.find((s) => s.id === id)?.check;
    expect(tick('library-use')).toBe(true);
    expect(tick('credit-rating')).toBe(false);
    expect(afterSkillRoll('listen', { success: false })(doc)).toBe(doc);
  });

  it('a new CON or SIZ changes the hit points, keeping the damage', () => {
    const doc = { ...investigator(), currentHP: 10 };
    const after = setCharacteristic('con', 80)(doc);
    expect(after).toMatchObject({ maxHP: 14, currentHP: 12 });
  });

  it('guns spend rounds and reload', () => {
    const doc = investigator();
    const revolver = doc.attacks.find((a) => a.skill === 'firearms:handgun')!;
    const fired = fireWeapon(revolver.id, 2)(doc);
    expect(fired.attacks.find((a) => a.id === revolver.id)?.ammo).toBe((revolver.magazine ?? 0) - 2);
    expect(reloadWeapon(revolver.id)(fired).attacks.find((a) => a.id === revolver.id)?.ammo).toBe(
      revolver.magazine,
    );
  });

  it('an extreme hit deals the maximum, and an impaling one rolls the weapon again on top', () => {
    const low = () => 0;
    expect(weaponDamage({ damage: '1d10' }, '0', 'regular', low).total).toBe(1);
    expect(weaponDamage({ damage: '1d10' }, '0', 'extreme', low).total).toBe(10);
    expect(weaponDamage({ damage: '1d10', impale: true }, '0', 'extreme', low).total).toBe(11);
    expect(weaponDamage({ damage: '1d3+DB' }, '+1d4', 'extreme', low)).toEqual({
      total: 7,
      formula: '1d3+1d4',
    });
    expect(weaponDamage({ damage: '1d3+DB' }, '-1', 'regular', low).total).toBe(0);
    expect(weaponDamage({ damage: '4d6/2d6/1d6' }, '0', 'regular', low).total).toBe(4);
  });
});

describe('Call of Cthulhu spells and gear', () => {
  it('reads a spell cost', () => {
    expect(parseSpellCost('10 ПМ; 1 МОЩ; 1d10 рассудка')).toEqual({
      mp: 10,
      variable: false,
      sanity: '1d10',
      pow: 1,
    });
    expect(parseSpellCost('переменная (ПМ); 5 рассудка')).toMatchObject({
      mp: 0,
      variable: true,
      sanity: '5',
    });
    expect(parseSpellCost('1+ ПМ; 1d2 рассудка')).toMatchObject({ mp: 1, variable: true });
  });

  it('casting spends magic, sanity and POW; missing magic comes out of hit points', () => {
    const doc = { ...investigator(), sanity: 60 };
    const cast = castSpell(doc, '10 ПМ; 1 МОЩ; 1d10 рассудка', undefined, () => 0);
    const after = cast.edit(doc);
    expect(after.coc!.magicPoints).toBe(4);
    expect(after.sanity).toBe(59);
    expect(after.coc!.characteristics.pow).toBe(69);
    const broke = castSpell({ ...after }, '8 ПМ', undefined, () => 0);
    expect(broke.shortfall).toBe(4);
    expect(broke.edit(after)).toMatchObject({ currentHP: 8 });
  });

  it('keeps count of things carried', () => {
    const doc = addItem('Фонарь', 1)(investigator());
    const item = doc.inventory.at(-1)!;
    expect(changeItemCount(item.id, 2)(doc).inventory.at(-1)?.quantity).toBe(3);
  });
});
