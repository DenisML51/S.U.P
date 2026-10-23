import React from 'react';
import { Shield, Activity, Target, Wind, Brain } from 'lucide-react';
import { Character } from '../../../../types';

interface CombatStatsProps {
  character: Character;
  initiative: number | null;
  getModifier: (attr: string) => string;
  onACClick: () => void;
  onInitiativeClick: () => void;
}

export const CombatStats: React.FC<CombatStatsProps> = ({
  character,
  initiative,
  getModifier,
  onACClick,
  onInitiativeClick
}) => {
  return (
    <div className="flex items-center gap-6 px-6 py-1.5 bg-dark-bg/95 backdrop-blur-3xl border border-white/10 rounded-[1.25rem] shadow-2xl relative overflow-hidden">
      <div className="absolute inset-0 bg-white/[0.02] pointer-events-none" />
      <div 
        className="flex flex-col items-center justify-center h-10 cursor-pointer group/stat transition-all"
        onClick={onACClick}
      >
        <span className="text-[7px] font-black text-gray-500 uppercase tracking-[0.2em] mb-0.5">DEFENSE</span>
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-blue-400 group-hover/stat:scale-110 transition-transform" />
          <span className="text-sm font-black text-blue-100">{character.armorClass}</span>
        </div>
      </div>
      
      <div className="w-px h-10 bg-white/10" />

      <div 
        className="flex flex-col items-center justify-center h-10 cursor-pointer group/stat transition-all"
        onClick={onInitiativeClick}
      >
        <span className="text-[7px] font-black text-gray-500 uppercase tracking-[0.2em] mb-0.5">INITIATIVE</span>
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-amber-400 group-hover/stat:scale-110 transition-transform" />
          <span className="text-sm font-black text-amber-100">
            {initiative !== null 
              ? initiative 
              : `${getModifier('dexterity')}${character.initiativeBonus ? ` + ${character.initiativeBonus}` : ''}`
            }
          </span>
        </div>
      </div>

      <div className="w-px h-10 bg-white/10" />

      <div className="flex flex-col items-center justify-center h-10 group/stat transition-all">
        <span className="text-[7px] font-black text-gray-500 uppercase tracking-[0.2em] mb-0.5">PROFICIENCY</span>
        <div className="flex items-center gap-2">
          <Target size={14} className="text-purple-400 group-hover/stat:scale-110 transition-transform" />
          <span className="text-sm font-black text-purple-100">+{character.proficiencyBonus}</span>
        </div>
      </div>

      <div className="w-px h-10 bg-white/10" />

      <div className="flex flex-col items-center justify-center h-10 group/stat transition-all">
        <span className="text-[7px] font-black text-gray-500 uppercase tracking-[0.2em] mb-0.5">SPEED</span>
        <div className="flex items-center gap-2">
          <Wind size={14} className="text-green-400 group-hover/stat:scale-110 transition-transform" />
          <span className="text-sm font-black text-green-100">{character.speed}фт</span>
        </div>
      </div>

      <div className="w-px h-10 bg-white/10" />

      <div className="flex flex-col items-center justify-center h-10 group/stat transition-all">
        <span className="text-[7px] font-black text-purple-400/70 uppercase tracking-[0.2em] mb-0.5 whitespace-nowrap">
          {character.spellcastingDifficultyName || 'СЛ ЗКЛ'}
        </span>
        <div className="flex items-center gap-2">
          <Brain size={14} className="text-purple-400 group-hover/stat:scale-110 transition-transform" />
          <span className="text-sm font-black text-purple-100">{character.spellcastingDifficultyValue || 10}</span>
        </div>
      </div>
    </div>
  );
};

