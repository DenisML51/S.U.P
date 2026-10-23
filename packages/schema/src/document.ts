import {
  CHARACTER_SCHEMA_VERSION,
  CharacterSchema,
  type Character,
  type CharacterDraft,
  type CharacterImages,
  type Resistance,
  type Setting,
} from './character';

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
  maxHP: number;
  images?: CharacterImages;
  /** Legacy embedded portrait. */
  avatar?: string;
  resistances?: Resistance[];
}

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
  maxHP: character.maxHP,
  images: character.images,
  avatar: character.avatar,
  resistances: character.resistances,
});

export const newCharacterId = (): string => crypto.randomUUID();

/** Gives a draft its identity and validates it, producing a storable document. */
export const createCharacterDocument = (draft: CharacterDraft, id: string = newCharacterId()): Character =>
  CharacterSchema.parse({ ...draft, id, schemaVersion: CHARACTER_SCHEMA_VERSION });
