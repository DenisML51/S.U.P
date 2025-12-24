import React from 'react';
import { motion } from 'framer-motion';
import { ATTRIBUTES_LIST, SKILLS_LIST, Character } from '../../../types';
import { Target, Star } from 'lucide-react';

interface AttributesSectionProps {
  character: Character;
  activeTab: string;
  getModifier: (attrId: string) => string;
  getSavingThrowModifier: (attrId: string) => string;
  getSkillModifier: (skillId: string) => string;
  setSelectedAttribute: (attrId: string | null) => void;
  toggleSkillProficiency: (skillId: string) => void;
  toggleSkillExpertise: (skillId: string) => void;
}

export const AttributesSection: React.FC<AttributesSectionProps> = ({
  character,
  activeTab,
  getModifier,
  getSavingThrowModifier,
  getSkillModifier,
  setSelectedAttribute,
  toggleSkillProficiency,
  toggleSkillExpertise,
}) => {
  return (
    <div className={`space-y-6 flex flex-col ${activeTab !== 'stats' ? 'hidden lg:flex' : 'flex'}`}>
      <div className="flex items-center gap-3 px-1">
        <h3 className="text-xl font-bold tracking-tight text-gray-200 uppercase tracking-widest">Характеристики</h3>
        <div className="h-px flex-1 bg-gradient-to-r from-dark-border to-transparent"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ATTRIBUTES_LIST.map((attr, index) => {
          const value = character.attributes[attr.id] || 10;
          const modifier = getModifier(attr.id);
          const savingThrow = getSavingThrowModifier(attr.id);
          const isProficient = character.savingThrowProficiencies?.includes(attr.id);
          
          // Get skills for this attribute
          const attrSkills = character.skills?.filter(s => s.attribute === attr.id) || [];
          
          return (
            <motion.div
              key={attr.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group relative h-full flex flex-col"
            >
              {/* Attribute Header Card */}
              <div className="bg-dark-card/30 border border-dark-border rounded-2xl p-4 transition-all hover:border-blue-500/30 flex-1 flex flex-col">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{attr.name}</span>
                      {isProficient && (
                        <div className="px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[8px] font-black text-blue-400 uppercase tracking-tighter">
                          Спасбр.
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-end gap-4">
                      <div className="flex flex-col">
                        <span className="text-3xl font-black text-white leading-none tracking-tighter">{modifier}</span>
                        <span className="text-[8px] font-bold text-gray-600 uppercase mt-1">Модификатор</span>
                      </div>
                      
                      <div className="flex flex-col border-l border-dark-border pl-4">
                        <span className={`text-lg font-bold leading-none ${isProficient ? 'text-blue-400' : 'text-gray-400'}`}>
                          {savingThrow}
                        </span>
                        <span className="text-[8px] font-bold text-gray-600 uppercase mt-1">Спасбросок</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedAttribute(attr.id)}
                    className="w-12 h-12 rounded-xl bg-dark-bg border border-dark-border flex flex-col items-center justify-center hover:border-blue-500 transition-all group/val"
                  >
                    <span className="text-lg font-black text-gray-200 group-hover/val:text-blue-400 transition-colors">{value}</span>
                    <span className="text-[7px] font-black text-gray-600 uppercase">База</span>
                  </button>
                </div>

                {/* Compact Skills List */}
                {attrSkills.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-dark-border/50 grid grid-cols-1 gap-1">
                    {attrSkills.map((skill) => {
                      const skillMod = getSkillModifier(skill.id);
                      return (
                        <div
                          key={skill.id}
                          className="flex items-center justify-between py-1 group/skill"
                        >
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              <button
                                onClick={() => toggleSkillProficiency(skill.id)}
                                className={`w-3 h-3 rounded-sm border transition-all ${
                                  skill.proficient 
                                    ? 'bg-blue-500 border-blue-500' 
                                    : 'border-dark-border group-hover/skill:border-gray-500'
                                }`}
                              />
                              {skill.proficient && (
                                <button
                                  onClick={() => toggleSkillExpertise(skill.id)}
                                  className={`w-3 h-3 rounded-full border transition-all ${
                                    skill.expertise 
                                      ? 'bg-purple-500 border-purple-500' 
                                      : 'border-dark-border hover:border-purple-500'
                                  }`}
                                />
                              )}
                            </div>
                            <span className={`text-[11px] transition-colors ${skill.proficient ? 'text-gray-200 font-bold' : 'text-gray-500'}`}>
                              {skill.name}
                            </span>
                          </div>
                          <span className={`text-xs font-mono ${skill.proficient ? 'text-blue-400 font-bold' : 'text-gray-600'}`}>
                            {skillMod}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

