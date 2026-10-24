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
import { clearDraft } from './useDraftState';

/**
 * A hero of one's own in the making (race, class and the rest typed by the player): every choice
 * of the creation screen and the rules that judge them.
 */
export function useCreation(setting: Setting, onCreated: () => void) {
  const createCharacter = useCharacterStore((s) => s.createCharacter);
  const [name, setName] = useState('');
  const [race, setRace] = useState('');
  const [subrace, setSubrace] = useState('');
  const [characterClass, setCharacterClass] = useState('');
  const [subclass, setSubclass] = useState('');
  const [attributes, setAttributes] = useState<Record<string, number>>(startingAttributes);
  const [skills, setSkills] = useState<Skill[]>(startingSkills);
  const [savingThrows, setSavingThrows] = useState<string[]>([]);
  const [images, setImages] = useState<CharacterImages>({});
  const [creating, setCreating] = useState(false);

  const points = pointsRemaining(attributes);

  const valid = {
    origin: race.trim() !== '' && characterClass.trim() !== '',
    attributes: points === 0,
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
