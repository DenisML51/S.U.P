import React from 'react';
import { Shield, Activity, AlertCircle, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import { Character, Limb, getLimbInjuryLevel, Resistance } from '../../../../types';
import { motion } from 'framer-motion';
import { DAMAGE_TYPE_COLORS, getDamageTypeIcon } from '../../../../utils/damageUtils';
import { useI18n } from '../../../../i18n/I18nProvider';
import { getDamageTypeLabel, getLimbLabel } from '../../../../i18n/domainLabels';

interface HealthTabProps {
  character: Character;
  openLimbModal: (limb: Limb) => void;
  openItemView: (item: any) => void;
  view?: 'all' | 'overview' | 'limbs';
}

export const HealthTab: React.FC<HealthTabProps> = ({
  character,
  openLimbModal,
  openItemView,
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

