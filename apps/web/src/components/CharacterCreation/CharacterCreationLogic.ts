import { useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  RACES, CLASSES, Skill,
  abilityModifier, buildNewCharacter, canDecrement as canDecrementScore, canIncrement as canIncrementScore,
  formatModifier, getProficiencyBonus, pointBuyCost, pointsUsed as pointsUsedFor, pointsRemaining as pointsRemainingFor,
  startingAttributes, startingSkills,
} from '../../types';
import { useCharacterStore } from '../../store/useCharacterStore';

export type Step = 'basic' | 'attributes' | 'skills';

export const useCharacterCreationLogic = (onComplete?: () => void) => {
  const { character, createCharacter } = useCharacterStore();
  
  const [currentStep, setCurrentStep] = useState<Step>('basic');
  const [name, setName] = useState(character?.name || '');
  const [race, setRace] = useState(character?.race || '');
  const [subrace, setSubrace] = useState(character?.subrace || '');
  const [charClass, setCharClass] = useState(character?.class || '');
  const [subclass, setSubclass] = useState(character?.subclass || '');
  const [isCustomRace, setIsCustomRace] = useState(false);
  const [isCustomSubrace, setIsCustomSubrace] = useState(false);
  const [isCustomClass, setIsCustomClass] = useState(false);
  const [isCustomSubclass, setIsCustomSubclass] = useState(false);
  const [level] = useState(character?.level || 1);
  const [experience] = useState(character?.experience || 0);
  const [speed, setSpeed] = useState(character?.speed || 30);
  const [attributes, setAttributes] = useState<{ [key: string]: number }>(character?.attributes || startingAttributes());
  const [skills, setSkills] = useState<Skill[]>(character?.skills ?? startingSkills());
  const [savingThrows, setSavingThrows] = useState<string[]>(
    character?.savingThrowProficiencies || []
  );
  const [languagesAndProficiencies, setLanguagesAndProficiencies] = useState(
    character?.languagesAndProficiencies || ''
  );
  const proficiencyBonus = getProficiencyBonus(level);
  
  const pointsUsed = pointsUsedFor(attributes);
  const pointsRemaining = pointsRemainingFor(attributes);

  const canIncrement = (attrId: string) => canIncrementScore(attributes, attrId);
  const canDecrement = (attrId: string) => canDecrementScore(attributes, attrId);
  
  const incrementAttribute = (attrId: string) => {
    if (canIncrement(attrId)) {
      setAttributes({ ...attributes, [attrId]: attributes[attrId] + 1 });
    }
  };
  
  const decrementAttribute = (attrId: string) => {
    if (canDecrement(attrId)) {
      setAttributes({ ...attributes, [attrId]: attributes[attrId] - 1 });
    }
  };
  
  const getModifier = (value: number) => formatModifier(abilityModifier(value));
  const getCost = pointBuyCost;
  
  const toggleSkillProficiency = (skillId: string) => {
    setSkills(skills.map(skill => 
      skill.id === skillId 
        ? { ...skill, proficient: !skill.proficient, expertise: false }
        : skill
    ));
  };
  
  const toggleSkillExpertise = (skillId: string) => {
    setSkills(skills.map(skill => 
      skill.id === skillId && skill.proficient
        ? { ...skill, expertise: !skill.expertise }
        : skill
    ));
  };

  const selectedClass = CLASSES.find((c) => c.id === charClass);
  const selectedRace = RACES.find((r) => r.id === race);
  
  const toggleSavingThrow = (attrId: string) => {
    if (savingThrows.includes(attrId)) {
      setSavingThrows(savingThrows.filter(id => id !== attrId));
    } else {
      setSavingThrows([...savingThrows, attrId]);
    }
  };

  const handleSave = async () => {
    const draft = buildNewCharacter({
      name,
      race,
      subrace,
      class: charClass,
      subclass,
      level,
      experience,
      speed,
      attributes,
      skills,
      savingThrowProficiencies: savingThrows,
      languagesAndProficiencies,
    });
    try {
      await createCharacter(draft);
      onComplete?.();
    } catch (error) {
      console.error('Failed to create character', error);
      toast.error('Не удалось создать персонажа');
    }
  };

  const selectedSubrace = selectedRace?.subraces?.find((sr) => sr.id === subrace);
  const isBasicValid = name.trim() !== '' && race !== '' && charClass !== '';
  const isAttributesValid = pointsRemaining === 0;
  const isFormValid = isBasicValid && isAttributesValid;

  return {
    currentStep, setCurrentStep,
    name, setName,
    race, setRace,
    subrace, setSubrace,
    charClass, setCharClass,
    subclass, setSubclass,
    isCustomRace, setIsCustomRace,
    isCustomSubrace, setIsCustomSubrace,
    isCustomClass, setIsCustomClass,
    isCustomSubclass, setIsCustomSubclass,
    speed, setSpeed,
    attributes, setAttributes,
    skills, setSkills,
    savingThrows, setSavingThrows,
    languagesAndProficiencies, setLanguagesAndProficiencies,
    pointsUsed, pointsRemaining,
    proficiencyBonus,
    selectedClass, selectedRace, selectedSubrace,
    isBasicValid, isAttributesValid, isFormValid,
    canIncrement, canDecrement,
    incrementAttribute, decrementAttribute,
    getModifier, getCost,
    toggleSkillProficiency, toggleSkillExpertise,
    toggleSavingThrow,
    handleSave
  };
};

