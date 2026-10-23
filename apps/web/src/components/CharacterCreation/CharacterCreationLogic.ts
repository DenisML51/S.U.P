import { useState } from 'react';
import { 
  Character, RACES, CLASSES, ATTRIBUTES_LIST, SKILLS_LIST, 
  INITIAL_POINTS, ATTRIBUTE_START, ATTRIBUTE_MIN, ATTRIBUTE_MAX, 
  POINT_BUY_COSTS, getProficiencyBonus, calculateMaxSanity, 
  getDefaultLimbs, Race, Class, Subrace, Skill
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
  const [attributes, setAttributes] = useState<{ [key: string]: number }>(
    character?.attributes || 
    ATTRIBUTES_LIST.reduce((acc, attr) => ({ ...acc, [attr.id]: ATTRIBUTE_START }), {})
  );
  const [skills, setSkills] = useState<Skill[]>(
    (character?.skills && Array.isArray(character.skills)) ? character.skills : 
    SKILLS_LIST.map(skill => ({ ...skill, proficient: false, expertise: false }))
  );
  const [savingThrows, setSavingThrows] = useState<string[]>(
    character?.savingThrowProficiencies || []
  );
  const [languagesAndProficiencies, setLanguagesAndProficiencies] = useState(
    character?.languagesAndProficiencies || ''
  );
  const proficiencyBonus = getProficiencyBonus(level);
  
  const calculatePointsUsed = () => {
    return Object.values(attributes).reduce((total, value) => {
      return total + POINT_BUY_COSTS[value];
    }, 0);
  };
  
  const pointsUsed = calculatePointsUsed();
  const pointsRemaining = INITIAL_POINTS - pointsUsed;
  
  const canIncrement = (attrId: string) => {
    const currentValue = attributes[attrId];
    if (currentValue >= ATTRIBUTE_MAX) return false;
    const nextValue = currentValue + 1;
    const costDiff = POINT_BUY_COSTS[nextValue] - POINT_BUY_COSTS[currentValue];
    return pointsRemaining >= costDiff;
  };
  
  const canDecrement = (attrId: string) => {
    return attributes[attrId] > ATTRIBUTE_MIN;
  };
  
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
  
  const getModifier = (value: number) => {
    const mod = Math.floor((value - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  const getCost = (value: number) => {
    return POINT_BUY_COSTS[value];
  };
  
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

  const selectedClass = CLASSES.find((c: Class) => c.id === charClass);
  const selectedRace = RACES.find((r: Race) => r.id === race);
  
  const toggleSavingThrow = (attrId: string) => {
    if (savingThrows.includes(attrId)) {
      setSavingThrows(savingThrows.filter(id => id !== attrId));
    } else {
      setSavingThrows([...savingThrows, attrId]);
    }
  };

  const handleSave = () => {
    const maxSanity = calculateMaxSanity(charClass, attributes.wisdom || 10, level);
    const constitutionMod = Math.floor(((attributes.constitution || 10) - 10) / 2);
    const initialMaxHP = 10 + constitutionMod;
    const dexMod = Math.floor(((attributes.dexterity || 10) - 10) / 2);
    const baseAC = 10 + dexMod;
    const limbs = getDefaultLimbs(initialMaxHP, attributes.constitution || 10, baseAC);
    
    const newCharacter: Character = {
      name,
      race,
      subrace: subrace || undefined,
      class: charClass,
      subclass,
      level,
      experience,
      speed,
      armorClass: baseAC,
      sanity: maxSanity,
      currentHP: initialMaxHP,
      maxHP: initialMaxHP,
      tempHP: 0,
      maxHPBonus: 0,
      limbs,
      resistances: [],
      inventory: [],
      inventoryNotes: '',
      attacksNotes: '',
      equipmentNotes: '',
      abilitiesNotes: '',
      attacks: [],
      abilities: [],
      spells: [],
      spellsNotes: '',
      knownSchools: [],
      maxPreparedSpells: {},
      attributes,
      attributeBonuses: {},
      skills,
      proficiencyBonus,
      savingThrowProficiencies: savingThrows,
      resources: [],
      currency: { copper: 0, silver: 0, gold: 0 },
      languagesAndProficiencies,
      appearance: '',
      backstory: '',
      alignment: '',
      alliesAndOrganizations: '',
      personalityTraits: '',
      ideals: '',
      bonds: '',
      flaws: '',
      traits: [],
      conditions: [],
    };
    createCharacter(newCharacter);
    if (onComplete) {
      onComplete();
    }
  };
  
  const selectedSubrace = selectedRace?.subraces?.find((sr: Subrace) => sr.id === subrace);
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

