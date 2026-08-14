import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, HeartPulse, Sparkles, X } from 'lucide-react';
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
  openLimbModal?: (limb: Limb) => void;
  openItemView?: (item: any) => void;
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
  openLimbModal,
  openItemView,
  updateLimb,
}) => {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);
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
            className="fixed inset-0 z-[1040] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
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
              className="w-full overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#121522] to-[#080a11] shadow-[0_30px_90px_rgba(0,0,0,0.6)] flex flex-col lg:flex-row max-h-[85vh] lg:max-h-[90vh]"
            >
              <div className={`flex flex-col ${isExpanded ? 'lg:w-[512px] lg:border-r border-white/10' : 'w-full'} overflow-y-auto custom-scrollbar`}>
                <div className="border-b border-white/10 px-6 py-5">
                  <div className="flex justify-between items-center gap-3">
                    <div>
                      <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-red-200">
                        <Sparkles className="h-3.5 w-3.5" />
                        Vitals
                      </div>
                      <h2 className="flex items-center gap-2 text-2xl font-black text-white">
                        <HeartPulse className="h-6 w-6 text-red-300" />
                        {t('health.title')}
                      </h2>
                    </div>
                    {character && (
                      <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                          isExpanded 
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                            : 'bg-black/25 text-gray-300 border border-white/10 hover:bg-black/40'
                        }`}
                      >
                        {isExpanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                        {isExpanded ? t('health.hideDetails') : t('health.details')}
                      </button>
                    )}
                    <button
                      onClick={onClose}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-gray-400 transition-all hover:border-white/20 hover:text-white"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="px-6 py-5">
                <div className="rounded-2xl border border-red-500/30 bg-black/30 p-4 lg:p-6 mb-6 text-center">
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
                    <div className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-400 mb-2">{t('limb.healing')}</div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={healAmount}
                        onChange={(e) => setHealAmount(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleHeal()}
                        placeholder={t('common.amount')}
                        className="flex-1 rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-center text-white focus:outline-none focus:ring-2 focus:ring-green-500/30 min-w-0"
                      />
                      <button
                        onClick={() => handleHeal()}
                        className="px-4 lg:px-6 py-2.5 bg-green-500/15 border border-green-500/45 text-green-300 rounded-xl hover:bg-green-500/25 transition-all font-semibold whitespace-nowrap"
                      >
                        {t('health.heal')}
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-400 mb-2">{t('common.damage')}</div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={damageAmount}
                        onChange={(e) => setDamageAmount(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleDamage()}
                        placeholder={t('common.amount')}
                        className="flex-1 rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-center text-white focus:outline-none focus:ring-2 focus:ring-red-500/30 min-w-0"
                      />
                      <button
                        onClick={() => handleDamage()}
                        className="px-4 lg:px-6 py-2.5 bg-red-500/15 border border-red-500/45 text-red-300 rounded-xl hover:bg-red-500/25 transition-all font-semibold whitespace-nowrap"
                      >
                        {t('common.damage')}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setTempCurrent(getTotalMaxHP())}
                      className="py-2.5 bg-blue-500/12 border border-blue-500/35 text-blue-300 rounded-xl hover:bg-blue-500/22 transition-all font-semibold text-xs lg:text-sm"
                    >
                      {t('limb.fullHeal')}
                    </button>
                    <button
                      onClick={() => { setTempCurrent(0); setTempTemp(0); }}
                      className="py-2.5 bg-black/25 border border-white/10 text-gray-300 rounded-xl hover:bg-black/40 transition-all font-semibold text-xs lg:text-sm"
                    >
                      {t('health.unconscious')}
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-400 mb-2">{t('health.currentHp')}</div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setTempCurrent(Math.max(0, tempCurrent - 1))}
                        className="w-10 h-10 rounded-xl bg-black/25 border border-white/10 hover:bg-black/40 transition-all text-xl font-bold"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={tempCurrent}
                        onChange={(e) => setTempCurrent(Math.max(0, parseInt(e.target.value) || 0))}
                        className="flex-1 rounded-xl border border-white/10 bg-black/35 px-4 py-2 lg:py-3 text-center text-xl lg:text-2xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-red-500/30 min-w-0"
                      />
                      <button
                        onClick={() => setTempCurrent(Math.min(getTotalMaxHP(), tempCurrent + 1))}
                        className="w-10 h-10 rounded-xl bg-black/25 border border-white/10 hover:bg-black/40 transition-all text-xl font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-400 mb-2">{t('health.tempHp')}</div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setTempTemp(Math.max(0, tempTemp - 1))}
                        className="w-10 h-10 rounded-xl bg-black/25 border border-white/10 hover:bg-black/40 transition-all text-xl font-bold"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={tempTemp}
                        onChange={(e) => setTempTemp(Math.max(0, parseInt(e.target.value) || 0))}
                        className="flex-1 rounded-xl border border-white/10 bg-black/35 px-4 py-2 lg:py-3 text-center text-xl lg:text-2xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-w-0"
                      />
                      <button
                        onClick={() => setTempTemp(tempTemp + 1)}
                        className="w-10 h-10 rounded-xl bg-black/25 border border-white/10 hover:bg-black/40 transition-all text-xl font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-400 mb-2">{t('health.maxHp')}</div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setTempMax(Math.max(1, tempMax - 1))}
                        className="w-10 h-10 rounded-xl bg-black/25 border border-white/10 hover:bg-black/40 transition-all text-xl font-bold"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={tempMax}
                        onChange={(e) => setTempMax(Math.max(1, parseInt(e.target.value) || 1))}
                        className="flex-1 rounded-xl border border-white/10 bg-black/35 px-4 py-2 lg:py-3 text-center text-xl lg:text-2xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-green-500/30 min-w-0"
                      />
                      <button
                        onClick={() => setTempMax(tempMax + 1)}
                        className="w-10 h-10 rounded-xl bg-black/25 border border-white/10 hover:bg-black/40 transition-all text-xl font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-400 mb-2">{t('health.maxBonus')}</div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setTempBonus(tempBonus - 1)}
                        className="w-10 h-10 rounded-xl bg-black/25 border border-white/10 hover:bg-black/40 transition-all text-xl font-bold"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={tempBonus}
                        onChange={(e) => setTempBonus(parseInt(e.target.value) || 0)}
                        className="flex-1 rounded-xl border border-white/10 bg-black/35 px-4 py-2 lg:py-3 text-center text-xl lg:text-2xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 min-w-0"
                      />
                      <button
                        onClick={() => setTempBonus(tempBonus + 1)}
                        className="w-10 h-10 rounded-xl bg-black/25 border border-white/10 hover:bg-black/40 transition-all text-xl font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={onClose}
                    className="flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm font-semibold text-gray-300 transition-all hover:bg-black/35 hover:text-white"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 px-5 py-2.5 text-sm font-bold text-white transition-all hover:shadow-lg hover:shadow-red-500/30"
                  >
                    {t('common.save')}
                  </button>
                </div>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && character && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex-1 p-4 lg:p-8 bg-black/20 overflow-y-auto custom-scrollbar border-t lg:border-t-0 lg:border-l border-white/10"
                  >
                    <HealthTab 
                      character={character}
                      openLimbModal={openLimbModal || (() => {})}
                      openItemView={openItemView || (() => {})}
                      view="all"
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

