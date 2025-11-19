import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, User, Sparkles, Shield, Zap, TrendingUp, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Character, RACES, CLASSES, ATTRIBUTES_LIST, SKILLS_LIST, INITIAL_POINTS, ATTRIBUTE_START, ATTRIBUTE_MIN, ATTRIBUTE_MAX, POINT_BUY_COSTS, getProficiencyBonus, calculateMaxSanity, getDefaultLimbs } from '../types';
import { useCharacter } from '../context/CharacterContext';

interface CharacterCreationProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

type Step = 'basic' | 'attributes' | 'skills';

export const CharacterCreation: React.FC<CharacterCreationProps> = ({ onComplete, onCancel }) => {
  const { character, createCharacter } = useCharacter();
  
  const [currentStep, setCurrentStep] = useState<Step>('basic');
  const [name, setName] = useState(character?.name || '');
  const [race, setRace] = useState(character?.race || '');
  const [subrace, setSubrace] = useState(character?.subrace || '');
  const [charClass, setCharClass] = useState(character?.class || '');
  const [subclass, setSubclass] = useState(character?.subclass || '');
  const [level] = useState(character?.level || 1);
  const [experience] = useState(character?.experience || 0);
  const [speed, setSpeed] = useState(character?.speed || 30);
  const [attributes, setAttributes] = useState<{ [key: string]: number }>(
    character?.attributes || 
    ATTRIBUTES_LIST.reduce((acc, attr) => ({ ...acc, [attr.id]: ATTRIBUTE_START }), {})
  );
  const [skills, setSkills] = useState(
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

  const selectedClass = CLASSES.find(c => c.id === charClass);
  const selectedRace = RACES.find(r => r.id === race);
  
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
      inventory: [],
      inventoryNotes: '',
      attacksNotes: '',
      equipmentNotes: '',
      abilitiesNotes: '',
      attacks: [],
      abilities: [],
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
    };
    createCharacter(newCharacter);
    if (onComplete) {
      onComplete();
    }
  };
  
  const selectedSubrace = selectedRace?.subraces?.find(sr => sr.id === subrace);
  const isBasicValid = name.trim() !== '' && race !== '' && (!selectedRace?.subraces || subrace !== '') && charClass !== '' && subclass !== '';
  const isAttributesValid = pointsRemaining === 0;
  const isFormValid = isBasicValid && isAttributesValid;

  const steps = [
    { id: 'basic', label: 'Основное', icon: User },
    { id: 'attributes', label: 'Характеристики', icon: TrendingUp },
    { id: 'skills', label: 'Навыки', icon: Zap },
  ];

  return (
    <div className="min-h-screen p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Создание Персонажа
              </h1>
              <p className="text-gray-400">Создайте нового персонажа для вашего приключения</p>
            </div>
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-dark-card border border-dark-border rounded-xl hover:bg-dark-hover transition-all flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Отмена
              </button>
            )}
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-4 mb-6">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = 
                (step.id === 'basic' && isBasicValid) ||
                (step.id === 'attributes' && isAttributesValid) ||
                (step.id === 'skills');
              const canAccess = 
                step.id === 'basic' ||
                (step.id === 'attributes' && isBasicValid) ||
                (step.id === 'skills' && isBasicValid && isAttributesValid);

              return (
                <React.Fragment key={step.id}>
                  <button
                    onClick={() => canAccess && setCurrentStep(step.id as Step)}
                    disabled={!canAccess}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                        : isCompleted
                        ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                        : canAccess
                        ? 'bg-dark-card border border-dark-border hover:bg-dark-hover text-gray-300'
                        : 'bg-dark-bg border border-dark-border opacity-50 cursor-not-allowed text-gray-500'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-semibold text-sm">{step.label}</span>
                    {isCompleted && !isActive && <CheckCircle2 className="w-4 h-4" />}
                  </button>
                  {index < steps.length - 1 && (
                    <div className={`h-0.5 flex-1 ${
                      isCompleted ? 'bg-green-500/30' : 'bg-dark-border'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {currentStep === 'basic' && (
            <motion.div
              key="basic"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Name Input */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-dark-card to-dark-bg rounded-2xl p-6 border border-dark-border shadow-lg"
              >
                <label className="block text-sm font-semibold mb-3 text-gray-300 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Имя персонажа
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Введите имя персонажа..."
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </motion.div>
              
              {/* Race Selection */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-dark-card to-dark-bg rounded-2xl p-6 border border-dark-border shadow-lg"
              >
                <label className="block text-sm font-semibold mb-4 text-gray-300">Раса</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {RACES.map((r) => (
                    <motion.button
                      key={r.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setRace(r.id);
                        setSubrace('');
                      }}
                      className={`p-4 rounded-xl border-2 transition-all text-left relative overflow-hidden ${
                        race === r.id
                          ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
                          : 'border-dark-border hover:border-blue-500/50 bg-dark-bg'
                      }`}
                    >
                      {race === r.id && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"
                        >
                          <Check className="w-4 h-4 text-white" />
                        </motion.div>
                      )}
                      <div className="font-bold text-lg mb-1">{r.name}</div>
                      <div className="text-xs text-gray-400">{r.description}</div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Subrace Selection */}
              {selectedRace && selectedRace.subraces && selectedRace.subraces.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="bg-gradient-to-br from-dark-card to-dark-bg rounded-2xl p-6 border border-dark-border shadow-lg"
                >
                  <label className="block text-sm font-semibold mb-4 text-gray-300">
                    Подраса {selectedRace.name}а
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {selectedRace.subraces.map((sr) => (
                      <motion.button
                        key={sr.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSubrace(sr.id)}
                        className={`p-4 rounded-xl border-2 transition-all text-left relative overflow-hidden ${
                          subrace === sr.id
                            ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20'
                            : 'border-dark-border hover:border-purple-500/50 bg-dark-bg'
                        }`}
                      >
                        {subrace === sr.id && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-2 right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center"
                          >
                            <Check className="w-4 h-4 text-white" />
                          </motion.div>
                        )}
                        <div className="font-bold text-lg mb-2">{sr.name}</div>
                        <div className="text-xs text-gray-400 mb-2">
                          <div className="font-semibold mb-1">Внешность:</div>
                          <div className="line-clamp-2">{sr.appearance}</div>
                        </div>
                        <div className="text-xs text-gray-500">
                          <div className="font-semibold mb-1">Способности:</div>
                          <div className="line-clamp-2">{sr.abilities}</div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                  {subrace && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl"
                    >
                      <div className="text-xs text-gray-300">
                        <div className="font-semibold mb-2 text-purple-400">Прибавки характеристик:</div>
                        <div>{selectedRace.subraces?.find(sr => sr.id === subrace)?.attributeBonuses}</div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
              
              {/* Class Selection */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-dark-card to-dark-bg rounded-2xl p-6 border border-dark-border shadow-lg"
              >
                <label className="block text-sm font-semibold mb-4 text-gray-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Класс
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {CLASSES.map((c) => (
                    <motion.button
                      key={c.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setCharClass(c.id);
                        setSubclass('');
                      }}
                      className={`p-4 rounded-xl border-2 transition-all text-left relative overflow-hidden ${
                        charClass === c.id
                          ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20'
                          : 'border-dark-border hover:border-purple-500/50 bg-dark-bg'
                      }`}
                    >
                      {charClass === c.id && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-2 right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center"
                        >
                          <Check className="w-4 h-4 text-white" />
                        </motion.div>
                      )}
                      <div className="font-bold text-lg mb-1">{c.name}</div>
                      <div className="text-xs text-gray-400">{c.description}</div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Subclass Selection */}
              {selectedClass && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-gradient-to-br from-dark-card to-dark-bg rounded-2xl p-6 border border-dark-border shadow-lg"
                >
                  <label className="block text-sm font-semibold mb-4 text-gray-300">
                    Подкласс {selectedClass.name}а
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {selectedClass.subclasses.map((sc) => (
                      <motion.button
                        key={sc.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSubclass(sc.id)}
                        className={`p-3 rounded-xl border-2 transition-all text-center relative overflow-hidden ${
                          subclass === sc.id
                            ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20'
                            : 'border-dark-border hover:border-purple-500/50 bg-dark-bg'
                        }`}
                      >
                        {subclass === sc.id && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-1 right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center"
                          >
                            <Check className="w-3 h-3 text-white" />
                          </motion.div>
                        )}
                        <div className="font-semibold text-sm">{sc.name}</div>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Speed */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-br from-dark-card to-dark-bg rounded-2xl p-6 border border-dark-border shadow-lg"
              >
                <label className="block text-sm font-semibold mb-3 text-gray-300">Скорость</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSpeed(Math.max(0, speed - 5))}
                    className="w-12 h-12 rounded-xl bg-dark-bg border border-dark-border hover:bg-dark-hover transition-all text-2xl font-bold flex items-center justify-center"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={speed}
                    onChange={(e) => setSpeed(parseInt(e.target.value) || 0)}
                    className="flex-1 bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                  <button
                    onClick={() => setSpeed(speed + 5)}
                    className="w-12 h-12 rounded-xl bg-dark-bg border border-dark-border hover:bg-dark-hover transition-all text-2xl font-bold flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </motion.div>

              {/* Next Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex justify-end"
              >
                <button
                  onClick={() => isBasicValid && setCurrentStep('attributes')}
                  disabled={!isBasicValid}
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-blue-500/50 transition-all flex items-center gap-2"
                >
                  Далее: Характеристики
                  <TrendingUp className="w-5 h-5" />
                </button>
              </motion.div>
            </motion.div>
          )}

          {currentStep === 'attributes' && (
            <motion.div
              key="attributes"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Points Counter */}
              <div className="bg-gradient-to-br from-dark-card to-dark-bg rounded-2xl p-6 border border-dark-border shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Очки характеристик</div>
                    <div className="text-2xl font-bold">
                      Использовано: <span className="text-blue-400">{pointsUsed}</span> / {INITIAL_POINTS}
                    </div>
                  </div>
                  <div className={`px-6 py-3 rounded-xl border-2 ${
                    pointsRemaining === 0
                      ? 'bg-green-500/20 border-green-500/50 text-green-400'
                      : pointsRemaining < 0
                      ? 'bg-red-500/20 border-red-500/50 text-red-400'
                      : 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                  }`}>
                    <div className="text-sm font-semibold mb-1">
                      {pointsRemaining === 0 ? 'Готово!' : pointsRemaining < 0 ? 'Перерасход' : 'Осталось'}
                    </div>
                    <div className="text-2xl font-bold">{pointsRemaining}</div>
                  </div>
                </div>
              </div>

              {/* Attributes */}
              <div className="bg-gradient-to-br from-dark-card to-dark-bg rounded-2xl p-6 border border-dark-border shadow-lg">
                <div className="space-y-3">
                  {ATTRIBUTES_LIST.map((attr) => (
                    <div
                      key={attr.id}
                      className="flex items-center justify-between p-4 bg-dark-bg rounded-xl border border-dark-border hover:border-blue-500/50 transition-all"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <button
                          onClick={() => toggleSavingThrow(attr.id)}
                          className={`w-8 h-8 rounded-lg border-2 transition-all flex-shrink-0 flex items-center justify-center ${
                            savingThrows.includes(attr.id) 
                              ? 'bg-blue-500 border-blue-500' 
                              : 'border-dark-border hover:border-blue-500'
                          }`}
                        >
                          {savingThrows.includes(attr.id) && (
                            <Shield className="w-4 h-4 text-white" />
                          )}
                        </button>
                        <div className="flex-1">
                          <div className="font-semibold text-lg">{attr.name}</div>
                          <div className="text-xs text-gray-400">Стоимость: {getCost(attributes[attr.id])} очков</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => decrementAttribute(attr.id)}
                          disabled={!canDecrement(attr.id)}
                          className="w-10 h-10 rounded-lg bg-dark-card border border-dark-border hover:bg-dark-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center text-xl font-bold"
                        >
                          −
                        </button>
                        
                        <div className="text-center min-w-[100px]">
                          <div className="text-3xl font-bold">{attributes[attr.id]}</div>
                          <div className="text-sm text-gray-400">Мод: {getModifier(attributes[attr.id])}</div>
                        </div>
                        
                        <button
                          onClick={() => incrementAttribute(attr.id)}
                          disabled={!canIncrement(attr.id)}
                          className="w-10 h-10 rounded-lg bg-dark-card border border-dark-border hover:bg-dark-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center text-xl font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep('basic')}
                  className="px-6 py-3 bg-dark-card border border-dark-border rounded-xl font-semibold hover:bg-dark-hover transition-all"
                >
                  Назад
                </button>
                <button
                  onClick={() => isAttributesValid && setCurrentStep('skills')}
                  disabled={!isAttributesValid}
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-blue-500/50 transition-all flex items-center gap-2"
                >
                  Далее: Навыки
                  <Zap className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {currentStep === 'skills' && (
            <motion.div
              key="skills"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Skills */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-gradient-to-br from-dark-card to-dark-bg rounded-2xl p-6 border border-dark-border shadow-lg">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Навыки
                  </h3>
                  <div className="text-xs text-gray-400 mb-4 flex items-center gap-2">
                    <Check className="w-3 h-3" /> = владение, E = экспертиза
                  </div>
                  
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                    {ATTRIBUTES_LIST.map((attr) => {
                      const attrSkills = skills.filter(s => s.attribute === attr.id);
                      if (attrSkills.length === 0) return null;
                      
                      return (
                        <div key={attr.id} className="mb-4">
                          <div className="text-xs font-semibold text-gray-400 mb-3 uppercase">
                            {attr.name}
                          </div>
                          <div className="space-y-2">
                            {attrSkills.map((skill) => {
                              const attrValue = attributes[skill.attribute] || 10;
                              const modifier = Math.floor((attrValue - 10) / 2);
                              const skillModifier = modifier + 
                                (skill.proficient ? proficiencyBonus : 0) + 
                                (skill.expertise ? proficiencyBonus : 0);
                              const modStr = skillModifier >= 0 ? `+${skillModifier}` : `${skillModifier}`;
                              
                              return (
                                <div
                                  key={skill.id}
                                  className="flex items-center justify-between p-3 rounded-lg hover:bg-dark-bg transition-all border border-transparent hover:border-dark-border"
                                >
                                  <div className="flex items-center gap-3 flex-1">
                                    <button
                                      onClick={() => toggleSkillProficiency(skill.id)}
                                      className={`w-6 h-6 rounded border-2 transition-all flex items-center justify-center ${
                                        skill.proficient 
                                          ? 'bg-blue-500 border-blue-500' 
                                          : 'border-dark-border hover:border-blue-500'
                                      }`}
                                    >
                                      {skill.proficient && (
                                        <Check className="w-4 h-4 text-white" />
                                      )}
                                    </button>
                                    
                                    <button
                                      onClick={() => toggleSkillExpertise(skill.id)}
                                      disabled={!skill.proficient}
                                      className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center ${
                                        skill.expertise 
                                          ? 'bg-purple-500 border-purple-500' 
                                          : skill.proficient 
                                          ? 'border-dark-border hover:border-purple-500' 
                                          : 'border-dark-border opacity-30 cursor-not-allowed'
                                      }`}
                                    >
                                      {skill.expertise && (
                                        <span className="text-xs font-bold text-white">E</span>
                                      )}
                                    </button>
                                    
                                    <span className="text-sm font-medium">{skill.name}</span>
                                  </div>
                                  <span className="text-sm font-mono font-bold min-w-[50px] text-right text-blue-400">
                                    {modStr}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Languages */}
                <div className="bg-gradient-to-br from-dark-card to-dark-bg rounded-2xl p-6 border border-dark-border shadow-lg">
                  <h3 className="text-lg font-semibold mb-4">Владения и языки</h3>
                  <textarea
                    value={languagesAndProficiencies}
                    onChange={(e) => setLanguagesAndProficiencies(e.target.value)}
                    rows={8}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                    placeholder="Доспехи, оружие, языки..."
                  />
                </div>

                {/* Character Preview */}
                {(name || race || charClass) && (
                  <div className="bg-gradient-to-br from-dark-card to-dark-bg rounded-2xl p-6 border border-dark-border shadow-lg">
                    <h3 className="text-lg font-semibold mb-4">Предпросмотр</h3>
                    <div className="space-y-3">
                      {name && (
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Имя</div>
                          <div className="font-semibold">{name}</div>
                        </div>
                      )}
                      {selectedRace && (
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Раса</div>
                          <div className="font-semibold">{selectedRace.name}</div>
                          {selectedSubrace && (
                            <div className="text-xs text-gray-500 mt-1">({selectedSubrace.name})</div>
                          )}
                        </div>
                      )}
                      {selectedClass && (
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Класс</div>
                          <div className="font-semibold">{selectedClass.name}</div>
                        </div>
                      )}
                      {subclass && selectedClass && (
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Подкласс</div>
                          <div className="font-semibold">
                            {selectedClass.subclasses.find(sc => sc.id === subclass)?.name}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation & Save */}
              <div className="lg:col-span-3 flex justify-between items-center pt-6 border-t border-dark-border">
                <button
                  onClick={() => setCurrentStep('attributes')}
                  className="px-6 py-3 bg-dark-card border border-dark-border rounded-xl font-semibold hover:bg-dark-hover transition-all"
                >
                  Назад
                </button>
                <div className="flex items-center gap-3">
                  {!isFormValid && (
                    <div className="flex items-center gap-2 text-sm text-yellow-400">
                      <AlertCircle className="w-4 h-4" />
                      Заполните все обязательные поля
                    </div>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={!isFormValid}
                    className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-green-500/50 transition-all flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Создать персонажа
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
