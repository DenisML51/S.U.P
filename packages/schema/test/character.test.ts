import { describe, expect, it } from 'vitest';
import { CharacterSchema, createCharacterDocument, toCharacterPreview } from '../src';
import { makeCharacter } from './fixtures';

const minimal = {
  schemaVersion: 1,
  id: 'hero_1',
  name: 'Герой',
  attributes: { strength: 10 },
};

describe('CharacterSchema', () => {
  it('fills defaults for a minimal document', () => {
    const character = CharacterSchema.parse(minimal);

    expect(character).toMatchObject({
      level: 1,
      speed: 30,
      armorClass: 10,
      currentHP: 10,
      maxHP: 10,
      sanity: 50,
      proficiencyBonus: 2,
      inventory: [],
      history: [],
      currency: { copper: 0, silver: 0, gold: 0 },
    });
    expect(character.backstory).toBe('');
  });

  it('keeps unknown keys at every level', () => {
    const character = CharacterSchema.parse({
      ...minimal,
      meta: { source: 'homebrew' },
      inventory: [{ id: 'i1', name: 'Фляга', effect: 'Утоляет жажду' }],
    });

    expect((character as Record<string, unknown>).meta).toEqual({ source: 'homebrew' });
    expect((character.inventory[0] as Record<string, unknown>).effect).toBe('Утоляет жажду');
    expect(character.inventory[0]).toMatchObject({ type: 'item', equipped: false, weight: 0 });
  });

  it('coerces the values form inputs produce', () => {
    const character = CharacterSchema.parse({
      ...minimal,
      currentHP: Number.NaN,
      tempHP: null,
      sanity: '42',
      speed: ' 25 ',
      subrace: null,
      attributes: { strength: '15' },
    });

    expect(character.currentHP).toBe(10);
    expect(character.tempHP).toBe(0);
    expect(character.sanity).toBe(42);
    expect(character.speed).toBe(25);
    expect(character.subrace).toBeUndefined();
    expect(character.attributes.strength).toBe(15);
  });

  it('accepts known settings and rejects unknown ones', () => {
    expect(CharacterSchema.parse({ ...minimal, setting: 'sci-fi' }).setting).toBe('sci-fi');
    expect(CharacterSchema.parse(minimal).setting).toBeUndefined();
    expect(CharacterSchema.safeParse({ ...minimal, setting: 'steampunk' }).success).toBe(false);
  });

  it('references uploaded art by asset id', () => {
    const id = 'a3bb189e-8bf9-4888-9912-ace4e6543002';
    expect(CharacterSchema.parse({ ...minimal, images: { portrait: id } }).images).toEqual({ portrait: id });
    expect(CharacterSchema.safeParse({ ...minimal, images: { full: 'not-an-id' } }).success).toBe(false);
  });

  it('rejects a numeric field that holds text', () => {
    expect(CharacterSchema.safeParse({ ...minimal, maxHP: 'много' }).success).toBe(false);
  });

  it('rejects a missing attribute value instead of inventing one', () => {
    expect(CharacterSchema.safeParse({ ...minimal, attributes: { strength: Number.NaN } }).success).toBe(false);
  });

  it('distinguishes an uncapped Dexterity bonus (null) from an unset one', () => {
    const character = CharacterSchema.parse({
      ...minimal,
      inventory: [
        { id: 'a', name: 'Кожаный доспех', type: 'armor', maxDexModifier: null },
        { id: 'b', name: 'Полулаты', type: 'armor', maxDexModifier: '2' },
        { id: 'c', name: 'Плащ' },
      ],
    });

    expect(character.inventory.map((item) => item.maxDexModifier)).toEqual([null, 2, undefined]);
  });

  it.each([
    ['empty name', { name: '   ' }],
    ['id with spaces', { id: 'my hero' }],
    ['wrong schema version', { schemaVersion: 2 }],
    ['unknown item type', { inventory: [{ id: 'x', name: 'x', type: 'vehicle' }] }],
    ['level out of range', { level: 0 }],
  ])('rejects %s', (_, patch) => {
    expect(CharacterSchema.safeParse({ ...minimal, ...patch }).success).toBe(false);
  });

  it('never shares default collections between documents', () => {
    const first = CharacterSchema.parse(minimal);
    first.inventory.push({ id: 'i', name: 'i', type: 'item', equipped: false, weight: 0, cost: 0, description: '' });
    first.currency.gold = 100;

    const second = CharacterSchema.parse(minimal);
    expect(second.inventory).toEqual([]);
    expect(second.currency.gold).toBe(0);
  });
});

describe('createCharacterDocument', () => {
  it('assigns identity and the current schema version', () => {
    const { id: _id, schemaVersion: _version, ...draft } = makeCharacter();
    const document = createCharacterDocument(draft, 'fixed_id');

    expect(document.id).toBe('fixed_id');
    expect(document.schemaVersion).toBe(1);
  });

  it('generates a valid id when none is given', () => {
    const { id: _id, schemaVersion: _version, ...draft } = makeCharacter();
    expect(createCharacterDocument(draft).id).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('toCharacterPreview', () => {
  it('projects the fields the character list shows', () => {
    const character = makeCharacter({ name: 'Лиара', level: 18, currentHP: 168, maxHP: 290 });
    expect(toCharacterPreview(character)).toEqual({
      id: character.id,
      name: 'Лиара',
      setting: undefined,
      race: '',
      subrace: undefined,
      class: '',
      subclass: '',
      level: 18,
      currentHP: 168,
      maxHP: 290,
      images: undefined,
      avatar: undefined,
      resistances: [],
    });
  });
});
