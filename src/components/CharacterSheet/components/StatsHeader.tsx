import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Zap, Shield, ArrowUp, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import { Character, Resistance } from '../../../types';
import { DAMAGE_TYPE_COLORS, getDamageTypeIcon } from '../../../utils/damageUtils';

interface StatsHeaderProps {
  character: Character;
  isDying: boolean;
  isInsane: boolean;
  getTotalMaxHP: () => number;
  getMaxSanity: () => number;
  xpProgress: number;
  canLevelUp: boolean;
  setShowHealthModal: (show: boolean) => void;
  setShowSanityModal: (show: boolean) => void;
  setShowACModal: (show: boolean) => void;
  setShowExperienceModal: (show: boolean) => void;
}

export const StatsHeader: React.FC<StatsHeaderProps> = ({
  character,
  isDying,
  isInsane,
  getTotalMaxHP,
  getMaxSanity,
  xpProgress,
  canLevelUp,
  setShowHealthModal,
  setShowSanityModal,
  setShowACModal,
  setShowExperienceModal,
}) => {
  return (
    <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {/* Health Card */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setShowHealthModal(true)}
        className={`bg-gradient-to-br from-red-500/10 to-red-600/10 border border-red-500/20 rounded-2xl p-4 flex flex-col items-start gap-3 hover:border-red-500/50 transition-all text-left group ${isDying ? 'border-red-500 from-red-900/20' : ''}`}
      >
        <div className="flex items-center justify-between w-full">
          <div className={`w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20 group-hover:shadow-red-500/40 transition-all ${isDying ? 'animate-pulse' : ''}`}>
            <Heart className="w-6 h-6 text-white" />
          </div>
          <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${isDying ? 'text-red-400 bg-red-900/50 border-red-500' : 'text-red-400 bg-red-500/10 border-red-500/20'}`}>
            {isDying ? 'DYING' : 'HP'}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-400 uppercase font-semibold">Здоровье</div>
          <div className="text-2xl font-bold flex items-baseline gap-1">
            <span className={isDying ? 'text-red-500' : ''}>{isNaN(character.currentHP) ? 0 : character.currentHP}</span>
            {character.tempHP > 0 && <span className="text-sm text-blue-400">+{character.tempHP}</span>}
            <span className="text-sm text-gray-500 font-normal">/ {getTotalMaxHP()}</span>
          </div>
        </div>
        <div className="w-full h-1.5 bg-dark-bg rounded-full overflow-hidden border border-red-500/10">
          <div 
            className={`h-full bg-gradient-to-r from-red-500 to-red-600 transition-all ${isDying ? 'animate-pulse' : ''}`}
            style={{ width: `${Math.min(((isNaN(character.currentHP) ? 0 : character.currentHP) / getTotalMaxHP()) * 100, 100)}%` }}
          />
        </div>
      </motion.button>

      {/* Sanity Card */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setShowSanityModal(true)}
        className={`bg-gradient-to-br from-purple-500/10 to-blue-600/10 border border-purple-500/20 rounded-2xl p-4 flex flex-col items-start gap-3 hover:border-purple-500/50 transition-all text-left group ${isInsane ? 'from-red-500/10 to-red-900/10 border-red-500/30' : ''}`}
      >
        <div className="flex items-center justify-between w-full">
          <div className={`w-10 h-10 bg-gradient-to-br rounded-xl flex items-center justify-center shadow-lg transition-all ${isInsane ? 'from-red-600 to-red-800 shadow-red-500/20' : 'from-purple-500 to-blue-600 shadow-purple-500/20 group-hover:shadow-purple-500/40'}`}>
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${isInsane ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-purple-400 bg-purple-500/10 border-purple-500/20'}`}>
            {isInsane ? 'INSANE' : 'SAN'}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-400 uppercase font-semibold">Рассудок</div>
          <div className="text-2xl font-bold flex items-baseline gap-1">
            <span className={isInsane ? 'text-red-500' : ''}>{isNaN(character.sanity) ? 0 : character.sanity}</span>
            <span className="text-sm text-gray-500 font-normal">/ {getMaxSanity()}</span>
          </div>
        </div>
        <div className="w-full h-1.5 bg-dark-bg rounded-full overflow-hidden border border-purple-500/10">
          <div 
            className={`h-full transition-all ${isInsane ? 'bg-red-600' : 'bg-gradient-to-r from-purple-500 to-blue-500'}`}
            style={{ width: `${Math.min(((isNaN(character.sanity) ? 0 : character.sanity) / getMaxSanity()) * 100, 100)}%` }}
          />
        </div>
      </motion.button>

      {/* AC Card */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setShowACModal(true)}
        className="bg-gradient-to-br from-blue-500/10 to-indigo-600/10 border border-blue-500/20 rounded-2xl p-4 flex flex-col items-start gap-3 hover:border-blue-500/50 transition-all text-left group"
      >
        <div className="flex items-center justify-between w-full">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div className="text-[10px] text-blue-400 font-bold uppercase tracking-wider bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/20">
            AC
          </div>
        </div>
        <div className="w-full">
          <div className="text-xs text-gray-400 uppercase font-semibold mb-1">Защита</div>
          <div className="flex items-center justify-between w-full">
            <div className="text-3xl font-black text-blue-400">
              {character.armorClass}
            </div>
            {character.resistances && character.resistances.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-end max-w-[65%]">
                {character.resistances.map((res: Resistance) => (
                  <div 
                    key={res.id} 
                    className="relative group/res flex items-center justify-center p-1 rounded-lg bg-dark-bg/40 border border-white/5"
                    style={{ color: DAMAGE_TYPE_COLORS[res.type] || '#94a3b8' }}
                  >
                    <div className="relative">
                      {getDamageTypeIcon(res.type, 18)}
                      {res.level === 'resistance' && (
                        <div className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-blue-600 rounded-full flex items-center justify-center border border-dark-card shadow-sm">
                          <ShieldCheck className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                      {res.level === 'vulnerability' && (
                        <div className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-red-600 rounded-full flex items-center justify-center border border-dark-card shadow-sm">
                          <ShieldAlert className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                      {res.level === 'immunity' && (
                        <div className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-purple-600 rounded-full flex items-center justify-center border border-dark-card shadow-sm">
                          <ShieldX className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </div>
                    
                    {/* Tooltip */}
                    <div className="absolute bottom-full right-0 mb-2 px-2 py-1.5 bg-dark-card border border-dark-border rounded-lg text-[10px] whitespace-nowrap opacity-0 group-hover/res:opacity-100 transition-all pointer-events-none z-50 shadow-2xl text-gray-200 translate-y-1 group-hover/res:translate-y-0">
                      <div className="font-bold border-b border-white/10 pb-1 mb-1">{res.type}</div>
                      <div className="text-gray-400">
                        {res.level === 'resistance' ? 'Сопротивление' : res.level === 'vulnerability' ? 'Уязвимость' : 'Иммунитет'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="text-[10px] text-gray-500 font-medium">Класс Брони</div>
      </motion.button>

      {/* Level/XP Card */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setShowExperienceModal(true)}
        className="bg-gradient-to-br from-amber-500/10 to-orange-600/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col items-start gap-3 hover:border-amber-500/50 transition-all text-left group"
      >
        <div className="flex items-center justify-between w-full">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/40 transition-all">
            <ArrowUp className="w-6 h-6 text-white" />
          </div>
          {canLevelUp && (
            <div className="animate-pulse bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg shadow-green-500/50">
              UP!
            </div>
          )}
        </div>
        <div>
          <div className="text-xs text-gray-400 uppercase font-semibold">Уровень {character.level}</div>
          <div className="text-2xl font-bold flex items-baseline gap-1">
            <span>{character.experience}</span>
            <span className="text-sm text-gray-500 font-normal">XP</span>
          </div>
        </div>
        <div className="w-full h-1.5 bg-dark-bg rounded-full overflow-hidden border border-amber-500/10">
          <div 
            className="h-full bg-gradient-to-r from-amber-500 to-orange-600 transition-all"
            style={{ width: `${Math.min(xpProgress, 100)}%` }}
          />
        </div>
      </motion.button>
    </div>
  );
};

