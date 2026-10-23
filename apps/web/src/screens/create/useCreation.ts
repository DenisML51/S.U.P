import { useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  CLASSES,
  RACES,
  buildNewCharacter,
  canDecrement,
  canIncrement,
  pointsRemaining,
  startingAttributes,
  startingSkills,
} from '@itd/game-logic';
import { DEFAULT_SETTING, type CharacterImages, type Setting, type Skill } from '@itd/schema';
import { useCharacterStore } from '../../store/useCharacterStore';

/**
 * A hero in the making: every choice of the creation screen and the rules that judge them.
 */
export function useCreation(onCreated: () => void) {
  const createCharacter = useCharacterStore((s) => s.createCharacter);
  const [setting, setSetting] = useState<Setting>(DEFAULT_SETTING);
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
  const raceInfo = RACES.find((r) => r.id === race);
  const classInfo = CLASSES.find((c) => c.id === characterClass);

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
      onCreated();
    } catch {
      toast.error('Не удалось создать героя');
      setCreating(false);
    }
  };

  return {
    setting,
    setSetting,
    name,
    setName,
    race,
    raceInfo,
    /** Choosing another listed race forgets a subrace that belongs to the old one; typing a
        race of one's own keeps the subrace typed beside it. */
    setRace: (value: string) => {
      if (RACES.some((r) => r.id === value || r.id === race)) setSubrace('');
      setRace(value);
    },
    subrace,
    setSubrace,
    characterClass,
    classInfo,
    setCharacterClass: (value: string) => {
      if (CLASSES.some((c) => c.id === value || c.id === characterClass)) setSubclass('');
      setCharacterClass(value);
    },
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
