import { describe, expect, it } from 'vitest';
import { BuildSchema, CharacterSchema, createCharacterDocument, toCharacterPreview } from '../src';
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
    expect(CharacterSchema.parse({ ...minimal, setting: 'lovecraft' }).setting).toBe('lovecraft');
    expect(CharacterSchema.parse({ ...minimal, setting: 'elden-ring' }).setting).toBe('elden-ring');
    expect(CharacterSchema.parse({ ...minimal, setting: 'fable' }).setting).toBe('fable');
    expect(CharacterSchema.parse(minimal).setting).toBeUndefined();
    expect(CharacterSchema.safeParse({ ...minimal, setting: 'steampunk' }).success).toBe(false);
  });

  it('reads retired settings as the closest one left', () => {
    expect(CharacterSchema.parse({ ...minimal, setting: 'grimdark' }).setting).toBe('elden-ring');
    expect(CharacterSchema.parse({ ...minimal, setting: 'dark-fantasy' }).setting).toBe('elden-ring');
    expect(CharacterSchema.parse({ ...minimal, setting: 'cyberpunk' }).setting).toBe('sci-fi');
    expect(CharacterSchema.parse({ ...minimal, setting: 'high-fantasy' }).setting).toBe('fable');
  });

  it('reads a resource saved before rest rules as restored by a long rest', () => {
    const resources = [{ id: 'focus', name: 'Фокус', current: 1, max: 3 }];
    expect(CharacterSchema.parse({ ...minimal, resources }).resources[0]).toMatchObject({ recovery: 'long' });
  });

  it('references uploaded art by asset id', () => {
    const id = 'a3bb189e-8bf9-4888-9912-ace4e6543002';
    expect(CharacterSchema.parse({ ...minimal, images: { portrait: id } }).images).toEqual({ portrait: id });
    expect(CharacterSchema.safeParse({ ...minimal, images: { full: 'not-an-id' } }).success).toBe(false);
  });

  it("reads an investigator's armour, absent on sheets saved before it", () => {
    const coc = { characteristics: { str: 50 } };
    expect(CharacterSchema.parse({ ...minimal, coc }).coc?.armor).toBeUndefined();
    expect(CharacterSchema.parse({ ...minimal, coc: { ...coc, armor: '2' } }).coc?.armor).toBe(2);
    expect(CharacterSchema.safeParse({ ...minimal, coc: { ...coc, armor: 21 } }).success).toBe(false);
    expect(CharacterSchema.safeParse({ ...minimal, coc: { ...coc, armor: 1.5 } }).success).toBe(false);
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

describe('D&D build', () => {
  const dnd = { ruleset: 'dnd2024', species: 'human', background: 'sage' };

  it('reads a build saved before multiclassing as its one class taking every level', () => {
    const build = BuildSchema.parse({
      ...dnd,
      class: 'wizard',
      subclass: 'evoker',
      level: 3,
      choices: {
        'casting:spells-1/spellbook': ['shield'],
        'swap:known-cantrips@2/forget': ['light'],
        'class:wizard.skills/skills': ['arcana', 'history'],
      },
    });
    expect(build).toMatchObject({ classes: [{ class: 'wizard', subclass: 'evoker', levels: [1, 2, 3] }] });
    expect(build).not.toHaveProperty('class');
    expect(build).not.toHaveProperty('level');
    // The picks of the class's spellcasting are kept under its name; the others stay as they were.
    expect(build.ruleset === 'dnd2024' && Object.keys(build.choices).sort()).toEqual([
      'casting:wizard.spells-1/spellbook',
      'class:wizard.skills/skills',
      'swap:wizard.known-cantrips@2/forget',
    ]);
  });

  it('reads a hero in the making without a class as one with no classes yet', () => {
    expect(BuildSchema.parse({ ...dnd, class: '', level: 1 })).toMatchObject({ classes: [] });
  });

  it('keeps every character level in exactly one class, from the first on', () => {
    const parse = (classes: unknown) => BuildSchema.safeParse({ ...dnd, classes }).success;
    expect(parse([{ class: 'fighter', levels: [1, 2, 4] }, { class: 'wizard', levels: [3] }])).toBe(true);
    expect(parse([{ class: 'fighter', levels: [1, 2] }, { class: 'wizard', levels: [4] }])).toBe(false);
    expect(parse([{ class: 'fighter', levels: [1, 2] }, { class: 'wizard', levels: [2] }])).toBe(false);
    expect(parse([{ class: 'fighter', levels: [2, 1] }])).toBe(false);
    expect(parse([{ class: 'fighter', levels: [1] }, { class: 'fighter', levels: [2] }])).toBe(false);
    expect(parse([{ class: 'fighter', levels: [] }])).toBe(false);
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

  it('shows the whole maximum of hit points, the bonus included', () => {
    const character = makeCharacter({ currentHP: 76, maxHP: 68, maxHPBonus: 8 });
    expect(toCharacterPreview(character).maxHP).toBe(76);
  });
});
