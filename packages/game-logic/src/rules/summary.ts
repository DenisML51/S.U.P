import type { Character, CharacterSummary } from '@itd/schema';
import { initiativeModifier } from './abilities';
import { armorClassOf } from './armor';
import { totalMaxHP } from './health';
import { cocMaxSanity } from '../coc/meta';

/** An investigator's numbers for the table: initiative is DEX, and sanity, magic and luck matter. */
const investigatorSummary = (character: Character): Pick<CharacterSummary, 'armorClass' | 'initiative' | 'coc'> => {
  const c = character.coc!;
  const skill = (id: string) => c.skills.find((s) => s.id === id)?.value ?? 0;
  const dex = c.characteristics.dex ?? 0;
  return {
    armorClass: 0,
    initiative: dex,
    coc: {
      sanity: character.sanity,
      maxSanity: cocMaxSanity(c),
      magicPoints: c.magicPoints,
      luck: c.luck,
      dex,
      dodge: skill('dodge'),
    },
  };
};

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
  ...(character.build?.ruleset === 'coc7' && character.coc ? investigatorSummary(character) : {}),
});
