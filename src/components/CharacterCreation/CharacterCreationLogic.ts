import { useMemo, useState } from 'react';
import {
  ATTRIBUTES_LIST,
  SKILLS_LIST,
  INITIAL_POINTS,
  ATTRIBUTE_START,
  ATTRIBUTE_MIN,
  ATTRIBUTE_MAX,
  POINT_BUY_COSTS,
  getProficiencyBonus,
  Skill,
} from '../../types';
import { useCharacterStore } from '../../store/useCharacterStore';
import { buildCharacterApi } from '../../api/characters';

export type Step = 'identity' | 'origin' | 'coreStats' | 'proficiencies' | 'finalize';
export type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

export interface PresetOption {
  id: string;
  labelKey: string;
  descriptionKey: string;
  tagKeys?: string[];
}

export const RACE_PRESETS: PresetOption[] = [
  {
    id: 'human',
    labelKey: 'creation.preset.race.human.label',
    descriptionKey: 'creation.preset.race.human.description',
    tagKeys: ['creation.preset.tag.balanced', 'creation.preset.tag.social'],
  },
  {
    id: 'elf',
    labelKey: 'creation.preset.race.elf.label',
    descriptionKey: 'creation.preset.race.elf.description',
    tagKeys: ['creation.preset.tag.agility', 'creation.preset.tag.magic'],
  },
  {
    id: 'dwarf',
    labelKey: 'creation.preset.race.dwarf.label',
    descriptionKey: 'creation.preset.race.dwarf.description',
    tagKeys: ['creation.preset.tag.durable', 'creation.preset.tag.defense'],
  },
  {
    id: 'halfling',
    labelKey: 'creation.preset.race.halfling.label',
    descriptionKey: 'creation.preset.race.halfling.description',
    tagKeys: ['creation.preset.tag.stealth', 'creation.preset.tag.luck'],
  },
  {
    id: 'tiefling',
    labelKey: 'creation.preset.race.tiefling.label',
    descriptionKey: 'creation.preset.race.tiefling.description',
    tagKeys: ['creation.preset.tag.charisma', 'creation.preset.tag.arcane'],
  },
];

export const CLASS_PRESETS: PresetOption[] = [
  {
    id: 'fighter',
    labelKey: 'creation.preset.class.fighter.label',
    descriptionKey: 'creation.preset.class.fighter.description',
    tagKeys: ['creation.preset.tag.melee', 'creation.preset.tag.durable'],
  },
  {
    id: 'rogue',
    labelKey: 'creation.preset.class.rogue.label',
    descriptionKey: 'creation.preset.class.rogue.description',
    tagKeys: ['creation.preset.tag.stealth', 'creation.preset.tag.burst'],
  },
  {
    id: 'cleric',
    labelKey: 'creation.preset.class.cleric.label',
    descriptionKey: 'creation.preset.class.cleric.description',
    tagKeys: ['creation.preset.tag.support', 'creation.preset.tag.healing'],
  },
  {
    id: 'wizard',
    labelKey: 'creation.preset.class.wizard.label',
    descriptionKey: 'creation.preset.class.wizard.description',
    tagKeys: ['creation.preset.tag.magic', 'creation.preset.tag.control'],
  },
  {
    id: 'ranger',
    labelKey: 'creation.preset.class.ranger.label',
    descriptionKey: 'creation.preset.class.ranger.description',
    tagKeys: ['creation.preset.tag.ranged', 'creation.preset.tag.utility'],
  },
];

const RECOMMENDED_SKILLS_BY_CLASS: Record<string, string[]> = {
  fighter: ['athletics', 'intimidation', 'survival'],
  rogue: ['stealth', 'sleightOfHand', 'acrobatics', 'deception'],
  cleric: ['insight', 'medicine', 'religion'],
  wizard: ['arcana', 'history', 'investigation'],
  ranger: ['survival', 'perception', 'nature', 'animalHandling'],
};

const CLASS_ID_ALIASES: Record<string, string[]> = {
  fighter: ['fighter', 'воин'],
  rogue: ['rogue', 'плут'],
  cleric: ['cleric', 'жрец'],
  wizard: ['wizard', 'волшебник'],
  ranger: ['ranger', 'следопыт'],
};

const STEP_ORDER: Step[] = ['identity', 'origin', 'coreStats', 'proficiencies', 'finalize'];

