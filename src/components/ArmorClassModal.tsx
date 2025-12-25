import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Limb } from '../types';

interface ArmorClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  armorClass: number;
  limbs: Limb[];
  onUpdate: (ac: number, limbs: Limb[]) => void;
  autoAC?: number;
}

export const ArmorClassModal: React.FC<ArmorClassModalProps> = ({
  isOpen,
  onClose,
  armorClass,
  limbs,
  onUpdate,
  autoAC, // Ensure this is destuctured correctly
}) => {
  const [baseAC, setBaseAC] = useState(armorClass);
  const [limbACs, setLimbACs] = useState<{[key: string]: number}>(
    limbs.reduce((acc, limb) => ({ ...acc, [limb.id]: limb.ac }), {})
  );

  const handleSave = () => {
    const updatedLimbs = limbs.map(limb => ({
      ...limb,
      ac: limbACs[limb.id] || limb.ac,
    }));
    onUpdate(baseAC, updatedLimbs);
    onClose();
  };

  const setAllLimbsAC = (ac: number) => {
    const newLimbACs: {[key: string]: number} = {};
    limbs.forEach(limb => {
      newLimbACs[limb.id] = ac;
    });
    setLimbACs(newLimbACs);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-dark-card rounded-2xl border border-dark-border p-5 w-full max-w-md"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Класс Брони</h2>
              <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-dark-hover transition-all flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Base AC */}
            <div className="bg-dark-bg rounded-xl p-4 mb-4 border-2 border-blue-500/50">
              <div className="flex justify-between items-center mb-2">
                <div className="text-xs text-gray-400 uppercase">Общий КБ</div>
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
                <div className="text-5xl font-bold text-blue-400 w-20 text-center">{baseAC}</div>
                <button
                  onClick={() => setBaseAC(baseAC + 1)}
                  className="w-10 h-10 rounded-lg bg-dark-card border border-dark-border hover:bg-dark-hover transition-all text-xl font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {/* Apply to all */}
            <button
              onClick={() => setAllLimbsAC(baseAC)}
              className="w-full py-2 mb-4 bg-blue-500/20 border border-blue-500/50 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all text-sm font-semibold"
            >
              Применить ко всем конечностям
            </button>

            {/* Individual Limbs */}
            <div className="space-y-2 mb-4">
              <div className="text-xs text-gray-400 mb-2 uppercase">КБ конечностей</div>
              {limbs.map(limb => (
                <div key={limb.id} className="flex items-center justify-between bg-dark-bg rounded-lg p-2 border border-dark-border">
                  <span className="text-sm">{limb.name}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setLimbACs({ ...limbACs, [limb.id]: Math.max(0, (limbACs[limb.id] || limb.ac) - 1) })}
                      className="w-7 h-7 rounded bg-dark-card border border-dark-border hover:bg-dark-hover transition-all text-sm font-bold"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={limbACs[limb.id] || limb.ac}
                      onChange={(e) => setLimbACs({ ...limbACs, [limb.id]: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="w-14 bg-dark-card border border-dark-border rounded px-2 py-1 text-center font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => setLimbACs({ ...limbACs, [limb.id]: (limbACs[limb.id] || limb.ac) + 1 })}
                      className="w-7 h-7 rounded bg-dark-card border border-dark-border hover:bg-dark-hover transition-all text-sm font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 py-2 bg-dark-bg border border-dark-border rounded-lg hover:bg-dark-hover transition-all text-sm font-semibold"
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg hover:shadow-lg transition-all text-sm font-semibold"
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

