/** Replaces the entity with the same id, or appends it when it is new. */
export const upsertById = <T extends { id: string }>(list: readonly T[], entity: T): T[] =>
  list.some((e) => e.id === entity.id) ? list.map((e) => (e.id === entity.id ? entity : e)) : [...list, entity];

export const removeById = <T extends { id: string }>(list: readonly T[], id: string): T[] =>
  list.filter((e) => e.id !== id);

/** Unique id for an entity inside a character sheet: `<prefix>_<time>_<random>`. */
export const createEntityId = (prefix: string): string =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
