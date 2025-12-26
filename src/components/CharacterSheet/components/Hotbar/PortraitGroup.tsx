import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ShieldCheck, ShieldAlert, ShieldX, User, Plus, X, Heart } from 'lucide-react';
import { Character } from '../../../../types';
import { CONDITIONS } from '../../../../constants/conditions';
import { DAMAGE_TYPE_COLORS, getDamageTypeIcon } from '../../../../utils/damageUtils';

interface PortraitGroupProps {
  character: Character;
  subclassIcon: string | null;
  updateCharacter: (character: Character) => void;
}

export const PortraitGroup: React.FC<PortraitGroupProps> = ({
  character,
  subclassIcon,
  updateCharacter
}) => {
  const [showConditionPicker, setShowConditionPicker] = useState(false);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Resistances & Status Group */}
      <div className="flex flex-wrap gap-1 mb-1 max-w-[140px] justify-center relative">
        <AnimatePresence mode="popLayout">
          {character.conditions?.map(condId => {
            const cond = CONDITIONS.find(c => c.id === condId);
            return (
              <motion.div 
                key={condId} 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="group/cond relative w-10 h-10 bg-orange-500/20 border border-orange-500/40 rounded-xl flex items-center justify-center shadow-lg cursor-pointer hover:bg-orange-500/30 transition-all"
                onClick={() => {
                  const newConditions = character.conditions?.filter(c => c !== condId) || [];
                  updateCharacter({ ...character, conditions: newConditions });
                }}
              >
                <Activity size={20} className="text-orange-400" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-72 p-5 rounded-3xl bg-dark-bg/95 border border-white/10 text-xs text-white/90 opacity-0 group-hover/cond:opacity-100 pointer-events-none transition-all z-[1001] shadow-2xl backdrop-blur-2xl translate-y-2 group-hover/cond:translate-y-0 border-t-white/20">
                  <div className="font-black text-orange-400 mb-3 border-b border-orange-500/20 pb-3 uppercase tracking-[0.2em] text-[11px] text-center">{cond?.name || condId}</div>
                  <div className="leading-relaxed text-gray-300 font-medium text-sm text-center">{cond?.description}</div>
                  <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-white/30 italic font-black text-center tracking-widest uppercase">НАЖМИТЕ, ЧТОБЫ УДАЛИТЬ</div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {character.resistances?.filter(r => r.level !== 'none').map(res => (
          <div 
            key={res.id} 
            className="group/res relative w-10 h-10 bg-dark-bg/80 border border-white/10 rounded-xl flex items-center justify-center shadow-lg transition-all hover:bg-white/5"
            style={{ color: DAMAGE_TYPE_COLORS[res.type] || '#94a3b8' }}
          >
            <div className="relative">
            {getDamageTypeIcon(res.type, 20)}
              {res.level === 'resistance' && (
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-blue-600 rounded-full flex items-center justify-center border border-dark-card shadow-sm">
                  <ShieldCheck className="w-2.5 h-2.5 text-white" />
                </div>
              )}
              {res.level === 'vulnerability' && (
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-red-600 rounded-full flex items-center justify-center border border-dark-card shadow-sm">
                  <ShieldAlert className="w-2.5 h-2.5 text-white" />
                </div>
              )}
              {res.level === 'immunity' && (
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-purple-600 rounded-full flex items-center justify-center border border-dark-card shadow-sm">
                  <ShieldX className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </div>
            
            {/* Resistance Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-2 bg-dark-bg/95 border border-white/10 rounded-2xl text-[11px] whitespace-nowrap opacity-0 group-hover/res:opacity-100 transition-all pointer-events-none z-[1001] shadow-2xl text-gray-200 translate-y-2 group-hover/res:translate-y-0 backdrop-blur-2xl">
              <div className="font-black border-b border-white/10 pb-1.5 mb-1.5 uppercase tracking-widest text-[9px]" style={{ color: DAMAGE_TYPE_COLORS[res.type] }}>{res.type}</div>
              <div className="text-gray-400 font-bold">
                {res.level === 'resistance' ? 'Сопротивление' : res.level === 'vulnerability' ? 'Уязвимость' : 'Иммунитет'}
              </div>
            </div>
          </div>
        ))}

        <button 
          onClick={() => setShowConditionPicker(!showConditionPicker)}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            showConditionPicker 
              ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' 
              : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'
          }`}
          title="Добавить состояние"
        >
          <Plus size={18} />
        </button>

        {/* Condition Picker Popover */}
        <AnimatePresence>
          {showConditionPicker && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 p-4 bg-dark-bg/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-[1002] w-80"
            >
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/5">
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Состояния</span>
                <button onClick={() => setShowConditionPicker(false)} className="text-gray-500 hover:text-white p-1">
                  <X size={14} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                {CONDITIONS.map(cond => {
                  const isActive = character.conditions?.includes(cond.id);
                  return (
                    <button
                      key={cond.id}
                      onClick={() => {
                        const current = character.conditions || [];
                        const next = isActive ? current.filter(id => id !== cond.id) : [...current, cond.id];
                        updateCharacter({ ...character, conditions: next });
                      }}
                      className={`text-left px-3 py-2 rounded-xl text-xs transition-all border ${
                        isActive 
                          ? 'bg-orange-500/20 text-orange-400 border-orange-500/30 font-bold' 
                          : 'bg-white/5 text-gray-400 border-transparent hover:bg-white/10'
                      }`}
                    >
                      {cond.name}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className={`w-fit bg-dark-bg/95 backdrop-blur-3xl border-2 rounded-[3rem] p-3 shadow-2xl relative group/avatar transition-all duration-300 ${
        character.currentHP === 0 
          ? 'border-red-500 shadow-red-500/40 animate-pulse' 
          : (character.tempHP || 0) > 0 
            ? 'border-blue-500 shadow-blue-500/40' 
            : 'border-white/10'
      }`}>
        <div className={`absolute inset-0 rounded-[3rem] border ${
          character.currentHP === 0 
            ? 'border-red-500/50' 
            : (character.tempHP || 0) > 0 
              ? 'border-blue-500/50' 
              : 'border-white/5'
        } pointer-events-none`} />
        <div className="w-44 h-44 rounded-[2.5rem] overflow-hidden border border-white/10 relative bg-dark-card shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-transparent pointer-events-none" />
          {character.avatar ? (
            <img src={character.avatar} alt={character.name} className="w-full h-full object-cover transition-transform duration-700 group-hover/avatar:scale-110" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User size={64} className="text-gray-700" />
            </div>
          )}
          {/* Subclass Icon */}
          {subclassIcon && (
            <div className="absolute bottom-2 right-2 w-12 h-12 bg-dark-bg/95 border border-white/10 rounded-2xl p-2.5 shadow-2xl overflow-hidden group-hover/avatar:border-blue-500/30 transition-colors">
              <img 
                src={subclassIcon} 
                alt={character.subclass} 
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                }}
              />
            </div>
          )}
        </div>

        {/* Temporary HP Label */}
        {(character.tempHP || 0) > 0 && (
          <motion.div 
            initial={{ opacity: 0, x: "-50%", y: "50%", scale: 0.8 }}
            animate={{ opacity: 1, x: "-50%", y: "50%", scale: 1 }}
            className="absolute bottom-0 left-1/2 bg-dark-bg px-2 py-0.5 border border-blue-500 rounded-full flex items-center gap-1.5 z-30 shadow-[0_0_10px_rgba(59,130,246,0.3)]"
          >
            <Heart size={14} className="text-blue-500 fill-blue-500/20" />
            <span className="text-blue-400 text-sm font-black leading-none tracking-tight">{character.tempHP}</span>
          </motion.div>
        )}
      </div>
    </div>
  );
};

