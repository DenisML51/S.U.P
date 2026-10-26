import {
  CHARACTER_SCHEMA_VERSION,
  CharacterSchema,
  type Character,
  type CharacterDraft,
  type CharacterImages,
  type Resistance,
  type RulesetId,
  type Setting,
} from './character';
import { randomId } from './id';

/** What the character list needs; derived from the document, never stored separately. */
export interface CharacterPreview {
  id: string;
  name: string;
  setting?: Setting;
  race: string;
  subrace?: string;
  class: string;
  subclass: string;
  level: number;
  currentHP: number;
  /** The whole maximum, the sheet's bonus included (as game-logic's `totalMaxHP`). */
  maxHP: number;
  images?: CharacterImages;
  /** Legacy embedded portrait. */
  avatar?: string;
  resistances?: Resistance[];
  /** Rules system of a preset hero; absent for the player's own. */
  ruleset?: RulesetId;
  /** A Call of Cthulhu investigator's card shows age and sanity instead of a level. */
  investigator?: { age: number; sanity: number; maxSanity: number; pulp: boolean };
}

/** Sanity can never rise above 99 less Cthulhu Mythos (kept in step with game-logic's `cocMaxSanity`). */
const investigatorOf = (character: Character): CharacterPreview['investigator'] =>
  character.build?.ruleset === 'coc7'
    ? {
        age: character.build.age,
        pulp: character.build.variant === 'pulp',
        sanity: character.sanity,
        maxSanity: Math.max(0, 99 - (character.coc?.skills.find((s) => s.id === 'cthulhu-mythos')?.value ?? 0)),
      }
    : undefined;

export const toCharacterPreview = (character: Character): CharacterPreview => ({
  id: character.id,
  name: character.name,
  setting: character.setting,
  race: character.race,
  subrace: character.subrace,
  class: character.class,
  subclass: character.subclass,
  level: character.level,
  currentHP: character.currentHP,
  maxHP: character.maxHP + character.maxHPBonus,
  images: character.images,
  avatar: character.avatar,
  resistances: character.resistances,
  ruleset: character.build?.ruleset,
  investigator: investigatorOf(character),
});

export const newCharacterId = (): string => randomId();

/** Gives a draft its identity and validates it, producing a storable document. */
export const createCharacterDocument = (draft: CharacterDraft, id: string = newCharacterId()): Character =>
  CharacterSchema.parse({ ...draft, id, schemaVersion: CHARACTER_SCHEMA_VERSION });
