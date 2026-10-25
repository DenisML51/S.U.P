import type { Character, HistoryEntry } from './character';

/** How many history entries a sheet keeps. Older entries are dropped on write and on merge. */
export const HISTORY_LIMIT = 30;

type Json = unknown;
type JsonObject = Record<string, Json>;
type Entity = JsonObject & { id: string };

/**
 * Top-level fields that are sets of strings, not ordered lists: concurrent additions on two devices
 * must both survive, so they merge as a set union rather than "local wins". (`build.choices` arrays
 * are deliberately excluded — a single-select choice there must not keep both devices' picks.)
 */
const STRING_SET_FIELDS = new Set(['conditions', 'savingThrowProficiencies', 'knownSchools']);

export interface MergeResult {
  merged: Character;
  /** Paths edited on both sides where the local edit won, e.g. `currentHP`, `inventory[item_1]`. */
  conflicts: string[];
}

const isObject = (value: Json): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isEntityList = (value: Json): value is Entity[] =>
  Array.isArray(value) && value.every((item) => isObject(item) && typeof item.id === 'string');

export function deepEqual(a: Json, b: Json): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a)) {
    return Array.isArray(b) && a.length === b.length && a.every((item, i) => deepEqual(item, b[i]));
  }
  if (isObject(a) && isObject(b)) {
    const keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length) return false;
    return keys.every((key) => Object.prototype.hasOwnProperty.call(b, key) && deepEqual(a[key], b[key]));
  }
  return false;
}

const ABSENT = Symbol('absent');
type Slot = Json | typeof ABSENT;

/**
 * Resolves one value given its common ancestor. Only one side changed → take that side. Both changed
 * → descend into id-keyed lists and plain objects; for anything else the local edit wins, because it
 * is what the player on this device just did.
 */
function mergeValue(path: string, base: Slot, local: Slot, remote: Slot, conflicts: string[]): Slot {
  if (deepEqual(local, remote)) return local;
  if (base !== ABSENT && deepEqual(local, base)) return remote;
  if (base !== ABSENT && deepEqual(remote, base)) return local;

  // Present on one side only: either it was added there, or it was deleted on the other side after
  // being edited here (both differ from base by now). An edit beats a deletion: data is not lost.
  if (local === ABSENT) return remote;
  if (remote === ABSENT) return local;

  if (isEntityList(local) && isEntityList(remote)) {
    return mergeEntityLists(path, isEntityList(base) ? base : null, local, remote, conflicts);
  }
  if (isObject(local) && isObject(remote)) {
    return mergeObjects(path, isObject(base) ? base : null, local, remote, conflicts);
  }
  if (STRING_SET_FIELDS.has(path) && Array.isArray(local) && Array.isArray(remote)) {
    return mergeStringSet(base, local, remote);
  }

  conflicts.push(path);
  return local;
}

/**
 * Three-way merge of a set-like array: an entry present in the ancestor but gone on a side was
 * removed there (a removal wins); every other entry from either side is kept. Remote order is the
 * backbone, local-only additions follow; duplicates are collapsed.
 */
function mergeStringSet(base: Slot, local: Json[], remote: Json[]): Json[] {
  const baseSet = new Set<Json>(Array.isArray(base) ? base : []);
  const localSet = new Set(local);
  const remoteSet = new Set(remote);
  const removed = (value: Json) => baseSet.has(value) && (!localSet.has(value) || !remoteSet.has(value));

  const result: Json[] = [];
  const seen = new Set<Json>();
  for (const value of [...remote, ...local]) {
    if (seen.has(value) || removed(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

function mergeObjects(
  path: string,
  base: JsonObject | null,
  local: JsonObject,
  remote: JsonObject,
  conflicts: string[],
): JsonObject {
  const result: JsonObject = {};
  const keys = new Set([...Object.keys(remote), ...Object.keys(local)]);
  for (const key of keys) {
    const slot = (source: JsonObject | null): Slot => (source && key in source ? source[key] : ABSENT);
    const value = mergeValue(path ? `${path}.${key}` : key, slot(base), slot(local), slot(remote), conflicts);
    if (value !== ABSENT) result[key] = value;
  }
  return result;
}

/**
 * Lists of entities (items, spells, attacks...) merge per entity: additions from both sides are kept,
 * a deletion wins over an untouched entity but loses to an edited one. Remote order is the backbone;
 * entities created locally are appended in their local order.
 */
function mergeEntityLists(
  path: string,
  base: Entity[] | null,
  local: Entity[],
  remote: Entity[],
  conflicts: string[],
): Entity[] {
  const byId = (list: Entity[] | null) => new Map((list ?? []).map((entity) => [entity.id, entity]));
  const baseById = byId(base);
  const localById = byId(local);
  const remoteById = byId(remote);

  const order = [...remote.map((e) => e.id), ...local.map((e) => e.id).filter((id) => !remoteById.has(id))];
  const merged: Entity[] = [];
  for (const id of order) {
    const slot = (map: Map<string, Entity>): Slot => (map.has(id) ? map.get(id)! : ABSENT);
    const value = mergeValue(`${path}[${id}]`, slot(baseById), slot(localById), slot(remoteById), conflicts);
    if (value !== ABSENT) merged.push(value as Entity);
  }
  return merged;
}

/** History is append-only on every device, so it merges as a union ordered newest first. */
function mergeHistory(local: HistoryEntry[], remote: HistoryEntry[]): HistoryEntry[] {
  const byId = new Map<string, HistoryEntry>();
  for (const entry of [...remote, ...local]) byId.set(entry.id, entry);
  return [...byId.values()].sort((a, b) => b.timestamp - a.timestamp).slice(0, HISTORY_LIMIT);
}

/**
 * Three-way merge of two edited copies of one character.
 *
 * @param base   the last version both sides agreed on (the last server revision this device saw),
 *               or `null` when there is no common ancestor
 * @param local  this device's version
 * @param remote the server's current version
 */
export function mergeCharacters(base: Character | null, local: Character, remote: Character): MergeResult {
  const conflicts: string[] = [];
  const withoutHistory = ({ history: _history, ...rest }: Character): JsonObject => rest;

  const merged = mergeObjects(
    '',
    base ? withoutHistory(base) : null,
    withoutHistory(local),
    withoutHistory(remote),
    conflicts,
  ) as Omit<Character, 'history'>;
  return {
    merged: { ...merged, history: mergeHistory(local.history, remote.history) },
    conflicts,
  };
}

/**
 * Undoes the edits that took a character from `before` to `after`, on its `current` version: a
 * three-way merge with `after` as the ancestor. A field changed since `after` (on another device) keeps
 * that change, also when the undone edits touched it too; the log entries `logIds` the edits wrote go.
 */
export function revertCharacter(
  before: Character,
  after: Character,
  current: Character,
  logIds: ReadonlySet<string> = new Set(),
): Character {
  const { merged } = mergeCharacters(after, current, before);
  return { ...merged, history: merged.history.filter((entry) => !logIds.has(entry.id)) };
}
