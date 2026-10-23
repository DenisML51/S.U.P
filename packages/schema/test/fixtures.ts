import { CharacterSchema, type Character } from '../src';

/** A sheet as the desktop app (schema v0) stored it, including the quirks found in real saves. */
export const legacySheet = () => ({
  id: 'char_1766567264309_hc64nwe7u',
  name: 'Марнеус Калгар',
  race: 'human',
  subrace: 'northerner',
  class: 'warrior',
  subclass: 'champion',
  level: 2,
  experience: 350,
  speed: 30,
  armorClass: 16,
  sanity: '45',
  currentHP: 20,
  maxHP: 20,
  tempHP: 0,
  maxHPBonus: 0,
  limbs: [
    { id: 'head', name: 'Голова', currentHP: 9, maxHP: 9, ac: 2 },
    { id: 'torso', name: 'Торс', currentHP: null, maxHP: 9, ac: 4 },
  ],
  resistances: [{ id: 'r1', type: 'Огонь', level: 'resistance' }],
  inventory: [
    {
      id: 'item_1',
      name: 'Кольчуга',
      type: 'armor',
      equipped: true,
      weight: 20,
      cost: 50,
      description: '',
      baseAC: 16,
      dexModifier: false,
      maxDexModifier: null,
      effect: 'Помеха на скрытность',
    },
  ],
  attacks: [{ id: 'a1', name: 'Меч', damage: '1d8', damageType: 'Рубящий', hitBonus: 5 }],
  abilities: [],
  spells: [{ id: 's1', name: 'Щит', level: 1, prepared: true, resourceCost: 1 }],
  attributes: { strength: 16, dexterity: 12, constitution: 14, intelligence: 10, wisdom: 13, charisma: 8 },
  attributeBonuses: {},
  skills: [{ id: 'athletics', name: 'Атлетика', attribute: 'strength', proficient: true, expertise: false }],
  proficiencyBonus: 2,
  savingThrowProficiencies: ['strength'],
  resources: [{ id: 'res1', name: 'Второе дыхание', iconName: 'Heart', current: 'oops', max: 1, description: '' }],
  currency: { copper: 0, silver: 5, gold: 12 },
  history: [{ id: 'log_1', timestamp: 1766635328201, message: 'Получен урон: -3 HP (17/20)', type: 'health' }],
  meta: { source: 'Warhammer 40k', version: '1.0' },
});

let counter = 0;

/** A valid current-version character with a unique id. */
export const makeCharacter = (overrides: Partial<Character> = {}): Character =>
  CharacterSchema.parse({
    schemaVersion: 1,
    id: `test_${++counter}`,
    name: 'Тестовый герой',
    attributes: { strength: 10, dexterity: 14, constitution: 12, intelligence: 10, wisdom: 10, charisma: 10 },
    ...overrides,
  });
