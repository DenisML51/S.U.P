import React from 'react';
import { Shield, Activity, AlertCircle, Heart, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import { Character, Limb, getLimbInjuryLevel, Resistance } from '../../../../types';
import { motion } from 'framer-motion';
import { DAMAGE_TYPE_COLORS, getDamageTypeIcon } from '../../../../utils/damageUtils';

interface HealthTabProps {
  character: Character;
  getLimbType: (limbId: string) => 'head' | 'arm' | 'leg' | 'torso';
  openLimbModal: (limb: Limb) => void;
  openItemView: (item: any) => void;
  openACModal: () => void;
}

export const HealthTab: React.FC<HealthTabProps> = ({
  character,
  getLimbType,
  openLimbModal,
  openItemView,
  openACModal,
}) => {
  const renderResistanceIcon = (res: Resistance) => {
    const color = DAMAGE_TYPE_COLORS[res.type] || '#94a3b8';
    
    const getLevelIcon = () => {
      switch (res.level) {
        case 'resistance': return <ShieldCheck className="absolute -bottom-1 -right-1 w-2.5 h-2.5 text-white bg-blue-600 rounded-full border border-dark-card" />;
        case 'vulnerability': return <ShieldAlert className="absolute -bottom-1 -right-1 w-2.5 h-2.5 text-white bg-red-600 rounded-full border border-dark-card" />;
        case 'immunity': return <ShieldX className="absolute -bottom-1 -right-1 w-2.5 h-2.5 text-white bg-purple-600 rounded-full border border-dark-card" />;
        default: return null;
      }
    };

    const getLevelLabel = () => {
      switch (res.level) {
        case 'resistance': return 'Сопротивление';
        case 'vulnerability': return 'Уязвимость';
        case 'immunity': return 'Иммунитет';
        default: return '';
      }
    };

    return (
      <motion.div
        key={res.id}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative p-2 group cursor-help bg-dark-bg/40 border border-white/5 rounded-xl hover:border-white/10 transition-colors"
        title={`${res.type}: ${getLevelLabel()}`}
        style={{ color }}
      >
        <div className="relative">
          {getDamageTypeIcon(res.type, 24)}
          {res.level === 'resistance' && (
            <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center border border-dark-card shadow-lg">
              <ShieldCheck className="w-2.5 h-2.5 text-white" />
            </div>
          )}
          {res.level === 'vulnerability' && (
            <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center border border-dark-card shadow-lg">
              <ShieldAlert className="w-2.5 h-2.5 text-white" />
            </div>
          )}
          {res.level === 'immunity' && (
            <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center border border-dark-card shadow-lg">
              <ShieldX className="w-2.5 h-2.5 text-white" />
            </div>
          )}
        </div>
        
        {/* Simple Hover Label */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-2 bg-dark-card border border-dark-border rounded-xl text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 shadow-2xl translate-y-1 group-hover:translate-y-0">
          <div className="font-black border-b border-white/10 pb-1 mb-1">{res.type}</div>
          <div className="text-gray-400 font-bold">{getLevelLabel()}</div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              Состояние тела
            </h3>
            
            {/* Inline Resistances without Box */}
            <div className="flex items-center gap-1">
              {character.resistances?.map(renderResistanceIcon)}
            </div>
          </div>
          <button
            onClick={openACModal}
            className="text-[10px] font-black uppercase bg-dark-card/50 border border-dark-border px-3 py-1.5 rounded-xl hover:border-blue-500/50 transition-all text-gray-400 hover:text-blue-400"
          >
            Настроить защиту
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
        {/* Body Diagram Column */}
        <div className="bg-dark-card/30 rounded-3xl border border-dark-border p-8 flex justify-center relative overflow-hidden group">
          {/* Subtle Background Glow */}
          <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="relative" style={{ width: '280px', height: '420px' }}>
            {/* Minimalist Tactical Body SVG */}
            <svg viewBox="0 0 200 300" className="w-full h-full opacity-20 stroke-blue-500 fill-none" strokeWidth="1">
              {/* Head */}
              <circle cx="100" cy="35" r="20" />
              {/* Torso */}
              <path d="M 80 60 L 120 60 L 125 130 L 75 130 Z" />
              {/* Arms */}
              <path d="M 75 65 L 40 100 L 45 140" />
              <path d="M 125 65 L 160 100 L 155 140" />
              {/* Legs */}
              <path d="M 85 130 L 75 200 L 80 270" />
              <path d="M 115 130 L 125 200 L 120 270" />
            </svg>

            {/* Tactical Target Lines */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-500/30" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-blue-500/30" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-blue-500/30" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-blue-500/30" />
            </div>

            {/* Floating Limb Status Bubbles */}
            {character.limbs && character.limbs.map((limb) => {
              const injuryLevel = getLimbInjuryLevel(limb.currentHP);
              const percentage = Math.max(0, (limb.currentHP / limb.maxHP) * 100);
              
              const getColorClasses = () => {
                switch (injuryLevel) {
                  case 'destroyed': return 'text-red-400 border-red-500/50 bg-red-500/10 shadow-red-500/20';
                  case 'severe': return 'text-orange-400 border-orange-500/50 bg-orange-500/10 shadow-orange-500/20';
                  case 'light': return 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10 shadow-yellow-500/20';
                  default: return 'text-blue-400 border-blue-500/50 bg-blue-500/10 shadow-blue-500/20';
                }
              };

              const getPosition = () => {
                switch (limb.id) {
                  case 'head': return { top: '5%', left: '50%', transform: 'translateX(-50%)' };
                  case 'torso': return { top: '30%', left: '50%', transform: 'translateX(-50%)' };
                  case 'leftArm': return { top: '25%', left: '-15%' };
                  case 'rightArm': return { top: '25%', right: '-15%' };
                  case 'leftLeg': return { top: '70%', left: '5%' };
                  case 'rightLeg': return { top: '70%', right: '5%' };
                  default: return {};
                }
              };

              return (
                <motion.button
                  key={limb.id}
                  whileHover={{ scale: 1.1, zIndex: 20 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => openLimbModal(limb)}
                  className={`absolute flex flex-col items-center gap-1 p-2 rounded-2xl border backdrop-blur-md transition-all shadow-xl ${getColorClasses()}`}
                  style={getPosition()}
                >
                  <span className="text-[10px] font-black uppercase tracking-tighter opacity-70 leading-none">{limb.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-black leading-none">{limb.currentHP}</span>
                    <div className="w-8 h-1 bg-dark-bg/50 rounded-full overflow-hidden">
                      <div className="h-full bg-current transition-all" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Stats and Limbs List Column */}
        <div className="space-y-6">
          {/* Equipped Armor Summary */}
          {character.inventory && character.inventory.find(i => i.equipped && i.type === 'armor') && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Текущая защита</h4>
              {character.inventory.filter(i => i.equipped && i.type === 'armor').map((armor) => (
                <button
                  key={armor.id}
                  onClick={() => openItemView(armor)}
                  className="w-full bg-dark-card/50 border border-blue-500/20 rounded-2xl p-4 hover:border-blue-500/50 transition-all flex items-center justify-between group shadow-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform shadow-inner">
                      <Shield className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="text-left">
                      <div className="text-lg font-bold text-gray-100">{armor.name}</div>
                      <div className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Базовая броня</div>
                    </div>
                  </div>
                  <div className="text-3xl font-black text-blue-400 px-4">{armor.baseAC || 0}</div>
                </button>
              ))}
            </div>
          )}

          {/* Detailed Limbs Grid */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Детали повреждений</h4>
            <div className="grid grid-cols-1 gap-2">
              {character.limbs && character.limbs.map((limb) => {
                const injuryLevel = getLimbInjuryLevel(limb.currentHP);
                const isInjured = injuryLevel !== 'none';
                
                return (
                  <button
                    key={limb.id}
                    onClick={() => openLimbModal(limb)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left bg-dark-card/20 hover:bg-dark-card/40 ${
                      isInjured ? 'border-orange-500/30' : 'border-dark-border hover:border-blue-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                        injuryLevel === 'destroyed' ? 'bg-red-500/20 border-red-500 text-red-400' :
                        injuryLevel === 'severe' ? 'bg-orange-500/20 border-orange-500 text-orange-400' :
                        injuryLevel === 'light' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' :
                        'bg-dark-bg border-dark-border text-gray-500'
                      }`}>
                        {isInjured ? <AlertCircle className="w-4 h-4" /> : <Shield className="w-4 h-4 opacity-50" />}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-200">{limb.name}</div>
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">КБ: {limb.ac}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {isInjured && (
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          injuryLevel === 'destroyed' ? 'bg-red-500/20 text-red-400' :
                          injuryLevel === 'severe' ? 'bg-orange-500/20 text-orange-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {injuryLevel === 'destroyed' ? 'Разрушено' : 
                           injuryLevel === 'severe' ? 'Тяжелое' : 'Легкое'}
                        </span>
                      )}
                      <div className="text-right">
                        <span className={`text-lg font-black ${isInjured ? 'text-orange-400' : 'text-blue-400'}`}>{limb.currentHP}</span>
                        <span className="text-xs text-gray-600 font-bold"> / {limb.maxHP}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

