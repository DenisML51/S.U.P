import { CharacterMigrationError, migrateCharacter } from '@itd/schema';
import type { CharacterRepository } from '../local/characterRepository';

const LEGACY_KEY_PREFIX = 'trpg_character_';
const LEGACY_SINGLE_KEY = 'trpg_character';

export interface LegacyImportResult {
  imported: string[];
  failed: { key: string; reason: string }[];
}

/**
 * The browser build of the desktop app kept characters in localStorage. On the first sign-in of an
 * account on this browser, those characters are moved into the account. The old keys are left in
 * place as a backup; a per-account marker prevents importing twice.
 */
export async function importLegacyBrowserStorage(
  repository: CharacterRepository,
  userId: string,
): Promise<LegacyImportResult> {
  const marker = `itd.legacyImported.${userId}`;
  const result: LegacyImportResult = { imported: [], failed: [] };

  let keys: string[];
  try {
    if (localStorage.getItem(marker)) return result;
    keys = Object.keys(localStorage).filter((key) => key === LEGACY_SINGLE_KEY || key.startsWith(LEGACY_KEY_PREFIX));
  } catch {
    return result;
  }

  for (const key of keys) {
    try {
      const character = migrateCharacter(JSON.parse(localStorage.getItem(key) ?? 'null'));
      if (await repository.has(character.id)) continue;
      await repository.create(character);
      result.imported.push(character.name);
    } catch (error) {
      result.failed.push({
        key,
        reason: error instanceof CharacterMigrationError || error instanceof SyntaxError ? error.message : String(error),
      });
    }
  }

  try {
    localStorage.setItem(marker, new Date().toISOString());
  } catch {
    // Without the marker the import may run again; it skips characters that already exist.
  }
  return result;
}
