import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Character, RACES, CLASSES, ATTRIBUTES_LIST, SKILLS_LIST, INITIAL_POINTS, ATTRIBUTE_START, ATTRIBUTE_MIN, ATTRIBUTE_MAX, POINT_BUY_COSTS, getProficiencyBonus, calculateMaxSanity, getDefaultLimbs } from '../types';
import { useCharacter } from '../context/CharacterContext';

export const CharacterCreation: React.FC = () => {
  const { character, updateCharacter } = useCharacter();
  
  const [name, setName] = useState(character?.name || '');
  const [race, setRace] = useState(character?.race || '');
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
  
  const toggleSavingThrow = (attrId: string) => {
    if (savingThrows.includes(attrId)) {
      setSavingThrows(savingThrows.filter(id => id !== attrId));
    } else {
      setSavingThrows([...savingThrows, attrId]);
    }
  };

  const handleSave = () => {
    // Рассчитываем начальный максимальный рассудок
    const maxSanity = calculateMaxSanity(charClass, attributes.wisdom || 10, level);
    
    // Начальное здоровье (можно настроить под вашу систему)
    const constitutionMod = Math.floor(((attributes.constitution || 10) - 10) / 2);
    const initialMaxHP = 10 + constitutionMod; // Базовое значение
    
    // Базовый КБ (10 + модификатор ловкости)
    const dexMod = Math.floor(((attributes.dexterity || 10) - 10) / 2);
    const baseAC = 10 + dexMod;
    
    // Создаем конечности
    const limbs = getDefaultLimbs(initialMaxHP, attributes.constitution || 10, baseAC);
    
    const newCharacter: Character = {
      name,
      race,
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
    };
    updateCharacter(newCharacter);
  };
  
  const isFormValid = name.trim() !== '' && race !== '' && charClass !== '' && subclass !== '' && pointsRemaining >= 0;
  
  return (
    <div className="min-h-screen p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto"
      >
        <h1 className="text-4xl font-bold mb-8 text-center bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Создание Персонажа
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Name Input */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-dark-card rounded-2xl p-6 border border-dark-border"
            >
              <label className="block text-sm font-medium mb-2 text-gray-300">Имя персонажа</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Введите имя..."
                className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </motion.div>
            
            {/* Race Selection */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-dark-card rounded-2xl p-6 border border-dark-border"
            >
              <label className="block text-sm font-medium mb-4 text-gray-300">Раса</label>
              <div className="grid grid-cols-1 gap-3">
                {RACES.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setRace(r.id)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      race === r.id
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-dark-border hover:border-dark-hover bg-dark-bg'
                    }`}
                  >
                    <div className="font-semibold">{r.name}</div>
                    <div className="text-xs text-gray-400 mt-1">{r.description}</div>
                  </button>
                ))}
              </div>
            </motion.div>
            
            {/* Class Selection */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-dark-card rounded-2xl p-6 border border-dark-border"
            >
              <label className="block text-sm font-medium mb-4 text-gray-300">Класс</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {CLASSES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setCharClass(c.id);
                      setSubclass('');
                    }}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      charClass === c.id
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-dark-border hover:border-dark-hover bg-dark-bg'
                    }`}
                  >
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-xs text-gray-400 mt-1">{c.description}</div>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Subclass Selection */}
            {selectedClass && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-dark-card rounded-2xl p-6 border border-dark-border"
              >
                <label className="block text-sm font-medium mb-4 text-gray-300">
                  Подкласс {selectedClass.name}а
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {selectedClass.subclasses.map((sc) => (
                    <button
                      key={sc.id}
                      onClick={() => setSubclass(sc.id)}
                      className={`p-3 rounded-xl border-2 transition-all text-center ${
                        subclass === sc.id
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-dark-border hover:border-dark-hover bg-dark-bg'
                      }`}
                    >
                      <div className="font-semibold text-sm">{sc.name}</div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
            
            {/* Speed */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-dark-card rounded-2xl p-6 border border-dark-border"
            >
              <label className="block text-sm font-medium mb-2 text-gray-300">Скорость</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSpeed(Math.max(0, speed - 5))}
                  className="w-12 h-12 rounded-lg bg-dark-bg border border-dark-border hover:bg-dark-hover transition-all text-2xl font-bold"
                >
                  −
                </button>
                <input
                  type="number"
                  value={speed}
                  onChange={(e) => setSpeed(parseInt(e.target.value) || 0)}
                  placeholder="30"
                  className="flex-1 bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <button
                  onClick={() => setSpeed(speed + 5)}
                  className="w-12 h-12 rounded-lg bg-dark-bg border border-dark-border hover:bg-dark-hover transition-all text-2xl font-bold"
                >
                  +
                </button>
              </div>
            </motion.div>

            {/* Attributes */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-dark-card rounded-2xl p-6 border border-dark-border"
            >
              <div className="flex justify-between items-center mb-6">
                <label className="text-sm font-medium text-gray-300">Характеристики и Спасброски</label>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${pointsRemaining < 0 ? 'text-red-500' : 'text-blue-400'}`}>
                    {pointsRemaining}
                  </div>
                  <div className="text-xs text-gray-400">очков осталось</div>
                </div>
              </div>
              
              <div className="space-y-3">
                {ATTRIBUTES_LIST.map((attr) => (
                  <div
                    key={attr.id}
                    className="flex items-center justify-between p-4 bg-dark-bg rounded-xl border border-dark-border"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={() => toggleSavingThrow(attr.id)}
                        className={`w-6 h-6 rounded border-2 transition-all flex-shrink-0 ${
                          savingThrows.includes(attr.id) 
                            ? 'bg-blue-500 border-blue-500' 
                            : 'border-dark-border hover:border-blue-500'
                        }`}
                      >
                        {savingThrows.includes(attr.id) && (
                          <svg className="w-full h-full text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <div className="flex-1">
                        <div className="font-medium">{attr.name}</div>
                        <div className="text-xs text-gray-400">Стоимость: {getCost(attributes[attr.id])}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => decrementAttribute(attr.id)}
                        disabled={!canDecrement(attr.id)}
                        className="w-10 h-10 rounded-lg bg-dark-card border border-dark-border hover:bg-dark-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        −
                      </button>
                      
                      <div className="text-center min-w-[80px]">
                        <div className="text-2xl font-bold">{attributes[attr.id]}</div>
                        <div className="text-xs text-gray-400">{getModifier(attributes[attr.id])}</div>
                      </div>
                      
                      <button
                        onClick={() => incrementAttribute(attr.id)}
                        disabled={!canIncrement(attr.id)}
                        className="w-10 h-10 rounded-lg bg-dark-card border border-dark-border hover:bg-dark-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right Column - Skills and Other */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-dark-card rounded-2xl p-6 border border-dark-border sticky top-8"
            >
              <h3 className="text-lg font-semibold mb-4">Навыки</h3>
              <div className="text-xs text-gray-400 mb-4">
                ✓ = владение, E = экспертиза
              </div>
              
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                {ATTRIBUTES_LIST.map((attr) => {
                  const attrSkills = skills.filter(s => s.attribute === attr.id);
                  if (attrSkills.length === 0) return null;
                  
                  return (
                    <div key={attr.id} className="mb-4">
                      <div className="text-xs font-semibold text-gray-400 mb-2 uppercase">
                        {attr.name}
                      </div>
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
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-dark-bg transition-all"
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <button
                                onClick={() => toggleSkillProficiency(skill.id)}
                                className={`w-5 h-5 rounded border-2 transition-all ${
                                  skill.proficient 
                                    ? 'bg-blue-500 border-blue-500' 
                                    : 'border-dark-border'
                                }`}
                              >
                                {skill.proficient && (
                                  <svg className="w-full h-full text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                              
                              <button
                                onClick={() => toggleSkillExpertise(skill.id)}
                                disabled={!skill.proficient}
                                className={`w-5 h-5 rounded-full border-2 transition-all ${
                                  skill.expertise 
                                    ? 'bg-purple-500 border-purple-500' 
                                    : skill.proficient 
                                    ? 'border-dark-border hover:border-purple-500' 
                                    : 'border-dark-border opacity-30 cursor-not-allowed'
                                }`}
                              >
                                {skill.expertise && (
                                  <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                                    E
                                  </div>
                                )}
                              </button>
                              
                              <span className="text-sm">{skill.name}</span>
                            </div>
                            <span className="text-sm font-mono font-bold min-w-[40px] text-right">
                              {modStr}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Languages and Proficiencies */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
              className="bg-dark-card rounded-2xl p-6 border border-dark-border"
            >
              <h3 className="text-lg font-semibold mb-4">Владения и языки</h3>
              <textarea
                value={languagesAndProficiencies}
                onChange={(e) => setLanguagesAndProficiencies(e.target.value)}
                rows={6}
                className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                placeholder="Доспехи, оружие, языки..."
              />
            </motion.div>
          </div>
        </div>

        {/* Save Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          onClick={handleSave}
          disabled={!isFormValid}
          className="w-full mt-6 py-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-blue-500/50 transition-all"
        >
          Сохранить персонажа
        </motion.button>
      </motion.div>
    </div>
  );
};
