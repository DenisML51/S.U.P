import 'fake-indexeddb/auto';
import { buildNewCharacter, isRuleSystemLoaded, startingAttributes, startingSkills } from '@itd/game-logic';
import { BuildSchema, createCharacterDocument } from '@itd/schema';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CharacterRepository } from '../src/data/local/characterRepository';
import { CharacterDatabase } from '../src/data/local/database';
import type { Workspace } from '../src/data/workspace';
import { useCharacterStore } from '../src/store/useCharacterStore';

let repository: CharacterRepository;
const store = () => useCharacterStore.getState();

beforeEach(async () => {
  repository = new CharacterRepository(new CharacterDatabase('rules'), 'rules');
  await store().attachWorkspace({ repository } as unknown as Workspace);
});

afterEach(async () => {
  await store().attachWorkspace(null);
  repository.close();
});

describe('rules systems on demand', () => {
  it('loads a preset hero’s rules before the sheet opens, and writes the build onto it', async () => {
    const build = BuildSchema.parse({ ruleset: 'dnd2024', class: 'fighter', species: 'human', background: 'soldier' });
    const hero = createCharacterDocument({
      ...buildNewCharacter({
        name: 'Воин',
        race: 'human',
        class: 'fighter',
        subclass: '',
        attributes: startingAttributes(),
        skills: startingSkills(),
        savingThrowProficiencies: [],
      }),
      build,
    });
    await repository.create(hero);
    expect(isRuleSystemLoaded('dnd2024')).toBe(false);

    await store().loadCharacter(hero.id);

    expect(isRuleSystemLoaded('dnd2024')).toBe(true);
    expect(store().character?.id).toBe(hero.id);
    expect(store().character?.traits.some((trait) => trait.grant)).toBe(true);
  });
});
