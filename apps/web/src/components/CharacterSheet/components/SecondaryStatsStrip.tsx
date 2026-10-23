import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Move, Timer, Eye, Compass, Plus, Minus, Settings2, Brain } from 'lucide-react';
import { Character } from '../../../types';

interface SecondaryStatsStripProps {
  character: Character;
  getModifier: (attrId: string) => string;
  getSkillModifier: (skillId: string) => string;
  updateSpeed: (newSpeed: number) => void;
  onRollInitiative?: () => void;
  updateInitiativeBonus?: (bonus: number) => void;
}

export const SecondaryStatsStrip: React.FC<SecondaryStatsStripProps> = ({
  character,
  getModifier,
  getSkillModifier,
  updateSpeed,
  onRollInitiative,
  updateInitiativeBonus,
}) => {
  const [showInitiativeSettings, setShowInitiativeSettings] = useState(false);

  return (
    <div className="max-w-5xl mx-auto mb-8">
      <div className="flex flex-wrap items-stretch bg-dark-card/30 backdrop-blur-md border border-dark-border/50 rounded-2xl shadow-xl relative">
        <div className="flex-1 min-w-[120px] flex flex-col items-center justify-center py-3 px-4 border-r border-dark-border/30 hover:bg-blue-500/5 transition-all group rounded-l-2xl relative overflow-hidden">
          <div className="absolute -left-4 -top-4 w-12 h-12 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition-colors" />
          
          <div className="flex items-center gap-1.5 mb-2 relative z-10">
            <div className="w-4 h-4 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-2.5 h-2.5 text-blue-400" />
            </div>
            <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Мастерство</span>
          </div>
          
          <div className="text-2xl font-black text-blue-400 leading-none tracking-tighter drop-shadow-[0_0_8px_rgba(59,130,246,0.4)] relative z-10">
            +{character.proficiencyBonus}
          </div>
        </div>

        <div className="flex-1 min-w-[160px] flex flex-col items-center justify-center py-3 px-4 border-r border-dark-border/30 hover:bg-emerald-500/5 transition-all group overflow-hidden relative">
          <div className="absolute -right-4 -bottom-4 w-12 h-12 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-colors" />
          
          <div className="flex items-center gap-1.5 mb-2 relative z-10">
            <div className="w-4 h-4 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <Move className="w-2.5 h-2.5 text-emerald-400" />
            </div>
            <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Скорость</span>
          </div>
          
          <div className="flex items-center gap-4 relative z-10">
            <button
              onClick={() => updateSpeed(Math.max(0, character.speed - 5))}
              className="w-7 h-7 flex items-center justify-center rounded-xl bg-dark-bg/80 border border-dark-border hover:border-emerald-500/50 hover:text-emerald-400 transition-all shadow-lg active:scale-90"
            >
              <Minus size={14} strokeWidth={3} />
            </button>
            
            <div className="flex flex-col items-center">
              <div className="text-2xl font-black text-white leading-none tracking-tighter drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                {character.speed}
              </div>
              <div className="text-[8px] font-black text-emerald-500/60 uppercase tracking-widest mt-1">футов</div>
            </div>
            
            <button
              onClick={() => updateSpeed(character.speed + 5)}
              className="w-7 h-7 flex items-center justify-center rounded-xl bg-dark-bg/80 border border-dark-border hover:border-emerald-500/50 hover:text-emerald-400 transition-all shadow-lg active:scale-90"
            >
              <Plus size={14} strokeWidth={3} />
            </button>
          </div>
        </div>

        <div className="flex-1 min-w-[140px] flex flex-col border-r border-dark-border/30 relative">
          <button 
            onClick={onRollInitiative}
            className="flex-1 flex flex-col items-center justify-center py-3 px-4 hover:bg-orange-500/5 transition-all group"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Timer className="w-3 h-3 text-orange-400 opacity-50 group-hover:opacity-100 transition-opacity" />
              <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Инициатива</span>
            </div>
            <div className="text-2xl font-black text-orange-400 group-hover:scale-110 transition-transform">{getModifier('dexterity')}</div>
            <div className="text-[7px] text-gray-600 uppercase font-bold mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Бросить 1d20</div>
          </button>
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowInitiativeSettings(!showInitiativeSettings);
            }}
            className={`absolute bottom-1 right-1 p-1.5 rounded-md transition-all z-10 ${showInitiativeSettings ? 'bg-orange-500/20 text-orange-400' : 'text-gray-600 hover:text-gray-400 hover:bg-white/5'}`}
          >
            <Settings2 size={12} />
          </button>

          <AnimatePresence>
            {showInitiativeSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="absolute top-[calc(100%+4px)] left-0 right-0 z-[100] bg-dark-card border border-dark-border/50 rounded-xl overflow-hidden shadow-2xl backdrop-blur-xl"
              >
                <div className="p-3 bg-orange-500/5 space-y-2">
                  <div className="text-[8px] font-bold text-orange-400/60 uppercase tracking-widest text-center">Сторонний бонус</div>
                  <div className="flex items-center justify-center gap-3">
                    <button 
                      onClick={() => updateInitiativeBonus?.((character.initiativeBonus || 0) - 1)}
                      className="w-6 h-6 rounded-lg bg-dark-bg border border-dark-border flex items-center justify-center text-orange-400 hover:bg-orange-500/10 transition-all"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="text-sm font-black text-white w-4 text-center">
                      {(character.initiativeBonus || 0) >= 0 ? '+' : ''}{character.initiativeBonus || 0}
                    </span>
                    <button 
                      onClick={() => updateInitiativeBonus?.((character.initiativeBonus || 0) + 1)}
                      className="w-6 h-6 rounded-lg bg-dark-bg border border-dark-border flex items-center justify-center text-orange-400 hover:bg-orange-500/10 transition-all"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 min-w-[120px] flex flex-col items-center justify-center py-3 px-4 border-r border-dark-border/30 hover:bg-purple-500/5 transition-all group relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-12 h-12 bg-purple-500/5 rounded-full blur-xl group-hover:bg-purple-500/10 transition-colors" />
          
          <div className="flex items-center gap-1.5 mb-2 relative z-10">
            <div className="w-4 h-4 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/20 group-hover:scale-110 transition-transform">
              <Eye className="w-2.5 h-2.5 text-purple-400" />
            </div>
            <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Восприятие</span>
          </div>
          
          <div className="text-2xl font-black text-purple-400 leading-none tracking-tighter drop-shadow-[0_0_8px_rgba(168,85,247,0.4)] relative z-10">
            {getSkillModifier('perception')}
          </div>
        </div>

        <div className="flex-[1.5] min-w-[220px] flex items-stretch bg-black/20 rounded-r-2xl border-l border-dark-border/30 overflow-hidden">
          <div className="flex-1 flex flex-col items-center justify-center py-3 px-4 border-r border-dark-border/30 hover:bg-amber-500/5 transition-all group relative overflow-hidden">
            <div className="absolute -left-4 -bottom-4 w-10 h-10 bg-amber-500/5 rounded-full blur-lg group-hover:bg-amber-500/10 transition-colors" />
            
            <div className="flex items-center gap-1.5 mb-2 relative z-10">
              <Compass className="w-3 h-3 text-amber-400 opacity-50 group-hover:opacity-100 transition-opacity" />
              <span className="text-[9px] text-gray-500 uppercase font-black tracking-tighter whitespace-nowrap">Пасс. Вниман.</span>
            </div>
            <div className="text-xl font-black text-amber-400 leading-none drop-shadow-[0_0_8px_rgba(245,158,11,0.3)] relative z-10">{10 + parseInt(getSkillModifier('perception'))}</div>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center py-3 px-4 hover:bg-cyan-500/5 transition-all group relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 w-10 h-10 bg-cyan-500/5 rounded-full blur-lg group-hover:bg-cyan-500/10 transition-colors" />
            
            <div className="flex items-center gap-1.5 mb-2 relative z-10">
              <Brain className="w-3 h-3 text-cyan-400 opacity-50 group-hover:opacity-100 transition-opacity" />
              <span className="text-[9px] text-gray-500 uppercase font-black tracking-tighter whitespace-nowrap">Пасс. Прониц.</span>
            </div>
            <div className="text-xl font-black text-cyan-400 leading-none drop-shadow-[0_0_8px_rgba(6,182,212,0.3)] relative z-10">{10 + parseInt(getSkillModifier('insight'))}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

