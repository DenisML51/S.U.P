import type { Character, CharacterSummary } from '@itd/schema';
import { initiativeModifier } from './abilities';
import { armorClassOf } from './armor';
import { totalMaxHP } from './health';

/** What a party shows of a hero, computed on the server whenever the sheet is saved. */
export const summarizeCharacter = (character: Character): CharacterSummary => ({
  setting: character.setting,
  race: character.race,
  subrace: character.subrace,
  class: character.class,
  subclass: character.subclass,
  level: character.level,
  portrait: character.images?.portrait ?? character.images?.full,
  currentHP: character.currentHP,
  maxHP: totalMaxHP(character),
  tempHP: character.tempHP,
  armorClass: armorClassOf(character),
  initiative: initiativeModifier(character),
  conditions: character.conditions,
});
