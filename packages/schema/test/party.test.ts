import { describe, expect, it } from 'vitest';
import {
  CreateNpcRequestSchema,
  InitiativeRequestSchema,
  NpcCocSchema,
  npcCombatSkill,
  npcDexOrder,
  npcMinHP,
} from '../src';

describe('initiative', () => {
  it('takes a Call of Cthulhu order past 99: DEX + 50 with a firearm ready', () => {
    expect(InitiativeRequestSchema.safeParse({ value: 140 }).success).toBe(true);
    expect(InitiativeRequestSchema.safeParse({ value: 200 }).success).toBe(true);
    expect(InitiativeRequestSchema.safeParse({ value: 201 }).success).toBe(false);
    expect(InitiativeRequestSchema.safeParse({ value: -51 }).success).toBe(false);
  });
});

describe('Call of Cthulhu NPCs', () => {
  it('fills the numbers left out and keeps them in range', () => {
    expect(NpcCocSchema.parse({})).toEqual({
      armor: 0,
      build: 0,
      damageBonus: '',
      attacks: [],
      sanityLoss: '',
      firearmReady: false,
    });
    expect(NpcCocSchema.safeParse({ armor: 21 }).success).toBe(false);
    expect(NpcCocSchema.safeParse({ build: -3 }).success).toBe(false);
    expect(NpcCocSchema.safeParse({ damageBonus: '+1D4', sanityLoss: '0/1D6' }).success).toBe(true);
    expect(NpcCocSchema.safeParse({ sanityLoss: 'много' }).success).toBe(false);
  });

  it('is an ordinary NPC unless the numbers are given', () => {
    expect(CreateNpcRequestSchema.parse({ name: 'Гуль', maxHP: 13, armorClass: 0, initiativeBonus: 65 }).coc).toBeNull();
  });

  it('acts by DEX, +50 with a firearm, ties broken by the best attack', () => {
    expect(npcDexOrder(60, null)).toBe(60);
    expect(npcDexOrder(60, { firearmReady: true })).toBe(110);
    expect(npcCombatSkill(null)).toBe(0);
    expect(npcCombatSkill({ attacks: [{ name: 'Нож', skill: 40, damage: '1D4' }, { name: 'Ружьё', skill: 55, damage: '2D6' }] })).toBe(55);
    expect(npcMinHP(true)).toBe(0);
    expect(npcMinHP(false)).toBeLessThan(0);
  });
});
