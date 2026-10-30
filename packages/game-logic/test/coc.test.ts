import { describe, expect, it } from 'vitest';
import { CharacterSchema, createCharacterDocument, type CocBuild } from '@itd/schema';
import { maxSanityOf, rulesOf } from '../src';
import { makeCharacter } from './helpers';
import {
  ARCHETYPES,
  OCCUPATIONS,
  TALENTS,
  WEAPONS,
  absorbArmor,
  addMadness,
  applyDevelopment,
  applyHitDamage,
  applyWeeklyRecovery,
  firearmModifiers,
  firearmRangeOf,
  recoverLuck,
  rollLuckRecovery,
  weeklyRecovery,
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
  eduImprovement,
  rollCharacteristics,
  rollCharacteristicsDetailed,
  rollLuckDetailed,
  rollPercentile,
  sanityCheck,
  sanityLoss,
  skillDef,
  successLevel,
  takeDamage,
  wealthOf,
  weaponDamage,
  weaponDamageDetailed,
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
  it('keeps an occupation skill on the sheet with no points on it, at its base', () => {
    const draft = createInvestigator({
      name: 'Маргарет',
      build: build({ occupation: 'antiquarian' }),
      characteristics: harvey,
      luck: 55,
      skills: { appraise: 45 },
      occupationSkills: ['appraise', 'art-craft:forgery'],
    });
    expect(draft.coc!.skills.find((s) => s.id === 'art-craft:forgery')).toMatchObject({ value: 5, occupation: true });
  });

  it('rolls characteristics in steps of five within their ranges', () => {
    const c = rollCharacteristics(sequence(0));
    expect(c.str).toBe(15);
    expect(c.siz).toBe(40);
    const top = rollCharacteristics(sequence(0.9999));
    expect(top.str).toBe(90);
    expect(top.edu).toBe(90);
  });

  it('shows the dice behind a roll, the same throw as the plain roll', () => {
    const detailed = rollCharacteristicsDetailed(sequence(0.5));
    expect(detailed.values).toEqual(rollCharacteristics(sequence(0.5)));
    expect(detailed.dice.str).toEqual([4, 4, 4]);
    expect(detailed.dice.edu).toEqual([4, 4]);
    expect(detailed.values.edu).toBe((4 + 4 + 6) * 5);
    expect(rollLuckDetailed('pulp', sequence(0))).toEqual({ value: 40, dice: [1, 1] });
    expect(eduImprovement(50, sequence(0.9999))).toEqual({ roll: 100, gain: 10, die: 10 });
    expect(eduImprovement(95, sequence(0.9999))).toEqual({ roll: 100, gain: 4, die: 10 });
    expect(eduImprovement(50, sequence(0))).toEqual({ roll: 1, gain: 0 });
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

  it('keeps the dice of a sanity loss with the loss they make', () => {
    const doc = { ...investigator(), sanity: 70 };
    const failed = sanityCheck(doc, '0/1d6', () => 0.9);
    expect(failed.check.success).toBe(false);
    expect(failed.lossDice).toEqual([{ sides: 6, value: 6 }]);
    expect(failed.loss).toBe(6);
    expect(sanityCheck(doc, '0/1d6', () => 0.15).lossDice).toEqual([]);
  });

  it('turns half the hit points at once into a major wound, and 0 with it into dying', () => {
    const doc = investigator();
    expect(takeDamage(doc, 5)).toMatchObject({ currentHP: 7, majorWound: false });
    expect(takeDamage(doc, 6)).toMatchObject({ currentHP: 6, majorWound: true });
    expect(takeDamage({ ...doc, currentHP: 4 }, 6)).toMatchObject({ currentHP: 0, dying: true, unconscious: true });
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
    expect(dying.conditions).toEqual(['major-wound', 'dying', 'unconscious']);
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
    // The Russian sheet writes the damage bonus "БУ".
    expect(weaponDamage({ damage: '1d4+2+БУ' }, '+1d6', 'extreme', low).total).toBe(12);
    expect(weaponDamage({ damage: '1d4+½БУ' }, '+1d6', 'extreme', low).total).toBe(7);
  });

  it('shows the dice behind a hit, the same throw as the plain damage', () => {
    const low = () => 0;
    expect(weaponDamageDetailed({ damage: '1d3+DB' }, '+1d4', 'regular', low)).toEqual({
      total: 2,
      formula: '1d3+1d4',
      dice: [
        { sides: 3, value: 1, source: 'weapon' },
        { sides: 4, value: 1, source: 'bonus' },
      ],
    });
    const impaled = weaponDamageDetailed({ damage: '1d10', impale: true }, '0', 'extreme', low);
    expect(impaled.total).toBe(weaponDamage({ damage: '1d10', impale: true }, '0', 'extreme', low).total);
    expect(impaled.dice).toEqual([
      { sides: 10, value: 10, source: 'weapon' },
      { sides: 10, value: 1, source: 'impale' },
    ]);
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
    const add = addItem({ id: 'item-lamp', name: 'Фонарь', quantity: 1 });
    const doc = add(investigator());
    const item = doc.inventory.at(-1)!;
    expect(item.id).toBe('item-lamp');
    expect(add(doc)).toBe(doc);
    expect(changeItemCount(item.id, 2)(doc).inventory.at(-1)?.quantity).toBe(3);
  });
});

describe('Call of Cthulhu combat rules', () => {
  it('weighs an attack against a dodge or a fight back', async () => {
    const { opposedResult } = await import('../src/coc');
    expect(opposedResult('hard', 'regular', 'dodge')).toBe('attacker');
    expect(opposedResult('regular', 'regular', 'dodge')).toBe('defender');
    expect(opposedResult('regular', 'regular', 'fightBack')).toBe('attacker');
    expect(opposedResult('failure', 'regular', 'fightBack')).toBe('defender');
    expect(opposedResult('failure', 'fumble', 'dodge')).toBe('none');
  });

  it('modifies a shot by the situation, dice cancelling out', async () => {
    const { firearmModifiers } = await import('../src/coc');
    expect(firearmModifiers({ pointBlank: true })).toMatchObject({
      bonus: 1,
      penalty: 0,
      difficulty: 'regular',
    });
    expect(firearmModifiers({ pointBlank: true, shots: 2 })).toMatchObject({ bonus: 0, penalty: 0 });
    expect(firearmModifiers({ shots: 3, intoMelee: true, targetDivedForCover: true })).toMatchObject({
      penalty: 2,
    });
    expect(firearmModifiers({ range: 'long' }).difficulty).toBe('hard');
    expect(firearmModifiers({ range: 'veryLong' }).difficulty).toBe('extreme');
  });

  it('works out the Pulp talents of a shot', async () => {
    const { firearmModifiers } = await import('../src/coc');
    // «Беглый огонь»: no penalty die for several handgun shots.
    expect(firearmModifiers({ shots: 3, rapidFire: true })).toMatchObject({ bonus: 0, penalty: 0 });
    // «Зоркий глаз»: an aimed shot ignores a small target and a melee; unaimed it does not.
    expect(firearmModifiers({ aimed: true, beadyEye: true, intoMelee: true, targetHidden: true })).toMatchObject({
      bonus: 1,
      penalty: 0,
    });
    expect(firearmModifiers({ beadyEye: true, intoMelee: true, targetHidden: true })).toMatchObject({ penalty: 2 });
  });

  it('finds a Pulp talent on the sheet and the die a heavy hitter adds', async () => {
    const { hasTalent, damageDieOf } = await import('../src/coc');
    expect(hasTalent({ traits: [{ grant: 'talent:nimble' }] }, 'nimble')).toBe(true);
    expect(hasTalent({ traits: [{ grant: 'talent:nimble' }, {}] }, 'tough-guy')).toBe(false);
    expect(damageDieOf('1d8+2+DB')).toBe(8);
    expect(damageDieOf('2d6/1d6')).toBe(6);
    expect(damageDieOf('горение')).toBeUndefined();
  });

  it('gives an NPC the damage bonus of its Build', async () => {
    const { damageBonusOfBuild, damageBonusOf } = await import('../src/coc');
    for (const strSiz of [60, 80, 100, 150, 180, 250, 300, 400])
      expect(damageBonusOfBuild(damageBonusOf(strSiz).build)).toBe(damageBonusOf(strSiz).damageBonus);
  });

  it('allows manoeuvres by Build and gives outnumbering a bonus die', async () => {
    const { manoeuvreChance, meleeModifiers, initiativeOf } = await import('../src/coc');
    expect(manoeuvreChance(0, 0)).toMatchObject({ possible: true, penalty: 0 });
    expect(manoeuvreChance(0, 1)).toMatchObject({ possible: true, penalty: 1 });
    expect(manoeuvreChance(0, 2)).toMatchObject({ possible: true, difficulty: 'regular', penalty: 2 });
    expect(manoeuvreChance(2, 1)).toMatchObject({ possible: true, penalty: 0 });
    expect(manoeuvreChance(-1, 1)).toMatchObject({ possible: true, penalty: 2 });
    expect(manoeuvreChance(-2, 1).possible).toBe(false);
    expect(manoeuvreChance(0, 3).possible).toBe(false);
    expect(meleeModifiers({ defenderReactedThisRound: 1 }).bonus).toBe(1);
    expect(initiativeOf(60, true)).toBe(110);
  });
});

describe('Call of Cthulhu rules by the book', () => {
  /** A d100 as the random source: the units die, then the tens die. */
  const percentile = (total: number) => {
    const units = total % 10;
    const tens = total === 100 ? 0 : Math.floor(total / 10);
    return [face(units + 1, 10), face(tens + 1, 10)];
  };
  const ticked = (values: Record<string, number>, sanity = 70) => {
    const doc = investigator();
    const known = new Set(doc.coc!.skills.map((s) => s.id));
    const skills = [
      ...doc.coc!.skills,
      ...Object.keys(values)
        .filter((id) => !known.has(id))
        .map((id) => ({ id, value: 0, check: false })),
    ];
    return {
      ...doc,
      sanity,
      coc: {
        ...doc.coc!,
        skills: skills.map((s) => (s.id in values ? { ...s, value: values[s.id], check: true } : s)),
      },
    };
  };

  it('counts a fumble by the number needed after the difficulty', () => {
    expect(successLevel(97, 60)).toBe('failure');
    expect(successLevel(97, 60, 30)).toBe('fumble');
    const hard = checkSkill(60, { difficulty: 'hard' }, sequence(...percentile(97)));
    expect(hard).toMatchObject({ total: 97, level: 'fumble', success: false });
    expect(checkSkill(60, {}, sequence(...percentile(97))).level).toBe('failure');
    expect(checkSkill(80, { difficulty: 'extreme' }, sequence(...percentile(96))).level).toBe('fumble');
    expect(checkSkill(80, { difficulty: 'hard' }, sequence(...percentile(96))).level).toBe('fumble');
    expect(checkSkill(100, { difficulty: 'hard' }, sequence(...percentile(96)))).toMatchObject({
      level: 'regular',
      success: false,
    });
    // Levels still come from the full value.
    expect(checkSkill(60, { difficulty: 'hard' }, sequence(...percentile(12))).level).toBe('extreme');
  });

  it('steps the damage bonus and build at the table boundaries', () => {
    expect(damageBonusOf(204)).toEqual({ damageBonus: '+1d6', build: 2 });
    expect(damageBonusOf(205)).toEqual({ damageBonus: '+2d6', build: 3 });
    expect(damageBonusOf(284)).toEqual({ damageBonus: '+2d6', build: 3 });
    expect(damageBonusOf(285)).toEqual({ damageBonus: '+3d6', build: 4 });
    expect(damageBonusOf(444)).toEqual({ damageBonus: '+4d6', build: 5 });
    expect(damageBonusOf(445)).toEqual({ damageBonus: '+5d6', build: 6 });
    expect(damageBonusOf(524)).toEqual({ damageBonus: '+5d6', build: 6 });
    expect(damageBonusOf(525)).toEqual({ damageBonus: '+6d6', build: 7 });
  });

  it('moves at 8 when only one of DEX and STR beats SIZ', () => {
    expect(moveRate({ ...harvey, str: 40, dex: 70, siz: 65 })).toBe(8);
    expect(moveRate({ ...harvey, str: 70, dex: 40, siz: 65 })).toBe(8);
    expect(moveRate({ ...harvey, str: 65, dex: 65, siz: 65 })).toBe(8);
  });

  it('prices the extremes and the modern day', () => {
    expect(wealthOf(30, 'modern')).toMatchObject({ cash: 1200, assets: 30_000, spendingLevel: 200 });
    expect(wealthOf(0, '1920s')).toMatchObject({ label: 'Нищий', cash: 0.5, assets: 0 });
    expect(wealthOf(0, 'modern').cash).toBe(10);
    expect(wealthOf(99, '1920s')).toMatchObject({ label: 'Сверхбогатый', cash: 50_000 });
  });

  it('develops a skill on 96+ even above 95, and skips skills that never improve', () => {
    const doc = ticked({ 'library-use': 97, 'credit-rating': 30, 'cthulhu-mythos': 4 });
    const { character, rolls } = developSkills(doc, sequence(face(97, 100), face(3, 10)));
    expect(rolls).toEqual([{ id: 'library-use', roll: 97, gain: 3, sanityGain: 0 }]);
    const skill = (id: string) => character.coc!.skills.find((s) => s.id === id)!;
    expect(skill('library-use')).toMatchObject({ value: 100, check: false });
    expect(skill('credit-rating')).toMatchObject({ value: 30, check: false });
    expect(skill('cthulhu-mythos')).toMatchObject({ value: 4, check: false });
  });

  it('steadies the mind at 90, never above 99 less Mythos', () => {
    const doc = ticked({ 'library-use': 85 }, 90);
    const { character, rolls } = developSkills(doc, sequence(face(90, 100), face(6, 10), face(6, 6)));
    expect(rolls).toEqual([{ id: 'library-use', roll: 90, gain: 6, sanityGain: 12 }]);
    expect(character.sanity).toBe(95);
    expect(applyDevelopment(rolls)({ ...doc, sanity: 50 }).sanity).toBe(62);
  });

  it('applies development rolls the same way every time', () => {
    const doc = ticked({ 'library-use': 70, listen: 20 });
    const rolls = [
      { id: 'library-use', roll: 90, gain: 6, sanityGain: 0 },
      { id: 'listen', roll: 10, gain: 0, sanityGain: 0 },
    ];
    const once = applyDevelopment(rolls)(doc);
    expect(applyDevelopment(rolls)(doc)).toEqual(once);
    expect(once.coc!.skills.find((s) => s.id === 'library-use')).toMatchObject({ value: 76, check: false });
    expect(once.coc!.skills.some((s) => s.check)).toBe(false);
  });

  it('recovers luck by the edition: 1d10 over it; Pulp 2d10+10 over it, 1d10+5 otherwise; never past 99', () => {
    const doc = investigator();
    expect(rollLuckRecovery(doc, sequence(face(80, 100), face(7, 10)))).toEqual({ roll: 80, gain: 7, dice: [7] });
    expect(rollLuckRecovery(doc, sequence(face(30, 100)))).toEqual({ roll: 30, gain: 0, dice: [] });
    const pulp = investigator({ variant: 'pulp' });
    const hero = { ...pulp, coc: { ...pulp.coc!, luck: 55, startingLuck: 55 } };
    // Over the luck: 2d10+10, past the luck rolled at creation.
    expect(rollLuckRecovery(hero, sequence(face(80, 100), face(7, 10), face(4, 10)))).toEqual({
      roll: 80,
      gain: 21,
      dice: [7, 4],
    });
    // At or under it: still 1d10+5.
    expect(rollLuckRecovery(hero, sequence(face(30, 100), face(3, 10)))).toEqual({ roll: 30, gain: 8, dice: [3] });
    const lucky = { ...pulp, coc: { ...pulp.coc!, luck: 90 } };
    expect(rollLuckRecovery(lucky, sequence(face(95, 100), face(10, 10), face(10, 10))).gain).toBe(9);
    expect(recoverLuck(7)(doc).coc!.luck).toBe(62);
    expect(recoverLuck(50)(doc).coc!.luck).toBe(99);
  });

  it('gives a shotgun the damage of its range band', () => {
    const low = () => 0;
    const shotgun = { damage: '4d6/2d6/1d6' };
    expect(weaponDamage(shotgun, '0', 'regular', low).total).toBe(4);
    expect(weaponDamage(shotgun, '0', 'regular', low, 1).total).toBe(2);
    expect(weaponDamageDetailed(shotgun, '0', 'extreme', low, 2)).toMatchObject({ total: 6, formula: '1d6' });
    expect(weaponDamage(shotgun, '0', 'regular', low, 7).total).toBe(1);
    expect(firearmRangeOf(8, '10/20/50 ярд.')).toEqual({ range: 'base', band: 0, bands: 3 });
    expect(firearmRangeOf(15, '10/20/50 ярд.')).toEqual({ range: 'long', band: 1, bands: 3 });
    expect(firearmRangeOf(51, '10/20/50 ярд.')?.range).toBe('beyond');
    expect(firearmModifiers({ range: 'long', bands: 3 })).toMatchObject({ difficulty: 'regular', band: 1 });
    expect(firearmModifiers({ range: 'veryLong', bands: 2 })).toMatchObject({ difficulty: 'regular', band: 1 });
  });

  it('makes a shot hard to twice the range, extreme to four times, impossible beyond', () => {
    expect(firearmRangeOf(15, '15 ярд.')?.range).toBe('base');
    expect(firearmRangeOf(30, '15 ярд.')?.range).toBe('long');
    expect(firearmRangeOf(60, '15 ярд.')?.range).toBe('veryLong');
    expect(firearmRangeOf(61, '15 ярд.')?.range).toBe('beyond');
    expect(firearmRangeOf(1, 'касание')).toBeUndefined();
    expect(firearmRangeOf(1, 'СИЛ/5 ярд.')).toBeUndefined();
    expect(firearmModifiers({ range: 'beyond' })).toMatchObject({ impossible: true, difficulty: 'regular' });
    expect(firearmModifiers({ range: 'base' }).impossible).toBeUndefined();
  });

  it('takes armour off every blow before the wound is judged', () => {
    expect(absorbArmor(5, 2)).toBe(3);
    expect(absorbArmor(1, 3)).toBe(0);
    expect(absorbArmor(4)).toBe(4);
    const doc = investigator();
    expect(applyDamage(8, 2)(doc)).toMatchObject({ currentHP: 6, conditions: ['major-wound'] });
    expect(applyDamage(7, 2)(doc)).toMatchObject({ currentHP: 7, conditions: [] });
    const armoured = { ...doc, coc: { ...doc.coc!, armor: 2 } };
    expect(applyHitDamage(7)(armoured).currentHP).toBe(7);
    expect(applyHitDamage(7)(doc).currentHP).toBe(5);
  });

  it('brings a bout of madness when an insane investigator loses more', () => {
    const doc = { ...investigator(), sanity: 60 };
    expect(loseSanity(1).outcome(doc).boutTriggered).toBe(false);
    const insane = { ...doc, conditions: ['temporary-insanity'] };
    expect(loseSanity(1).outcome(insane).boutTriggered).toBe(true);
    expect(loseSanity(0).outcome(insane).boutTriggered).toBe(false);
    expect(sanityLoss({ ...doc, conditions: ['indefinite-insanity'] }, 2).boutTriggered).toBe(true);
  });

  it('heals a major wound by the week; an extreme CON roll erases it', () => {
    const doc = { ...investigator(), currentHP: 4, conditions: ['major-wound'] };
    const extreme = weeklyRecovery(doc, sequence(...percentile(5), face(3, 3), face(2, 3)));
    expect(extreme).toMatchObject({ needed: true, gain: 5, dice: [3, 2], clearsMajorWound: true });
    expect(applyWeeklyRecovery(extreme)(doc)).toMatchObject({ currentHP: 9, conditions: [] });
    const regular = weeklyRecovery(doc, sequence(...percentile(40), face(2, 3)));
    expect(regular).toMatchObject({ gain: 2, clearsMajorWound: false });
    expect(applyWeeklyRecovery(regular)(doc)).toMatchObject({ currentHP: 6, conditions: ['major-wound'] });
    expect(weeklyRecovery(doc, sequence(...percentile(80)))).toMatchObject({ gain: 0, dice: [] });
    expect(weeklyRecovery(investigator()).needed).toBe(false);
  });

  it('charges the Powder of Ibn-Ghazi sanity for making, not for each pinch', () => {
    expect(parseSpellCost('1 ПМ за щепотку; 1 рассудка за изготовление')).toEqual({
      mp: 1,
      variable: false,
      sanity: undefined,
      pow: 0,
    });
  });

  it('needs a Hard POW roll the first time a spell is cast, paying either way', () => {
    const doc = investigator();
    const failed = castSpell(doc, '8 ПМ', undefined, sequence(...percentile(90)), { firstCast: true });
    expect(failed).toMatchObject({ worked: false, powCheck: { difficulty: 'hard', success: false } });
    expect(failed.edit(doc).coc!.magicPoints).toBe(6);
    expect(castSpell(doc, '8 ПМ', undefined, sequence(...percentile(30)), { firstCast: true }).worked).toBe(true);
    expect(castSpell(doc, '8 ПМ').powCheck).toBeUndefined();
  });

  it('writes down a madness with the id it is given, once', () => {
    const add = addMadness({ id: 'madness-1', name: 'Никтофобия', kind: 'phobia', description: '' });
    const once = add(investigator());
    expect(once.coc!.madness.map((m) => m.id)).toEqual(['madness-1']);
    expect(add(once).coc!.madness).toHaveLength(1);
  });
});

describe('wounds and care', () => {
  it('a failed CON roll knocks out the wounded and kills the dying; First Aid buys an hour', async () => {
    const coc = await import('../src/coc');
    const base = makeCharacter({ currentHP: 5, maxHP: 12, conditions: [coc.CONDITION_IDS.majorWound] });
    expect(coc.afterWoundRoll(false)(base).conditions).toContain(coc.CONDITION_IDS.unconscious);
    expect(coc.afterWoundRoll(true)(base).conditions).not.toContain(coc.CONDITION_IDS.unconscious);
    const dying = { ...base, currentHP: 0, conditions: [coc.CONDITION_IDS.majorWound, coc.CONDITION_IDS.dying] };
    expect(coc.afterWoundRoll(false)(dying).conditions).toContain(coc.CONDITION_IDS.dead);
    const aided = coc.stabilise(dying);
    expect(aided.currentHP).toBe(1);
    expect(aided.conditions).toEqual(expect.arrayContaining([coc.CONDITION_IDS.stabilised]));
    expect(aided.conditions).not.toContain(coc.CONDITION_IDS.dying);
    expect(coc.stabilisationLapses(aided).conditions).toContain(coc.CONDITION_IDS.dying);
    expect(coc.treatWithMedicine(2)(aided).conditions).not.toContain(coc.CONDITION_IDS.stabilised);
  });
});
