import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AttributeModalProps {
  isOpen: boolean;
  onClose: () => void;
  attributeName: string;
  attributeValue: number;
  attributeBonus: number;
  isProficient: boolean;
  proficiencyBonus: number;
  onUpdateValue: (newValue: number, newBonus: number) => void;
  onToggleProficiency: () => void;
}

export const AttributeModal: React.FC<AttributeModalProps> = ({
  isOpen,
  onClose,
  attributeName,
  attributeValue,
  attributeBonus,
  isProficient,
  proficiencyBonus,
  onUpdateValue,
  onToggleProficiency,
}) => {
  const [tempValue, setTempValue] = useState(attributeValue);
  const [tempBonus, setTempBonus] = useState(attributeBonus);

  useEffect(() => {
    if (isOpen) {
      setTempValue(attributeValue);
      setTempBonus(attributeBonus);
    }
  }, [isOpen, attributeValue, attributeBonus]);

  const handleSave = () => {
    onUpdateValue(tempValue, tempBonus);
    onClose();
  };

  const handleIncrement = () => {
    if (tempValue < 30) {
      setTempValue(tempValue + 1);
    }
  };

  const handleDecrement = () => {
    if (tempValue > 1) {
      setTempValue(tempValue - 1);
    }
  };

  const getTempModifier = (value: number, bonus: number = 0) => {
    const baseMod = Math.floor((value - 10) / 2);
    const total = baseMod + bonus;
    return total >= 0 ? `+${total}` : `${total}`;
  };

  const getTempSavingThrow = (value: number, bonus: number, isProficient: boolean) => {
    const baseMod = Math.floor((value - 10) / 2);
    const total = baseMod + bonus + (isProficient ? proficiencyBonus : 0);
    return total >= 0 ? `+${total}` : `${total}`;
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
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-dark-card rounded-2xl border border-dark-border p-6 w-full max-w-md"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">{attributeName}</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg hover:bg-dark-hover transition-all flex items-center justify-center"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-6">
                <div className="text-sm text-gray-400 mb-2 uppercase">Значение</div>
                <div className="flex items-center justify-center gap-4 bg-dark-bg rounded-xl p-6">
                  <button
                    onClick={handleDecrement}
                    disabled={tempValue <= 1}
                    className="w-12 h-12 rounded-lg bg-dark-card border border-dark-border hover:bg-dark-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all text-2xl font-bold"
                  >
                    −
                  </button>
                  
                  <div className="text-center min-w-[100px]">
                    <div className="text-5xl font-bold mb-2">{tempValue}</div>
                    <div className="text-sm text-gray-400">
                      Базовый: {Math.floor((tempValue - 10) / 2) >= 0 ? `+${Math.floor((tempValue - 10) / 2)}` : Math.floor((tempValue - 10) / 2)}
                    </div>
                  </div>
                  
                  <button
                    onClick={handleIncrement}
                    disabled={tempValue >= 30}
                    className="w-12 h-12 rounded-lg bg-dark-card border border-dark-border hover:bg-dark-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all text-2xl font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <div className="text-sm text-gray-400 mb-2 uppercase">Бонус к характеристике</div>
                <div className="bg-dark-bg rounded-xl p-4">
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => setTempBonus(tempBonus - 1)}
                      className="w-10 h-10 rounded-lg bg-dark-card border border-dark-border hover:bg-dark-hover transition-all text-xl font-bold"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={tempBonus}
                      onChange={(e) => setTempBonus(parseInt(e.target.value) || 0)}
                      className="w-24 bg-dark-card border border-dark-border rounded-lg px-4 py-3 text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                    <button
                      onClick={() => setTempBonus(tempBonus + 1)}
                      className="w-10 h-10 rounded-lg bg-dark-card border border-dark-border hover:bg-dark-hover transition-all text-xl font-bold"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-center text-xs text-gray-400 mt-3">
                    Дополнительный бонус от предметов, заклинаний и т.д.
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-dark-bg rounded-xl p-4 text-center border-2 border-blue-500/50">
                  <div className="text-xs text-gray-400 mb-1 uppercase">Бонус к проверке</div>
                  <div className="text-3xl font-bold text-blue-400">{getTempModifier(tempValue, tempBonus)}</div>
                  {tempBonus !== 0 && (
                    <div className="text-xs text-gray-400 mt-1">
                      {Math.floor((tempValue - 10) / 2) >= 0 ? `+${Math.floor((tempValue - 10) / 2)}` : Math.floor((tempValue - 10) / 2)} 
                      {tempBonus >= 0 ? ` +${tempBonus}` : ` ${tempBonus}`}
                    </div>
                  )}
                </div>
                
                <div className={`rounded-xl p-4 text-center border-2 ${
                  isProficient ? 'bg-blue-500/20 border-blue-500/50' : 'bg-dark-bg border-dark-border'
                }`}>
                  <div className="text-xs text-gray-400 mb-1 uppercase">Бонус к спасброску</div>
                  <div className={`text-3xl font-bold ${isProficient ? 'text-blue-400' : ''}`}>
                    {getTempSavingThrow(tempValue, tempBonus, isProficient)}
                  </div>
                  {(isProficient || tempBonus !== 0) && (
                    <div className="text-xs text-gray-400 mt-1">
                      {Math.floor((tempValue - 10) / 2) >= 0 ? `+${Math.floor((tempValue - 10) / 2)}` : Math.floor((tempValue - 10) / 2)}
                      {tempBonus !== 0 && (tempBonus >= 0 ? ` +${tempBonus}` : ` ${tempBonus}`)}
                      {isProficient && ` +${proficiencyBonus}`}
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <button
                  onClick={onToggleProficiency}
                  className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                    isProficient
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-dark-border hover:border-blue-500/50'
                  }`}
                >
                  <span className="font-semibold">Переопределён. спасбросок</span>
                  <div className={`w-6 h-6 rounded border-2 transition-all ${
                    isProficient 
                      ? 'bg-blue-500 border-blue-500' 
                      : 'border-dark-border'
                  }`}>
                    {isProficient && (
                      <svg className="w-full h-full text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 bg-dark-bg border border-dark-border rounded-xl hover:bg-dark-hover transition-all font-semibold"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl hover:shadow-lg hover:shadow-blue-500/50 transition-all font-semibold"
                >
                  Сохранить
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

