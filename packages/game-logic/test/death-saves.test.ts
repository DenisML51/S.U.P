import { describe, expect, it } from 'vitest';
import { applyDamage, applyHealing, isDead, isStable, rollDeathSave, settleHealth } from '../src';
import { makeCharacter } from './helpers';

const hero = (currentHP: number, maxHP = 20) => makeCharacter({ currentHP, maxHP });

describe('death saving throws', () => {
  it('a hero dropped to 0 falls unconscious with a clean count', () => {
    const { character } = applyDamage(hero(5), 8);
    expect(character.currentHP).toBe(0);
    expect(character.deathSaves).toEqual({ successes: 0, failures: 0 });
    expect(character.conditions).toContain('unconscious');
  });

  it('damage left over that reaches the maximum kills outright', () => {
    expect(isDead(applyDamage(hero(5), 25).character)).toBe(true);
    expect(isDead(applyDamage(hero(5), 24).character)).toBe(false);
  });

  it('damage at 0 is a failed save, a critical hit two', () => {
    const down = applyDamage(hero(5), 5).character;
    expect(applyDamage(down, 3).character.deathSaves).toEqual({ successes: 0, failures: 1 });
    expect(applyDamage(down, 3, { critical: true }).character.deathSaves).toEqual({ successes: 0, failures: 2 });
    expect(isDead(applyDamage(down, 20).character)).toBe(true);
  });

  it('temporary hit points that take the whole blow spare the save', () => {
    const down = { ...applyDamage(hero(5), 5).character, tempHP: 5 };
    expect(applyDamage(down, 4).character.deathSaves).toEqual({ successes: 0, failures: 0 });
  });

  it('rolls: 10+ succeeds, a 1 fails twice, a 20 gets back up with 1 hit point', () => {
    const down = applyDamage(hero(5), 5).character;
    expect(rollDeathSave(down, 10).character.deathSaves).toEqual({ successes: 1, failures: 0 });
    expect(rollDeathSave(down, 9).character.deathSaves).toEqual({ successes: 0, failures: 1 });
    expect(rollDeathSave(down, 1).character.deathSaves).toEqual({ successes: 0, failures: 2 });
    const up = rollDeathSave(down, 20);
    expect(up.outcome).toBe('revived');
    expect(up.character.currentHP).toBe(1);
    expect(up.character.deathSaves).toBeUndefined();
    expect(up.character.conditions).not.toContain('unconscious');
  });

  it('three successes steady the hero, three failures kill', () => {
    let down = applyDamage(hero(5), 5).character;
    for (const die of [12, 15]) down = rollDeathSave(down, die).character;
    const last = rollDeathSave(down, 11);
    expect(last.outcome).toBe('stable');
    expect(isStable(last.character)).toBe(true);
    expect(rollDeathSave(last.character, 1).character).toBe(last.character);

    let dying = applyDamage(hero(5), 5).character;
    dying = rollDeathSave(dying, 1).character;
    expect(rollDeathSave(dying, 5).outcome).toBe('dead');
  });

  it('healing brings the hero back and clears the saves', () => {
    const down = rollDeathSave(applyDamage(hero(5), 5).character, 3).character;
    const healed = applyHealing(down, 4).character;
    expect(healed.currentHP).toBe(4);
    expect(healed.deathSaves).toBeUndefined();
    expect(healed.conditions).not.toContain('unconscious');
  });

  it('hit points set by hand start or end the saves', () => {
    expect(settleHealth({ ...hero(5), currentHP: 0 }).deathSaves).toEqual({ successes: 0, failures: 0 });
    const down = applyDamage(hero(5), 5).character;
    expect(settleHealth({ ...down, currentHP: 3 }).deathSaves).toBeUndefined();
  });

  it('investigators of Call of Cthulhu do not roll them', () => {
    const investigator = makeCharacter({
      currentHP: 5,
      maxHP: 10,
      build: { ruleset: 'coc7', variant: 'classic', era: '1920s', occupation: '', talents: [], age: 25 },
    });
    const { character } = applyDamage(investigator, 8);
    expect(character.deathSaves).toBeUndefined();
    expect(character.conditions).not.toContain('unconscious');
  });
});

describe('death saves and rest', () => {
  it('hit dice spent on a short rest wake a hero at 0', async () => {
    const { shortRest } = await import('../src');
    const down = applyDamage(makeCharacter({ currentHP: 5, maxHP: 20, resources: [{ id: 'hd', name: 'Кости хитов', current: 2, max: 2, hitDie: 10, recovery: 'manual', description: '', iconName: '' }] }), 5).character;
    const rested = shortRest(down, { hitDice: 1, method: 'average' }).character;
    expect(rested.currentHP).toBeGreaterThan(0);
    expect(rested.deathSaves).toBeUndefined();
    expect(rested.conditions).not.toContain('unconscious');
  });
});
