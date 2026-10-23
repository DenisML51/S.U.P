import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Limb, Resistance, ResistanceLevel, DAMAGE_TYPES } from '../types';
import { Trash2, Plus, ShieldCheck, ShieldAlert, ShieldX, Shield, Zap } from 'lucide-react';
import { CustomSelect } from './CustomSelect';

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
      case 'resistance': return 'Сопротивление';
      case 'vulnerability': return 'Уязвимость';
      case 'immunity': return 'Иммунитет';
      default: return 'Нет';
    }
  };

  const damageTypeOptions = DAMAGE_TYPES.map(type => ({ value: type, label: type }));

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 z-[1100] flex items-center justify-center p-4 overflow-y-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-dark-card rounded-2xl border border-dark-border p-5 w-full max-w-md my-8 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Настройка защиты</h2>
              <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-dark-hover transition-all flex items-center justify-center border border-transparent hover:border-white/10">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex p-1 bg-dark-bg/50 rounded-xl mb-6 border border-dark-border">
              <button
                onClick={() => setActiveTab('ac')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                  activeTab === 'ac' 
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                Броня и конечности
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
                Сопротивления
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {activeTab === 'ac' ? (
                <div className="space-y-6">
                  <section>
                    <div className="text-xs text-gray-400 mb-3 uppercase font-bold tracking-wider px-1">Базовый КБ</div>
                    <div className="bg-dark-bg rounded-xl p-4 border-2 border-blue-500/50 shadow-lg shadow-blue-500/10">
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Общий КБ</div>
                        {autoAC !== undefined && (
                          <button 
                            onClick={() => setBaseAC(autoAC)}
                            className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors uppercase font-bold"
                          >
                            Авто ({autoAC})
                          </button>
                        )}
                      </div>
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => setBaseAC(Math.max(0, baseAC - 1))}
                          className="w-10 h-10 rounded-lg bg-dark-card border border-dark-border hover:bg-dark-hover transition-all text-xl font-bold"
                        >
                          −
                        </button>
                        <div className="text-5xl font-black text-blue-400 w-20 text-center drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]">{baseAC}</div>
                        <button
                          onClick={() => setBaseAC(baseAC + 1)}
                          className="w-10 h-10 rounded-lg bg-dark-card border border-dark-border hover:bg-dark-hover transition-all text-xl font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </section>

                  <section>
                    <div className="flex justify-between items-center mb-3 px-1">
                      <div className="text-xs text-gray-400 uppercase font-bold tracking-wider">КБ и ЗК конечностей</div>
                      <button
                        onClick={applySuggestedMaxHP}
                        className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors uppercase font-bold flex items-center gap-1"
                        title={`Расчитать по формуле: ceil(${maxHP}/2) + mod(${constitution}) = ${calculateSuggestedMaxHP()}`}
                      >
                        Рассчитать ЗК ({calculateSuggestedMaxHP()})
                      </button>
                    </div>

                    <button
                      onClick={() => setAllLimbsAC(baseAC)}
                      className="w-full py-2 mb-4 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-all text-[10px] font-black uppercase tracking-wider"
                    >
                      Применить КБ ко всем
                    </button>

                    <div className="space-y-3">
                      {limbs.map(limb => (
                        <div key={limb.id} className="bg-dark-bg/30 rounded-xl p-3 border border-dark-border space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-gray-200">{limb.name}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <div className="text-[9px] text-gray-500 uppercase font-black">КБ</div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setLimbACs({ ...limbACs, [limb.id]: Math.max(0, (limbACs[limb.id] || limb.ac) - 1) })}
                                  className="w-7 h-7 rounded bg-dark-card border border-dark-border hover:bg-dark-hover transition-all text-xs font-bold"
                                >
                                  −
                                </button>
                                <input
                                  type="number"
                                  value={limbACs[limb.id] || limb.ac}
                                  onChange={(e) => setLimbACs({ ...limbACs, [limb.id]: Math.max(0, parseInt(e.target.value) || 0) })}
                                  className="w-full bg-dark-card border border-dark-border rounded px-1 py-1 text-center font-black text-sm text-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <button
                                  onClick={() => setLimbACs({ ...limbACs, [limb.id]: (limbACs[limb.id] || limb.ac) + 1 })}
                                  className="w-7 h-7 rounded bg-dark-card border border-dark-border hover:bg-dark-hover transition-all text-xs font-bold"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-[9px] text-gray-500 uppercase font-black">Макс. ЗК</div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setLimbMaxHPs({ ...limbMaxHPs, [limb.id]: Math.max(1, (limbMaxHPs[limb.id] || limb.maxHP) - 1) })}
                                  className="w-7 h-7 rounded bg-dark-card border border-dark-border hover:bg-dark-hover transition-all text-xs font-bold"
                                >
                                  −
                                </button>
                                <input
                                  type="number"
                                  value={limbMaxHPs[limb.id] || limb.maxHP}
                                  onChange={(e) => setLimbMaxHPs({ ...limbMaxHPs, [limb.id]: Math.max(1, parseInt(e.target.value) || 1) })}
                                  className="w-full bg-dark-card border border-dark-border rounded px-1 py-1 text-center font-black text-sm text-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                />
                                <button
                                  onClick={() => setLimbMaxHPs({ ...limbMaxHPs, [limb.id]: (limbMaxHPs[limb.id] || limb.maxHP) + 1 })}
                                  className="w-7 h-7 rounded bg-dark-card border border-dark-border hover:bg-dark-hover transition-all text-xs font-bold"
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
                      <div className="text-xs text-gray-400 uppercase font-bold tracking-wider">Сопротивления и Уязвимости</div>
                      <button
                        onClick={addResistance}
                        className="flex items-center gap-1 text-[10px] font-black uppercase bg-purple-500/20 text-purple-400 px-2 py-1.5 rounded-lg border border-purple-500/30 hover:bg-purple-500/30 transition-all shadow-lg shadow-purple-500/5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Добавить
                      </button>
                    </div>

                    <div className="space-y-4">
                      {localResistances.length === 0 ? (
                        <div className="text-center py-12 bg-dark-bg/20 border-2 border-dashed border-dark-border rounded-2xl text-gray-500 text-sm flex flex-col items-center gap-3">
                          <Zap className="w-8 h-8 opacity-20" />
                          <span>Нет настроенных сопротивлений</span>
                        </div>
                      ) : (
                        localResistances.map((res) => (
                          <div key={res.id} className="bg-dark-bg/30 rounded-2xl p-4 border border-dark-border space-y-4">
                            <div className="flex gap-2">
                              <CustomSelect
                                value={res.type}
                                options={damageTypeOptions}
                                onChange={(value) => updateResistance(res.id, { type: value })}
                                className="flex-1"
                              />
                              <button
                                onClick={() => removeResistance(res.id)}
                                className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-red-400 bg-dark-bg/50 border border-dark-border rounded-xl transition-all hover:bg-red-500/10 hover:border-red-500/30"
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
                                      : 'bg-dark-card/50 border-dark-border text-gray-500 hover:border-gray-600 hover:text-gray-400'
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

            <div className="flex gap-3 mt-8">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-dark-bg border border-dark-border rounded-xl hover:bg-dark-hover transition-all text-sm font-bold text-gray-400"
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:shadow-xl hover:shadow-blue-500/20 transition-all text-sm font-black text-white uppercase tracking-wider"
              >
                Сохранить
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
