import { CharacterSchema, type Character, type DndBuild, type InventoryItem } from '@itd/schema';

/** A D&D build of one class, written the short way: its class, subclass and level. */
export type SingleClassBuild = Omit<DndBuild, 'classes'> & { class: string; subclass?: string; level?: number };

/** The build of a hero who took every level in one class. */
export const singleClass = ({ class: classId, subclass, level = 1, ...build }: SingleClassBuild): DndBuild => ({
  ...build,
  classes: [{ class: classId, subclass, levels: Array.from({ length: level }, (_, i) => i + 1) }],
});

/** A single-class build taken to another level. */
export const atLevel = (build: DndBuild, level: number): DndBuild => ({
  ...build,
  classes: build.classes.map((c) => ({ ...c, levels: Array.from({ length: level }, (_, i) => i + 1) })),
});

let counter = 0;

export const makeCharacter = (overrides: Partial<Character> = {}): Character =>
  CharacterSchema.parse({
    schemaVersion: 1,
    id: `test_${++counter}`,
    name: 'Тестовый герой',
    attributes: { strength: 14, dexterity: 16, constitution: 12, intelligence: 10, wisdom: 13, charisma: 8 },
    limbs: [
      { id: 'head', name: 'Голова', currentHP: 6, maxHP: 6, ac: 13 },
      { id: 'torso', name: 'Торс', currentHP: 6, maxHP: 6, ac: 13 },
    ],
    ...overrides,
  });

export const item = (id: string, patch: Partial<InventoryItem> = {}): InventoryItem => ({
  id,
  name: id,
  type: 'item',
  equipped: false,
  weight: 0,
  cost: 0,
  description: '',
  ...patch,
});

/** Deterministic random source cycling through the given values. */
export const sequence = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length]!;
};
