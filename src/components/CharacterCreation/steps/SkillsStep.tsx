import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Check, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ATTRIBUTES_LIST, Skill, Race, Class, Subclass, Subrace } from '../../../types';

interface SkillsStepProps {
  skills: Skill[];
  attributes: { [key: string]: number };
  proficiencyBonus: number;
  toggleSkillProficiency: (skillId: string) => void;
  toggleSkillExpertise: (skillId: string) => void;
  languagesAndProficiencies: string;
  setLanguagesAndProficiencies: (val: string) => void;
  name: string;
  selectedRace: Race | undefined;
  selectedSubrace: Subrace | undefined;
  selectedClass: Class | undefined;
  subclass: string;
  setCurrentStep: (step: any) => void;
  isFormValid: boolean;
  handleSave: () => void;
}

export const SkillsStep: React.FC<SkillsStepProps> = ({
  skills,
  attributes,
  proficiencyBonus,
  toggleSkillProficiency,
  toggleSkillExpertise,
  languagesAndProficiencies,
  setLanguagesAndProficiencies,
  name,
  selectedRace,
  selectedSubrace,
  selectedClass,
  subclass,
  setCurrentStep,
  isFormValid,
  handleSave,
}) => {
  return (
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
        {(name || selectedRace || selectedClass) && (
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
  );
};

