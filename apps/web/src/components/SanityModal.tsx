import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SanityModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSanity: number;
  maxSanity: number;
  onUpdate: (newSanity: number) => void;
}

export const SanityModal: React.FC<SanityModalProps> = ({
  isOpen,
  onClose,
  currentSanity,
  maxSanity,
  onUpdate,
}) => {
  const [tempSanity, setTempSanity] = useState(isNaN(currentSanity) ? 0 : currentSanity);
  const [restoreAmount, setRestoreAmount] = useState('');
  const [lossAmount, setLossAmount] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setTempSanity(isNaN(currentSanity) ? 0 : currentSanity);
    }
  }, [isOpen, currentSanity]);

  const handleSave = () => {
    const finalValue = isNaN(tempSanity) ? 0 : tempSanity;
    onUpdate(finalValue);
    onClose();
  };

  const handleLoss = (amount?: number) => {
    const value = amount !== undefined ? amount : parseInt(lossAmount);
    if (isNaN(value) || value <= 0) return;
    
    setTempSanity(Math.max(0, tempSanity - value));
    setLossAmount('');
  };

  const handleGain = (amount?: number) => {
    const value = amount !== undefined ? amount : parseInt(restoreAmount);
    if (isNaN(value) || value <= 0) return;
    
    setTempSanity(Math.min(maxSanity, tempSanity + value));
    setRestoreAmount('');
  };

  const isInsane = tempSanity <= 0;

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
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-dark-card rounded-2xl border border-dark-border p-6 w-full max-w-lg"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Рассудок</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg hover:bg-dark-hover transition-all flex items-center justify-center"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className={`rounded-xl p-6 mb-6 text-center border-2 ${
                isInsane 
                  ? 'bg-red-500/10 border-red-500' 
                  : 'bg-dark-bg border-purple-500/50'
              }`}>
                <div className={`text-6xl font-bold mb-2 ${isInsane ? 'text-red-500 animate-pulse' : ''}`}>
                  {tempSanity}
                </div>
                <div className="text-xl text-gray-400">
                  / {maxSanity}
                </div>
                {isInsane && (
                  <div className="mt-3 text-red-500 font-bold text-lg animate-pulse">
                    БЕЗУМИЕ!
                  </div>
                )}
              </div>

              <div className="space-y-3 mb-6">
                <div>
                  <div className="text-sm text-gray-400 mb-2 uppercase">Восстановление рассудка</div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={restoreAmount}
                      onChange={(e) => setRestoreAmount(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleGain()}
                      placeholder="Количество"
                      className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-center focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      onClick={() => handleGain()}
                      className="px-6 py-2 bg-purple-500/20 border border-purple-500/50 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-all font-semibold"
                    >
                      Восстановить
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-400 mb-2 uppercase">Потеря рассудка</div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={lossAmount}
                      onChange={(e) => setLossAmount(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleLoss()}
                      placeholder="Количество"
                      className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-center focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <button
                      onClick={() => handleLoss()}
                      className="px-6 py-2 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/30 transition-all font-semibold"
                    >
                      Потеря
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setTempSanity(maxSanity)}
                    className="py-2 bg-blue-500/20 border border-blue-500/50 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all font-semibold text-sm"
                  >
                    Полное восстановление
                  </button>
                  <button
                    onClick={() => setTempSanity(0)}
                    className="py-2 bg-dark-bg border border-dark-border text-gray-400 rounded-lg hover:bg-dark-hover transition-all font-semibold text-sm"
                  >
                    Полное безумие
                  </button>
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-400 mb-2 uppercase">Текущий рассудок</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTempSanity(Math.max(0, tempSanity - 1))}
                    className="w-10 h-10 rounded-lg bg-dark-bg border border-dark-border hover:bg-dark-hover transition-all text-xl font-bold"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={tempSanity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setTempSanity(Math.min(maxSanity, Math.max(0, val)));
                    }}
                    className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    onClick={() => setTempSanity(Math.min(maxSanity, tempSanity + 1))}
                    className="w-10 h-10 rounded-lg bg-dark-bg border border-dark-border hover:bg-dark-hover transition-all text-xl font-bold"
                  >
                    +
                  </button>
                </div>
                <div className="text-center text-xs text-gray-400 mt-2">
                  Максимум рассчитывается автоматически: Ментальная сила + Мудрость + Уровень
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 bg-dark-bg border border-dark-border rounded-xl hover:bg-dark-hover transition-all font-semibold"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all font-semibold"
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

