import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Heart, Shield, Activity } from 'lucide-react';
import { Character, Limb } from '../types';
import { HealthTab } from './CharacterSheet/components/Tabs/HealthTab';
import { useI18n } from '../i18n/I18nProvider';

interface HealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentHP: number;
  maxHP: number;
  tempHP: number;
  maxHPBonus: number;
  onUpdate: (current: number, max: number, temp: number, bonus: number) => void;
  character?: Character;
  getLimbType?: (limbId: string) => 'head' | 'arm' | 'leg' | 'torso';
  openLimbModal?: (limb: Limb) => void;
  openItemView?: (item: any) => void;
  openACModal?: () => void;
  updateLimb?: (limb: Limb) => void;
}

export const HealthModal: React.FC<HealthModalProps> = ({
  isOpen,
  onClose,
  currentHP,
  maxHP,
  tempHP,
  maxHPBonus,
  onUpdate,
  character,
  getLimbType,
  openLimbModal,
  openItemView,
  openACModal,
  updateLimb,
}) => {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'limbs'>('overview');
  const [tempCurrent, setTempCurrent] = useState(currentHP);
  const [tempMax, setTempMax] = useState(maxHP);
  const [tempTemp, setTempTemp] = useState(tempHP);
  const [tempBonus, setTempBonus] = useState(maxHPBonus);
  const [healAmount, setHealAmount] = useState('');
  const [damageAmount, setDamageAmount] = useState('');

  const handleSave = () => {
    onUpdate(tempCurrent, tempMax, tempTemp, tempBonus);
    onClose();
  };

  const getTotalMaxHP = () => tempMax + tempBonus;
  const handleHeal = (amount?: number) => {
    const value = amount !== undefined ? amount : parseInt(healAmount);
    if (isNaN(value) || value <= 0) return;
    
    const newCurrent = Math.min(getTotalMaxHP(), tempCurrent + value);
    setTempCurrent(newCurrent);
    setHealAmount('');
  };

  const handleDamage = (amount?: number) => {
    const value = amount !== undefined ? amount : parseInt(damageAmount);
    if (isNaN(value) || value <= 0) return;
    
    if (tempTemp > 0) {
      const remainingDamage = Math.max(0, value - tempTemp);
      setTempTemp(Math.max(0, tempTemp - value));
      if (remainingDamage > 0) {
        setTempCurrent(Math.max(0, tempCurrent - remainingDamage));
      }
    } else {
      setTempCurrent(Math.max(0, tempCurrent - value));
    }
    setDamageAmount('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 z-[1040] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                y: 0,
                width: isExpanded ? 'min(1200px, 95vw)' : 'min(512px, 95vw)' 
              }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-dark-card rounded-2xl border border-dark-border shadow-2xl flex flex-col lg:flex-row overflow-hidden max-h-[85vh] lg:max-h-[90vh]"
            >
              <div className={`p-6 flex flex-col ${isExpanded ? 'lg:w-[512px] lg:border-r border-white/5' : 'w-full'} overflow-y-auto custom-scrollbar`}>
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold">{t('health.title')}</h2>
                    {character && (
                      <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                          isExpanded 
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                            : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {isExpanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                        {isExpanded ? t('health.hideDetails') : t('health.details')}
                      </button>
                    )}
                  </div>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-lg hover:bg-dark-hover transition-all flex items-center justify-center"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="bg-dark-bg rounded-xl p-4 lg:p-6 mb-6 text-center">
                  <div className="text-4xl lg:text-6xl font-bold mb-2">
                    {tempCurrent}
                    {tempTemp > 0 && <span className="text-blue-400"> +{tempTemp}</span>}
                  </div>
                  <div className="text-lg lg:text-xl text-gray-400">
                    / {getTotalMaxHP()}
                  </div>
                  {tempBonus !== 0 && (
                    <div className="text-sm text-gray-400 mt-1">
                      {tempMax} {tempBonus >= 0 ? `+${tempBonus}` : tempBonus}
                    </div>
                  )}
                </div>

                <div className="space-y-3 mb-6">
                  <div>
                    <div className="text-sm text-gray-400 mb-2 uppercase">{t('limb.healing')}</div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={healAmount}
                        onChange={(e) => setHealAmount(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleHeal()}
                        placeholder={t('common.amount')}
                        className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-center focus:outline-none focus:ring-2 focus:ring-green-500 min-w-0"
                      />
                      <button
                        onClick={() => handleHeal()}
                        className="px-4 lg:px-6 py-2 bg-green-500/20 border border-green-500/50 text-green-400 rounded-lg hover:bg-green-500/30 transition-all font-semibold whitespace-nowrap"
                      >
                        {t('health.heal')}
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-400 mb-2 uppercase">{t('common.damage')}</div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={damageAmount}
                        onChange={(e) => setDamageAmount(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleDamage()}
                        placeholder={t('common.amount')}
                        className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-center focus:outline-none focus:ring-2 focus:ring-red-500 min-w-0"
                      />
                      <button
                        onClick={() => handleDamage()}
                        className="px-4 lg:px-6 py-2 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/30 transition-all font-semibold whitespace-nowrap"
                      >
                        {t('common.damage')}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setTempCurrent(getTotalMaxHP())}
                      className="py-2 bg-blue-500/20 border border-blue-500/50 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all font-semibold text-xs lg:text-sm"
                    >
                      {t('limb.fullHeal')}
                    </button>
                    <button
                      onClick={() => { setTempCurrent(0); setTempTemp(0); }}
                      className="py-2 bg-dark-bg border border-dark-border text-gray-400 rounded-lg hover:bg-dark-hover transition-all font-semibold text-xs lg:text-sm"
                    >
                      {t('health.unconscious')}
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-400 mb-2 uppercase">{t('health.currentHp')}</div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setTempCurrent(Math.max(0, tempCurrent - 1))}
                        className="w-10 h-10 rounded-lg bg-dark-bg border border-dark-border hover:bg-dark-hover transition-all text-xl font-bold"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={tempCurrent}
                        onChange={(e) => setTempCurrent(Math.max(0, parseInt(e.target.value) || 0))}
                        className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-4 py-2 lg:py-3 text-center text-xl lg:text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-red-500 min-w-0"
                      />
                      <button
                        onClick={() => setTempCurrent(Math.min(getTotalMaxHP(), tempCurrent + 1))}
                        className="w-10 h-10 rounded-lg bg-dark-bg border border-dark-border hover:bg-dark-hover transition-all text-xl font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-400 mb-2 uppercase">{t('health.tempHp')}</div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setTempTemp(Math.max(0, tempTemp - 1))}
                        className="w-10 h-10 rounded-lg bg-dark-bg border border-dark-border hover:bg-dark-hover transition-all text-xl font-bold"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={tempTemp}
                        onChange={(e) => setTempTemp(Math.max(0, parseInt(e.target.value) || 0))}
                        className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-4 py-2 lg:py-3 text-center text-xl lg:text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0"
                      />
                      <button
                        onClick={() => setTempTemp(tempTemp + 1)}
                        className="w-10 h-10 rounded-lg bg-dark-bg border border-dark-border hover:bg-dark-hover transition-all text-xl font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-400 mb-2 uppercase">{t('health.maxHp')}</div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setTempMax(Math.max(1, tempMax - 1))}
                        className="w-10 h-10 rounded-lg bg-dark-bg border border-dark-border hover:bg-dark-hover transition-all text-xl font-bold"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={tempMax}
                        onChange={(e) => setTempMax(Math.max(1, parseInt(e.target.value) || 1))}
                        className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-4 py-2 lg:py-3 text-center text-xl lg:text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-green-500 min-w-0"
                      />
                      <button
                        onClick={() => setTempMax(tempMax + 1)}
                        className="w-10 h-10 rounded-lg bg-dark-bg border border-dark-border hover:bg-dark-hover transition-all text-xl font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-400 mb-2 uppercase">{t('health.maxBonus')}</div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setTempBonus(tempBonus - 1)}
                        className="w-10 h-10 rounded-lg bg-dark-bg border border-dark-border hover:bg-dark-hover transition-all text-xl font-bold"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={tempBonus}
                        onChange={(e) => setTempBonus(parseInt(e.target.value) || 0)}
                        className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-4 py-2 lg:py-3 text-center text-xl lg:text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 min-w-0"
                      />
                      <button
                        onClick={() => setTempBonus(tempBonus + 1)}
                        className="w-10 h-10 rounded-lg bg-dark-bg border border-dark-border hover:bg-dark-hover transition-all text-xl font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 bg-dark-bg border border-dark-border rounded-xl hover:bg-dark-hover transition-all font-semibold"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 py-3 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl hover:shadow-lg hover:shadow-red-500/50 transition-all font-semibold"
                  >
                    {t('common.save')}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && character && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex-1 p-4 lg:p-8 bg-dark-bg/30 overflow-y-auto custom-scrollbar border-t lg:border-t-0 lg:border-l border-white/5"
                  >
                    <div className="flex gap-2 mb-6 bg-black/20 p-1 rounded-xl w-fit">
                      <button
                        onClick={() => setActiveSubTab('overview')}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                          activeSubTab === 'overview'
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                      >
                        {t('health.overview')}
                      </button>
                      <button
                        onClick={() => setActiveSubTab('limbs')}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                          activeSubTab === 'limbs'
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                      >
                        {t('health.limbs')}
                      </button>
                    </div>

                    <HealthTab 
                      character={character}
                      getLimbType={getLimbType || (() => 'torso')}
                      openLimbModal={openLimbModal || (() => {})}
                      openItemView={openItemView || (() => {})}
                      openACModal={openACModal || (() => {})}
                      view={activeSubTab}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

