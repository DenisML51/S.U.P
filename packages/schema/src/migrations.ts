import { z } from 'zod';
import { CHARACTER_SCHEMA_VERSION, CharacterSchema, EntityIdSchema, type Character } from './character';
import { randomId } from './id';

export class CharacterMigrationError extends Error {
  constructor(
    message: string,
    readonly issues: z.core.$ZodIssue[] = [],
  ) {
    super(message);
    this.name = 'CharacterMigrationError';
  }
}

type RawDocument = Record<string, unknown>;

const DEFAULT_SPELL_SCHOOLS = [
  'Воплощение',
  'Вызов',
  'Иллюзия',
  'Некромантия',
  'Очарование',
  'Преобразование',
  'Прорицание',
  'Ограждение',
];

const DEFAULT_MAX_PREPARED_SPELLS = { 0: 99, 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 };

const isRecord = (value: unknown): value is RawDocument =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** `Number(null)` and `Number('')` are 0, so a plain `Number.isFinite(Number(x))` check is not enough. */
const isNumeric = (value: unknown): boolean =>
  (typeof value === 'number' && Number.isFinite(value)) ||
  (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)));

/**
 * Version 0 is every sheet written by the desktop app (no `schemaVersion` field). Its loader filled
 * gaps with `||`, so a few fields carry defaults that differ from an empty value; those are restored
 * here. Ids that do not fit the new id format are replaced.
 */
function migrateV0ToV1(doc: RawDocument, createId: () => string): RawDocument {
  if (typeof doc.name !== 'string' || !isRecord(doc.attributes)) {
    throw new CharacterMigrationError('Файл не похож на лист персонажа: нет имени или характеристик');
  }

  const id = EntityIdSchema.safeParse(doc.id).success ? doc.id : createId();

  return {
    ...doc,
    schemaVersion: 1,
    id,
    knownSchools: Array.isArray(doc.knownSchools) ? doc.knownSchools : DEFAULT_SPELL_SCHOOLS,
    maxPreparedSpells: isRecord(doc.maxPreparedSpells) ? doc.maxPreparedSpells : DEFAULT_MAX_PREPARED_SPELLS,
    spellcastingDifficultyName: doc.spellcastingDifficultyName || 'СЛ ЗКЛ',
    spellcastingDifficultyValue: doc.spellcastingDifficultyValue || 10,
    limbs: Array.isArray(doc.limbs)
      ? doc.limbs.map((limb: unknown) =>
          isRecord(limb)
            ? {
                ...limb,
                // The desktop loader healed a broken limb to full HP; keep that behaviour.
                currentHP: isNumeric(limb.currentHP) ? limb.currentHP : isNumeric(limb.maxHP) ? limb.maxHP : 10,
                maxHP: isNumeric(limb.maxHP) ? limb.maxHP : 10,
                ac: isNumeric(limb.ac) ? limb.ac : 10,
              }
            : limb,
        )
      : [],
    resources: Array.isArray(doc.resources)
      ? doc.resources.map((resource: unknown) =>
          isRecord(resource) && !isNumeric(resource.current)
            ? { ...resource, current: resource.max }
            : resource,
        )
      : [],
  };
}

const MIGRATIONS: Record<number, (doc: RawDocument, createId: () => string) => RawDocument> = {
  0: migrateV0ToV1,
};

export interface MigrateOptions {
  /** Generates an id for documents that have none (or an invalid one). */
  createId?: () => string;
}

/**
 * Brings any stored or imported character document to the current schema version and validates it.
 * This is the only way untrusted character data should enter the application.
 */
export function migrateCharacter(input: unknown, options: MigrateOptions = {}): Character {
  if (!isRecord(input)) {
    throw new CharacterMigrationError('Ожидался объект персонажа');
  }

  const createId = options.createId ?? randomId;
  const declared = input.schemaVersion;
  let version = declared === undefined ? 0 : Number(declared);

  if (!Number.isInteger(version) || version < 0) {
    throw new CharacterMigrationError(`Некорректная версия схемы: ${String(declared)}`);
  }
  if (version > CHARACTER_SCHEMA_VERSION) {
    throw new CharacterMigrationError(
      `Персонаж сохранён более новой версией приложения (схема v${version}). Обновите приложение.`,
    );
  }

  let doc: RawDocument = input;
  while (version < CHARACTER_SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) throw new CharacterMigrationError(`Нет миграции со схемы v${version}`);
    doc = step(doc, createId);
    version += 1;
  }

  const result = CharacterSchema.safeParse(doc);
  if (!result.success) {
    throw new CharacterMigrationError(
      `Лист персонажа не прошёл проверку: ${z.prettifyError(result.error)}`,
      result.error.issues,
    );
  }
  return result.data;
}
