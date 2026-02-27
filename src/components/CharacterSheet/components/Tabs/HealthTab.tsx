import React from 'react';
import { Shield, Activity, AlertCircle, Heart, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import { Character, Limb, getLimbInjuryLevel, Resistance } from '../../../../types';
import { motion } from 'framer-motion';
import { DAMAGE_TYPE_COLORS, getDamageTypeIcon } from '../../../../utils/damageUtils';
import { useI18n } from '../../../../i18n/I18nProvider';
import { getDamageTypeLabel, getLimbLabel } from '../../../../i18n/domainLabels';

interface HealthTabProps {
  character: Character;
  getLimbType: (limbId: string) => 'head' | 'arm' | 'leg' | 'torso';
  openLimbModal: (limb: Limb) => void;
  openItemView: (item: any) => void;
  openACModal: () => void;
  view?: 'all' | 'overview' | 'limbs';
}

export const HealthTab: React.FC<HealthTabProps> = ({
  character,
  getLimbType,
  openLimbModal,
  openItemView,
  openACModal,
  view = 'all',
}) => {
  const { t } = useI18n();
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
        case 'resistance': return t('armorClass.level.resistance');
        case 'vulnerability': return t('armorClass.level.vulnerability');
        case 'immunity': return t('armorClass.level.immunity');
        default: return '';
      }
    };

    return (
      <motion.div
        key={res.id}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative p-2 group cursor-help bg-dark-bg/40 border border-white/5 rounded-xl hover:border-white/10 transition-colors"
        title={`${getDamageTypeLabel(res.type, t)}: ${getLevelLabel()}`}
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
        
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-2 bg-dark-card border border-dark-border rounded-xl text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 shadow-2xl translate-y-1 group-hover:translate-y-0">
          <div className="font-black border-b border-white/10 pb-1 mb-1">{getDamageTypeLabel(res.type, t)}</div>
          <div className="text-gray-400 font-bold">{getLevelLabel()}</div>
        </div>
      </motion.div>
    );
  };

  const renderOverview = () => (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-blue-400" />
          {t('healthTab.bodyState')}
        </h3>
        
        <div className="flex flex-wrap gap-2">
          {character.resistances?.map(renderResistanceIcon)}
        </div>
      </div>

      {character.inventory && character.inventory.find(i => i.equipped && i.type === 'armor') && (
        <div className="space-y-3 mt-4">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">{t('healthTab.currentDefense')}</h4>
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
                  <div className="text-[10px] text-blue-400 font-black uppercase tracking-widest">{t('healthTab.baseArmor')}</div>
                </div>
              </div>
              <div className="text-3xl font-black text-blue-400 px-4">{armor.baseAC || 0}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderLimbs = () => (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
      <div className="bg-dark-card/30 rounded-3xl border border-dark-border p-8 flex justify-center relative overflow-hidden group">
        <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <div className="relative" style={{ width: '280px', height: '420px' }}>
          <svg viewBox="0 0 200 300" className="w-full h-full opacity-20 stroke-blue-500 fill-none" strokeWidth="1">
            <circle cx="100" cy="35" r="20" />
            <path d="M 80 60 L 120 60 L 125 130 L 75 130 Z" />
            <path d="M 75 65 L 40 100 L 45 140" />
            <path d="M 125 65 L 160 100 L 155 140" />
            <path d="M 85 130 L 75 200 L 80 270" />
            <path d="M 115 130 L 125 200 L 120 270" />
          </svg>

          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-500/30" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-blue-500/30" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-blue-500/30" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-blue-500/30" />
          </div>

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
                <span className="text-[10px] font-black uppercase tracking-tighter opacity-70 leading-none">{getLimbLabel(limb.id, limb.name, t)}</span>
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

      <div className="space-y-3">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">{t('healthTab.damageDetails')}</h4>
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
                    <div className="text-sm font-bold text-gray-200">{getLimbLabel(limb.id, limb.name, t)}</div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{t('limb.ac')}: {limb.ac}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {isInjured && (
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      injuryLevel === 'destroyed' ? 'bg-red-500/20 text-red-400' :
                      injuryLevel === 'severe' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {injuryLevel === 'destroyed' ? t('healthTab.injury.destroyed') : 
                       injuryLevel === 'severe' ? t('healthTab.injury.severe') : t('healthTab.injury.light')}
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
  );

  if (view === 'overview') return renderOverview();
  if (view === 'limbs') return renderLimbs();

  return (
    <div className="space-y-8">
      {renderOverview()}
      {renderLimbs()}
    </div>
  );
};

