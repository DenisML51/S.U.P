import { describe, expect, it } from 'vitest';
import { CHARACTER_SCHEMA_VERSION, CharacterMigrationError, migrateCharacter } from '../src';
import { legacySheet, makeCharacter } from './fixtures';

describe('migrateCharacter', () => {
  it('upgrades a desktop-era sheet to the current version', () => {
    const character = migrateCharacter(legacySheet());

    expect(character.schemaVersion).toBe(CHARACTER_SCHEMA_VERSION);
    expect(character.id).toBe('char_1766567264309_hc64nwe7u');
    expect(character.name).toBe('Марнеус Калгар');
    expect(character.sanity).toBe(45);
    expect(character.history).toHaveLength(1);
  });

  it('applies the defaults the desktop loader used to fill in', () => {
    const character = migrateCharacter(legacySheet());

    expect(character.knownSchools).toHaveLength(8);
    expect(character.maxPreparedSpells).toMatchObject({ '0': 99, '1': 4, '9': 1 });
    expect(character.spellcastingDifficultyName).toBe('СЛ ЗКЛ');
    expect(character.spellcastingDifficultyValue).toBe(10);
  });

  it('repairs broken numbers the way the desktop loader did', () => {
    const character = migrateCharacter(legacySheet());

    expect(character.limbs.find((limb) => limb.id === 'torso')?.currentHP).toBe(9);
    expect(character.resources[0]?.current).toBe(1);
  });

  it('keeps data the schema does not know about', () => {
    const character = migrateCharacter(legacySheet()) as Record<string, unknown>;
    expect(character.meta).toEqual({ source: 'Warhammer 40k', version: '1.0' });
  });

  it('replaces an id that does not fit the id format', () => {
    const character = migrateCharacter({ ...legacySheet(), id: 'char with spaces' }, { createId: () => 'new_id' });
    expect(character.id).toBe('new_id');
  });

  it('gives an id to a sheet that has none', () => {
    const { id: _id, ...withoutId } = legacySheet();
    expect(migrateCharacter(withoutId, { createId: () => 'generated' }).id).toBe('generated');
  });

  it('is idempotent on current documents', () => {
    const once = migrateCharacter(legacySheet());
    expect(migrateCharacter(once)).toEqual(once);
  });

  it('accepts a current-version document unchanged', () => {
    const character = makeCharacter({ name: 'Эйзенхорн' });
    expect(migrateCharacter(character)).toEqual(character);
  });

  it.each([
    ['not an object', 'hello'],
    ['an array', [legacySheet()]],
    ['a sheet without attributes', { name: 'Безымянный' }],
    ['a sheet from a newer app', { ...makeCharacter(), schemaVersion: 99 }],
    ['a broken schema version', { ...makeCharacter(), schemaVersion: 'one' }],
    ['an invalid current document', { ...makeCharacter(), level: 'max' }],
  ])('rejects %s', (_, input) => {
    expect(() => migrateCharacter(input)).toThrow(CharacterMigrationError);
  });

  it('explains validation failures', () => {
    try {
      migrateCharacter({ ...makeCharacter(), level: 'max' });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(CharacterMigrationError);
      expect((error as CharacterMigrationError).issues[0]?.path).toEqual(['level']);
    }
  });
});
