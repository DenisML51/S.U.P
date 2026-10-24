import 'fake-indexeddb/auto';
import { buildNewCharacter, startingAttributes, startingSkills } from '@itd/game-logic';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CharacterRepository } from '../src/data/local/characterRepository';
import { CharacterDatabase } from '../src/data/local/database';
import type { Workspace } from '../src/data/workspace';
import { UNDO_LIMIT, useCharacterStore } from '../src/store/useCharacterStore';

let counter = 0;
let repository: CharacterRepository;
const store = () => useCharacterStore.getState();
const character = () => store().character!;

const draft = () =>
  buildNewCharacter({
    name: 'Эйзенхорн',
    race: '',
    class: '',
    subclass: '',
    attributes: startingAttributes(),
    skills: startingSkills(),
    savingThrowProficiencies: [],
  });

/** Waits until the stored copy satisfies the check: writes reach IndexedDB in the background. */
const stored = (check: (doc: NonNullable<Awaited<ReturnType<CharacterRepository['get']>>>) => void) =>
  vi.waitFor(async () => check((await repository.get(character().id))!));

beforeEach(async () => {
  const name = `store-${++counter}`;
  repository = new CharacterRepository(new CharacterDatabase(name), name);
  await store().attachWorkspace({ repository } as unknown as Workspace);
  await store().createCharacter(draft());
});

afterEach(async () => {
  await store().attachWorkspace(null);
  repository.close();
});

const damage = (hp: number, message = `Урон — ${hp}`) =>
  store().updateCharacter((doc) => ({ ...doc, currentHP: hp }), { log: { message, type: 'health' } });

describe('undo', () => {
  it('takes back the last edit with its log entry, on screen and in storage', async () => {
    const hp = character().currentHP;
    damage(3);
    expect(store().undoable).toHaveLength(1);

    store().undo();

    expect(character().currentHP).toBe(hp);
    expect(character().history).toEqual([]);
    expect(store().undoable).toEqual([]);
    await stored((doc) => expect(doc.currentHP).toBe(hp));
  });

  it('takes back a chosen edit and everything after it', async () => {
    const hp = character().currentHP;
    damage(9);
    const [first] = store().undoable;
    damage(7);
    damage(5);

    store().undo(first);

    expect(character().currentHP).toBe(hp);
    expect(store().undoable).toEqual([]);
  });

  it('keeps a change another device made since', async () => {
    const hp = character().currentHP;
    damage(4);
    await stored((doc) => expect(doc.currentHP).toBe(4));
    await repository.update(character().id, (doc) => ({ ...doc, sanity: 1 }));

    store().undo();

    await stored((doc) => expect(doc).toMatchObject({ currentHP: hp, sanity: 1 }));
  });

  it(`keeps the last ${UNDO_LIMIT} edits`, () => {
    for (let i = 0; i < UNDO_LIMIT + 5; i += 1) damage(i + 1);
    expect(store().undoable).toHaveLength(UNDO_LIMIT);
  });

  it('does not stack log lines or changes that change nothing', () => {
    store().logHistory('Бросок: 12');
    store().updateCharacter((doc) => doc);
    expect(store().undoable).toEqual([]);
  });
});