const normalizeForLookup = (value: string) => value.trim().toLowerCase();

export const useCharacterCreationLogic = (onComplete?: () => void) => {
  const { character, applyServerCharacter } = useCharacterStore();

  const [currentStep, setCurrentStep] = useState<Step>('identity');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [createdCharacterId, setCreatedCharacterId] = useState<string | null>(null);

  const [name, setName] = useState(character?.name || '');
  const [concept, setConcept] = useState('');
  const [avatar, setAvatar] = useState(character?.avatar || '');
  const [race, setRace] = useState(character?.race || '');
  const [subrace, setSubrace] = useState(character?.subrace || '');
  const [charClass, setCharClass] = useState(character?.class || '');
  const [subclass, setSubclass] = useState(character?.subclass || '');
  const [level] = useState(character?.level || 1);
  const [speed, setSpeed] = useState(character?.speed || 30);
  const [attributes, setAttributes] = useState<{ [key: string]: number }>(
    character?.attributes || ATTRIBUTES_LIST.reduce((acc, attr) => ({ ...acc, [attr.id]: ATTRIBUTE_START }), {})
  );
  const [skills, setSkills] = useState<Skill[]>(
    character?.skills && Array.isArray(character.skills)
      ? character.skills
      : SKILLS_LIST.map((skill) => ({ ...skill, proficient: false, expertise: false }))
  );
  const [savingThrows, setSavingThrows] = useState<string[]>(character?.savingThrowProficiencies || []);
  const [languagesAndProficiencies, setLanguagesAndProficiencies] = useState(character?.languagesAndProficiencies || '');

  const proficiencyBonus = getProficiencyBonus(level);

  const pointsUsed = Object.values(attributes).reduce((total, value) => total + POINT_BUY_COSTS[value], 0);
  const pointsRemaining = INITIAL_POINTS - pointsUsed;
  const isIdentityValid = name.trim() !== '';
  const isOriginValid = race.trim() !== '' && charClass.trim() !== '';
  const isCoreStatsValid = pointsRemaining === 0;
  const isProficienciesValid = true;
  const isFormValid = isIdentityValid && isOriginValid && isCoreStatsValid && isProficienciesValid;
  const isCompleted = saveStatus === 'success';

  const classKey = normalizeForLookup(charClass);
  const recommendedSkills = useMemo(() => {
    const direct = RECOMMENDED_SKILLS_BY_CLASS[classKey];
    if (direct) return direct;
    const matchedId =
      Object.entries(CLASS_ID_ALIASES).find(([, aliases]) => aliases.some((alias) => normalizeForLookup(alias) === classKey))
        ?.[0] || null;
    if (!matchedId) return [];
    return RECOMMENDED_SKILLS_BY_CLASS[matchedId] || [];
  }, [classKey]);

  const canIncrement = (attrId: string) => {
    const currentValue = attributes[attrId];
    if (currentValue >= ATTRIBUTE_MAX) return false;
    const nextValue = currentValue + 1;
    const costDiff = POINT_BUY_COSTS[nextValue] - POINT_BUY_COSTS[currentValue];
    return pointsRemaining >= costDiff;
  };

  const canDecrement = (attrId: string) => attributes[attrId] > ATTRIBUTE_MIN;

  const incrementAttribute = (attrId: string) => {
    if (!canIncrement(attrId)) return;
    setAttributes((prev) => ({ ...prev, [attrId]: prev[attrId] + 1 }));
  };

  const decrementAttribute = (attrId: string) => {
    if (!canDecrement(attrId)) return;
    setAttributes((prev) => ({ ...prev, [attrId]: prev[attrId] - 1 }));
  };

  const getModifier = (value: number) => {
    const mod = Math.floor((value - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  const getCost = (value: number) => POINT_BUY_COSTS[value];

  const toggleSkillProficiency = (skillId: string) => {
    setSkills((prev) =>
      prev.map((skill) => (skill.id === skillId ? { ...skill, proficient: !skill.proficient, expertise: false } : skill))
    );
  };

  const toggleSkillExpertise = (skillId: string) => {
    setSkills((prev) =>
      prev.map((skill) => (skill.id === skillId && skill.proficient ? { ...skill, expertise: !skill.expertise } : skill))
    );
  };

  const toggleSavingThrow = (attrId: string) => {
    setSavingThrows((prev) => (prev.includes(attrId) ? prev.filter((id) => id !== attrId) : [...prev, attrId]));
  };

  const stepRequirements = {
    identity: [{ key: 'name', met: isIdentityValid }],
    origin: [
      { key: 'race', met: race.trim() !== '' },
      { key: 'class', met: charClass.trim() !== '' },
    ],
    coreStats: [{ key: 'points', met: isCoreStatsValid }],
    proficiencies: [],
    finalize: [
      { key: 'identity', met: isIdentityValid },
      { key: 'origin', met: isOriginValid },
      { key: 'coreStats', met: isCoreStatsValid },
    ],
  };

  const canAccessStep = (step: Step) => {
    if (step === 'identity') return true;
    if (step === 'origin') return isIdentityValid;
    if (step === 'coreStats') return isIdentityValid && isOriginValid;
    if (step === 'proficiencies') return isIdentityValid && isOriginValid && isCoreStatsValid;
    if (step === 'finalize') return isIdentityValid && isOriginValid && isCoreStatsValid;
    return false;
  };

  const getStepBlockingReason = (step: Step) => {
    if (canAccessStep(step)) return null;
    if (step === 'origin') return 'creation.blocking.origin';
    if (step === 'coreStats') return 'creation.blocking.coreStats';
    if (step === 'proficiencies') return 'creation.blocking.proficiencies';
    if (step === 'finalize') return 'creation.blocking.finalize';
    return null;
  };

  const goNext = () => {
    const index = STEP_ORDER.indexOf(currentStep);
    if (index === -1 || index >= STEP_ORDER.length - 1) return;
    const nextStep = STEP_ORDER[index + 1];
    if (!canAccessStep(nextStep)) return;
    setCurrentStep(nextStep);
  };

  const goBack = () => {
    const index = STEP_ORDER.indexOf(currentStep);
    if (index <= 0) return;
    setCurrentStep(STEP_ORDER[index - 1]);
  };

  const handleSave = async () => {
    if (!isFormValid || saveStatus === 'saving') return false;
    try {
      setSaveStatus('saving');
      setSaveError(null);
      const result = await buildCharacterApi({
        name: name.trim(),
        race: race.trim(),
        subrace: subrace.trim() || undefined,
        class: charClass.trim(),
        subclass: subclass.trim() || undefined,
        avatar: avatar || undefined,
        concept: concept.trim(),
        speed,
        attributes,
        skills,
        savingThrowProficiencies: savingThrows,
        languagesAndProficiencies,
      });
      applyServerCharacter(result.character);
      setCreatedCharacterId(result.character.id!);
      setSaveStatus('success');
      return true;
    } catch (error) {
      console.error('Character creation failed:', error);
      setSaveStatus('error');
      setSaveError(error instanceof Error ? error.message : 'Failed to create character.');
      return false;
    }
  };

  const finishCreation = () => {
    if (onComplete) onComplete();
  };

  const resetSaveError = () => {
    if (saveStatus !== 'error') return;
    setSaveStatus('idle');
    setSaveError(null);
  };

  return {
    currentStep,
    setCurrentStep,
    goNext,
    goBack,
    canAccessStep,
    getStepBlockingReason,
    stepRequirements,

    saveStatus,
    saveError,
    createdCharacterId,
    isCompleted,
    finishCreation,
    resetSaveError,

    name,
    setName,
    concept,
    setConcept,
    avatar,
    setAvatar,
    race,
    setRace,
    subrace,
    setSubrace,
    charClass,
    setCharClass,
    subclass,
    setSubclass,
    speed,
    setSpeed,
    attributes,
    setAttributes,
    skills,
    setSkills,
    savingThrows,
    setSavingThrows,
    languagesAndProficiencies,
    setLanguagesAndProficiencies,

    pointsUsed,
    pointsRemaining,
    proficiencyBonus,

    isIdentityValid,
    isOriginValid,
    isCoreStatsValid,
    isProficienciesValid,
    isFormValid,

    canIncrement,
    canDecrement,
    incrementAttribute,
    decrementAttribute,
    getModifier,
    getCost,
    toggleSkillProficiency,
    toggleSkillExpertise,
    toggleSavingThrow,
    handleSave,

    racePresets: RACE_PRESETS,
    classPresets: CLASS_PRESETS,
    recommendedSkills,
  };
};

