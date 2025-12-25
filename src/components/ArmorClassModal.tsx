import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Limb, Resistance, ResistanceLevel, DAMAGE_TYPES } from '../types';
import { Trash2, Plus, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';

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
      // If we change maxHP, we might want to cap currentHP, but usually we don't auto-heal/damage
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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-dark-card rounded-2xl border border-dark-border p-5 w-full max-w-md my-8"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Защита и Сопротивления</h2>
              <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-dark-hover transition-all flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              {/* AC Section */}
              <section>
                <div className="text-xs text-gray-400 mb-3 uppercase font-bold tracking-wider">Параметры брони</div>
                {/* Base AC */}
                <div className="bg-dark-bg rounded-xl p-4 mb-4 border-2 border-blue-500/50 shadow-lg shadow-blue-500/10">
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

                <button
                  onClick={() => setAllLimbsAC(baseAC)}
                  className="w-full py-2 mb-4 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-all text-[10px] font-black uppercase tracking-wider"
                >
                  Применить ко всем конечностям
                </button>

                {/* Individual Limbs */}
                <div className="space-y-4 mb-4">
                  <div className="flex justify-between items-center">
                    <div className="text-[10px] text-gray-400 uppercase font-black tracking-widest">КБ и Макс. Здоровье конечностей</div>
                    <button
                      onClick={applySuggestedMaxHP}
                      className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors uppercase font-bold"
                      title={`Расчитать по формуле: ceil(${maxHP}/2) + mod(${constitution}) = ${calculateSuggestedMaxHP()}`}
                    >
                      По формуле ({calculateSuggestedMaxHP()})
                    </button>
                  </div>
                  {limbs.map(limb => (
                    <div key={limb.id} className="bg-dark-bg/50 rounded-xl p-3 border border-dark-border space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-200">{limb.name}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <div className="text-[9px] text-gray-500 uppercase font-black">Класс Брони</div>
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

              {/* Resistances Section */}
              <section className="border-t border-dark-border pt-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-xs text-gray-400 uppercase font-bold tracking-wider">Сопротивления и Уязвимости</div>
                  <button
                    onClick={addResistance}
                    className="flex items-center gap-1 text-[10px] font-black uppercase bg-purple-500/20 text-purple-400 px-2 py-1 rounded-md border border-purple-500/30 hover:bg-purple-500/30 transition-all"
                  >
                    <Plus className="w-3 h-3" /> Добавить
                  </button>
                </div>

                <div className="space-y-3">
                  {localResistances.length === 0 ? (
                    <div className="text-center py-6 border-2 border-dashed border-dark-border rounded-xl text-gray-500 text-xs italic">
                      Нет настроенных сопротивлений
                    </div>
                  ) : (
                    localResistances.map((res) => (
                      <div key={res.id} className="bg-dark-bg/30 rounded-xl p-3 border border-dark-border space-y-3">
                        <div className="flex gap-2">
                          <select
                            value={res.type}
                            onChange={(e) => updateResistance(res.id, { type: e.target.value })}
                            className="flex-1 bg-dark-card border border-dark-border rounded-lg px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                          >
                            {DAMAGE_TYPES.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                            {!DAMAGE_TYPES.includes(res.type) && <option value={res.type}>{res.type}</option>}
                          </select>
                          <button
                            onClick={() => removeResistance(res.id)}
                            className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex gap-1">
                          {(['resistance', 'vulnerability', 'immunity'] as ResistanceLevel[]).map((level) => (
                            <button
                              key={level}
                              onClick={() => updateResistance(res.id, { level })}
                              className={`flex-1 py-1.5 px-1 rounded-lg border text-[9px] font-black uppercase tracking-tighter transition-all flex flex-col items-center gap-1 ${
                                res.level === level
                                  ? level === 'resistance' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' :
                                    level === 'vulnerability' ? 'bg-red-500/20 border-red-500/50 text-red-400' :
                                    'bg-purple-500/20 border-purple-500/50 text-purple-400'
                                  : 'bg-dark-card/50 border-dark-border text-gray-500 hover:border-gray-600'
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

            {/* Actions */}
            <div className="flex gap-2 mt-6">
              <button
                onClick={onClose}
                className="flex-1 py-2 bg-dark-bg border border-dark-border rounded-lg hover:bg-dark-hover transition-all text-sm font-semibold text-gray-400"
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:shadow-lg hover:shadow-blue-500/20 transition-all text-sm font-bold text-white"
              >
                Сохранить изменения
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

