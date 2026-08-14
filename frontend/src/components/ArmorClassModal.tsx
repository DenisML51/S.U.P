import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Limb, Resistance, ResistanceLevel, DAMAGE_TYPES } from '../types';
import { Trash2, Plus, ShieldCheck, ShieldAlert, ShieldX, Shield, Zap, X, Sparkles } from 'lucide-react';
import { CustomSelect } from './CustomSelect';
import { useI18n } from '../i18n/I18nProvider';
import { getDamageTypeLabel, getLimbLabel, normalizeDamageType } from '../i18n/domainLabels';

interface ArmorClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  armorClass: number;
  limbs: Limb[];
  resistances?: Resistance[];
  onUpdate: (ac: number, limbs: Limb[], resistances: Resistance[]) => void;
  autoAC?: number;
  maxHP?: number;
  constitution?: number;
}

export const ArmorClassModal: React.FC<ArmorClassModalProps> = ({
  isOpen,
  onClose,
  armorClass,
  limbs,
  resistances = [],
  onUpdate,
  autoAC,
  maxHP = 10,
  constitution = 10,
}) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'ac' | 'resistances'>('ac');
  const [baseAC, setBaseAC] = useState(armorClass);
  const [limbACs, setLimbACs] = useState<{[key: string]: number}>(
    limbs.reduce((acc, limb) => ({ ...acc, [limb.id]: limb.ac }), {})
  );
  const [limbMaxHPs, setLimbMaxHPs] = useState<{[key: string]: number}>(
    limbs.reduce((acc, limb) => ({ ...acc, [limb.id]: limb.maxHP }), {})
  );
  const [localResistances, setLocalResistances] = useState<Resistance[]>(resistances);

  const handleSave = () => {
    const updatedLimbs = limbs.map(limb => ({
      ...limb,
      ac: limbACs[limb.id] || limb.ac,
      maxHP: limbMaxHPs[limb.id] || limb.maxHP,
    }));
    onUpdate(baseAC, updatedLimbs, localResistances);
    onClose();
  };

  const setAllLimbsAC = (ac: number) => {
    const newLimbACs: {[key: string]: number} = {};
    limbs.forEach(limb => {
      newLimbACs[limb.id] = ac;
    });
    setLimbACs(newLimbACs);
  };

  const calculateSuggestedMaxHP = () => {
    const conMod = Math.floor((constitution - 10) / 2);
    return Math.ceil(maxHP / 2) + conMod;
  };

  const applySuggestedMaxHP = () => {
    const suggested = calculateSuggestedMaxHP();
    const newMaxHPs: {[key: string]: number} = {};
    limbs.forEach(limb => {
      newMaxHPs[limb.id] = suggested;
    });
    setLimbMaxHPs(newMaxHPs);
  };

  const addResistance = () => {
    const newResistance: Resistance = {
      id: `res_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type: DAMAGE_TYPES[0],
      level: 'resistance'
    };
    setLocalResistances([...localResistances, newResistance]);
  };

  const updateResistance = (id: string, updates: Partial<Resistance>) => {
    setLocalResistances(localResistances.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const removeResistance = (id: string) => {
    setLocalResistances(localResistances.filter(r => r.id !== id));
  };

  const getLevelIcon = (level: ResistanceLevel) => {
    switch (level) {
      case 'resistance': return <ShieldCheck className="w-4 h-4 text-blue-400" />;
      case 'vulnerability': return <ShieldAlert className="w-4 h-4 text-red-400" />;
      case 'immunity': return <ShieldX className="w-4 h-4 text-purple-400" />;
      default: return null;
    }
  };

  const getLevelLabel = (level: ResistanceLevel) => {
    switch (level) {
      case 'resistance': return t('armorClass.level.resistance');
      case 'vulnerability': return t('armorClass.level.vulnerability');
      case 'immunity': return t('armorClass.level.immunity');
      default: return t('itemView.no');
    }
  };

  const damageTypeOptions = DAMAGE_TYPES.map(type => ({ value: type, label: getDamageTypeLabel(type, t) }));

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/80 p-4 overflow-y-auto backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl my-8 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#121522] to-[#080a11] shadow-[0_30px_90px_rgba(0,0,0,0.6)]"
          >
            <div className="border-b border-white/10 px-6 py-5 md:px-8">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-blue-200">
                    <Sparkles className="h-3.5 w-3.5" />
                    Defense
                  </div>
                  <h2 className="flex items-center gap-2 text-2xl font-black text-white">
                    <Shield className="h-6 w-6 text-blue-300" />
                    {t('armorClass.title')}
                  </h2>
                </div>
                <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-gray-400 transition-all hover:border-white/20 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-5 md:px-8 md:py-6 custom-scrollbar">
            <div className="flex p-1 bg-black/25 rounded-xl mb-6 border border-white/10">
              <button
                onClick={() => setActiveTab('ac')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                  activeTab === 'ac' 
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                {t('armorClass.tabs.armorLimbs')}
              </button>
              <button
                onClick={() => setActiveTab('resistances')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                  activeTab === 'resistances' 
                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' 
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                {t('armorClass.tabs.resistances')}
              </button>
            </div>

            <div className="overflow-visible pr-2 min-h-[430px]">
              {activeTab === 'ac' ? (
                <div className="space-y-6">
                  <section>
                    <div className="text-xs text-gray-400 mb-3 uppercase font-bold tracking-wider px-1">{t('armorClass.baseAc')}</div>
                    <div className="bg-black/25 rounded-xl p-4 border border-blue-500/35 shadow-lg shadow-blue-500/10">
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-[10px] text-gray-400 uppercase font-black tracking-widest">{t('armorClass.totalAc')}</div>
                        {autoAC !== undefined && (
                          <button 
                            onClick={() => setBaseAC(autoAC)}
                            className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors uppercase font-bold"
                          >
                            {t('armorClass.auto')} ({autoAC})
                          </button>
                        )}
                      </div>
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => setBaseAC(Math.max(0, baseAC - 1))}
                          className="w-10 h-10 rounded-xl bg-black/25 border border-white/10 hover:bg-black/40 transition-all text-xl font-bold"
                        >
                          −
                        </button>
                        <div className="text-5xl font-black text-blue-400 w-20 text-center drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]">{baseAC}</div>
                        <button
                          onClick={() => setBaseAC(baseAC + 1)}
                          className="w-10 h-10 rounded-xl bg-black/25 border border-white/10 hover:bg-black/40 transition-all text-xl font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </section>

                  <section>
                    <div className="flex justify-between items-center mb-3 px-1">
                      <div className="text-xs text-gray-400 uppercase font-bold tracking-wider">{t('armorClass.limbsAcHp')}</div>
                      <button
                        onClick={applySuggestedMaxHP}
                        className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors uppercase font-bold flex items-center gap-1"
                        title={`Расчитать по формуле: ceil(${maxHP}/2) + mod(${constitution}) = ${calculateSuggestedMaxHP()}`}
                      >
                        {t('armorClass.calcHp')} ({calculateSuggestedMaxHP()})
                      </button>
                    </div>

                    <button
                      onClick={() => setAllLimbsAC(baseAC)}
                      className="w-full py-2.5 mb-4 bg-blue-500/10 border border-blue-500/35 text-blue-300 rounded-xl hover:bg-blue-500/20 transition-all text-[10px] font-black uppercase tracking-wider"
                    >
                      {t('armorClass.applyAll')}
                    </button>

                    <div className="space-y-3">
                      {limbs.map(limb => (
                        <div key={limb.id} className="bg-black/25 rounded-xl p-3 border border-white/10 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-gray-200">{getLimbLabel(limb.id, limb.name, t)}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <div className="text-[9px] text-gray-500 uppercase font-black">{t('limb.ac')}</div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setLimbACs({ ...limbACs, [limb.id]: Math.max(0, (limbACs[limb.id] || limb.ac) - 1) })}
                                  className="w-7 h-7 rounded bg-black/25 border border-white/10 hover:bg-black/40 transition-all text-xs font-bold"
                                >
                                  −
                                </button>
                                <input
                                  type="number"
                                  value={limbACs[limb.id] || limb.ac}
                                  onChange={(e) => setLimbACs({ ...limbACs, [limb.id]: Math.max(0, parseInt(e.target.value) || 0) })}
                                  className="w-full bg-black/25 border border-white/10 rounded px-1 py-1 text-center font-black text-sm text-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <button
                                  onClick={() => setLimbACs({ ...limbACs, [limb.id]: (limbACs[limb.id] || limb.ac) + 1 })}
                                  className="w-7 h-7 rounded bg-black/25 border border-white/10 hover:bg-black/40 transition-all text-xs font-bold"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-[9px] text-gray-500 uppercase font-black">{t('armorClass.maxLimbHp')}</div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setLimbMaxHPs({ ...limbMaxHPs, [limb.id]: Math.max(1, (limbMaxHPs[limb.id] || limb.maxHP) - 1) })}
                                  className="w-7 h-7 rounded bg-black/25 border border-white/10 hover:bg-black/40 transition-all text-xs font-bold"
                                >
                                  −
                                </button>
                                <input
                                  type="number"
                                  value={limbMaxHPs[limb.id] || limb.maxHP}
                                  onChange={(e) => setLimbMaxHPs({ ...limbMaxHPs, [limb.id]: Math.max(1, parseInt(e.target.value) || 1) })}
                                  className="w-full bg-black/25 border border-white/10 rounded px-1 py-1 text-center font-black text-sm text-purple-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                />
                                <button
                                  onClick={() => setLimbMaxHPs({ ...limbMaxHPs, [limb.id]: (limbMaxHPs[limb.id] || limb.maxHP) + 1 })}
                                  className="w-7 h-7 rounded bg-black/25 border border-white/10 hover:bg-black/40 transition-all text-xs font-bold"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              ) : (
                <div className="space-y-6">
                  <section>
                    <div className="flex justify-between items-center mb-4 px-1">
                      <div className="text-xs text-gray-400 uppercase font-bold tracking-wider">{t('armorClass.resistancesAndVuln')}</div>
                      <button
                        onClick={addResistance}
                        className="flex items-center gap-1 text-[10px] font-black uppercase bg-purple-500/20 text-purple-400 px-2 py-1.5 rounded-lg border border-purple-500/30 hover:bg-purple-500/30 transition-all shadow-lg shadow-purple-500/5"
                      >
                        <Plus className="w-3.5 h-3.5" /> {t('common.add')}
                      </button>
                    </div>

                    <div className="space-y-4">
                      {localResistances.length === 0 ? (
                        <div className="text-center py-12 bg-black/20 border-2 border-dashed border-white/10 rounded-2xl text-gray-500 text-sm flex flex-col items-center gap-3">
                          <Zap className="w-8 h-8 opacity-20" />
                          <span>{t('armorClass.noResistances')}</span>
                        </div>
                      ) : (
                        localResistances.map((res) => (
                          <div key={res.id} className="bg-black/25 rounded-2xl p-4 border border-white/10 space-y-4 overflow-visible">
                            <div className="flex gap-2 relative z-20">
                              <CustomSelect
                                value={normalizeDamageType(res.type)}
                                options={damageTypeOptions}
                                onChange={(value) => updateResistance(res.id, { type: value })}
                                className="flex-1 z-20"
                              />
                              <button
                                onClick={() => removeResistance(res.id)}
                                className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-red-400 bg-black/25 border border-white/10 rounded-xl transition-all hover:bg-red-500/10 hover:border-red-500/30"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                            <div className="flex gap-2">
                              {(['resistance', 'vulnerability', 'immunity'] as ResistanceLevel[]).map((level) => (
                                <button
                                  key={level}
                                  onClick={() => updateResistance(res.id, { level })}
                                  className={`flex-1 py-2 px-1 rounded-xl border text-[10px] font-black uppercase tracking-tighter transition-all flex flex-col items-center gap-1.5 ${
                                    res.level === level
                                      ? level === 'resistance' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-lg shadow-blue-500/10' :
                                        level === 'vulnerability' ? 'bg-red-500/20 border-red-500/50 text-red-400 shadow-lg shadow-red-500/10' :
                                        'bg-purple-500/20 border-purple-500/50 text-purple-400 shadow-lg shadow-purple-500/10'
                                      : 'bg-black/20 border-white/10 text-gray-500 hover:border-gray-600 hover:text-gray-400'
                                  }`}
                                >
                                  {getLevelIcon(level)}
                                  {getLevelLabel(level)}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                </div>
              )}
            </div>

            </div>

            <div className="border-t border-white/10 bg-black/25 px-6 py-4 md:px-8">
              <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm font-semibold text-gray-300 transition-all hover:bg-black/35 hover:text-white"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSave}
                className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:shadow-xl hover:shadow-blue-500/20"
              >
                {t('common.save')}
              </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
