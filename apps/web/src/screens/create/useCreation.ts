import { useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  buildNewCharacter,
  canDecrement,
  canIncrement,
  pointsRemaining,
  startingAttributes,
  startingSkills,
} from '@itd/game-logic';
import type { CharacterImages, Setting, Skill } from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';
import { useClearDraft, useDraftState } from './useDraftState';

/** How the six scores are made: 27 points, 4d6 with the lowest dropped, or typed in as agreed. */
export type ScoreMethod = 'pointBuy' | 'roll' | 'manual';

/**
 * A hero of one's own in the making (race, class and the rest typed by the player): every choice
 * of the creation screen and the rules that judge them. The choices are kept as a draft until the
 * hero is made; their keys stand apart from the D&D path's, which is drafted alongside.
 */
export function useCreation(setting: Setting, onCreated: () => void) {
  const createCharacter = useCharacterStore((s) => s.createCharacter);
  const clearDraft = useClearDraft();
  const [name, setName] = useDraftState('custom.name', '');
  const [race, setRace] = useDraftState('custom.race', '');
  const [subrace, setSubrace] = useDraftState('custom.subrace', '');
  const [characterClass, setCharacterClass] = useDraftState('custom.class', '');
  const [subclass, setSubclass] = useDraftState('custom.subclass', '');
  const [attributes, setAttributes] = useDraftState<Record<string, number>>('custom.attributes', startingAttributes);
  const [method, setMethodState] = useDraftState<ScoreMethod>('custom.method', 'pointBuy');
  /** The scores came from a throw (in roll mode the step waits for one). */
  const [rolled, setRolled] = useDraftState('custom.rolled', false);
  const [skills, setSkills] = useDraftState<Skill[]>('custom.skills', startingSkills);
  const [savingThrows, setSavingThrows] = useDraftState<string[]>('custom.saves', []);
  const [images, setImages] = useDraftState<CharacterImages>('custom.images', {});
  const [creating, setCreating] = useState(false);

  const points = pointsRemaining(attributes);

  const valid = {
    origin: race.trim() !== '' && characterClass.trim() !== '',
    attributes:
      method === 'pointBuy'
        ? points === 0
        : method === 'roll'
          ? rolled
          : Object.values(attributes).every((v) => v >= 3 && v <= 20),
    identity: name.trim() !== '',
  };

  const draft = () =>
    buildNewCharacter({
      name: name || 'Безымянный',
      race,
      subrace,
      class: characterClass,
      subclass,
      attributes,
      skills,
      savingThrowProficiencies: savingThrows,
    });

  const create = async () => {
    if (!valid.origin || !valid.attributes || !valid.identity) return;
    setCreating(true);
    try {
      await createCharacter({
        ...draft(),
        setting,
        images: images.full || images.portrait ? images : undefined,
      });
      clearDraft();
      onCreated();
    } catch {
      toast.error('Не удалось создать героя');
      setCreating(false);
    }
  };

  return {
    name,
    setName,
    race,
    setRace,
    subrace,
    setSubrace,
    characterClass,
    setCharacterClass,
    subclass,
    setSubclass,
    attributes,
    points,
    method,
    setMethod: (next: ScoreMethod) => {
      setMethodState(next);
      setRolled(false);
      if (next === 'pointBuy') setAttributes(startingAttributes());
    },
    rolled,
    /** Sets the scores of a throw (in the order of the attribute list). */
    setRolledScores: (values: Record<string, number>) => {
      setAttributes(values);
      setRolled(true);
    },
    /** Sets one score outright: typed in, or swapped with another after a throw. */
    setScores: setAttributes,
    canRaise: (id: string) => canIncrement(attributes, id),
    canLower: (id: string) => canDecrement(attributes, id),
    raise: (id: string) =>
      canIncrement(attributes, id) && setAttributes({ ...attributes, [id]: attributes[id]! + 1 }),
    lower: (id: string) =>
      canDecrement(attributes, id) && setAttributes({ ...attributes, [id]: attributes[id]! - 1 }),
    skills,
    toggleSkill: (id: string) =>
      setSkills(skills.map((s) => (s.id === id ? { ...s, proficient: !s.proficient, expertise: false } : s))),
    savingThrows,
    toggleSave: (id: string) =>
      setSavingThrows(
        savingThrows.includes(id) ? savingThrows.filter((s) => s !== id) : [...savingThrows, id],
      ),
    images,
    setImages,
    valid,
    /** The sheet as it would be created now, for previews of hit points, armour and sanity. */
    preview: draft,
    create,
    creating,
  };
}

export type Creation = ReturnType<typeof useCreation>;
