import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Sparkles, X } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';

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
  const { t } = useI18n();
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
            className="fixed inset-0 z-[1040] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#121522] to-[#080a11] shadow-[0_30px_90px_rgba(0,0,0,0.6)]"
            >
              <div className="border-b border-white/10 px-6 py-5 md:px-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-purple-200">
                      <Sparkles className="h-3.5 w-3.5" />
                      Психика
                    </div>
                    <h2 className="flex items-center gap-2 text-2xl font-black text-white">
                      <Brain className="h-6 w-6 text-purple-300" />
                      {t('sanity.title')}
                    </h2>
                  </div>
                  <button
                    onClick={onClose}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-gray-400 transition-all hover:border-white/20 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="max-h-[70vh] overflow-y-auto px-6 py-5 md:px-8 md:py-6 custom-scrollbar">
              <div className="mb-6 flex justify-between items-center">
                <div className={`rounded-2xl p-6 text-center border w-full ${
                  isInsane ? 'bg-red-500/10 border-red-500/60' : 'bg-black/25 border-purple-500/30'
                }`}>
                  <div className={`text-6xl font-black mb-2 ${isInsane ? 'text-red-400 animate-pulse' : 'text-purple-200'}`}>
                    {tempSanity}
                  </div>
                  <div className="text-xl text-gray-400">/ {maxSanity}</div>
                  {isInsane && <div className="mt-3 text-red-400 font-black text-lg animate-pulse">{t('sanity.madness')}</div>}
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-400 mb-2">{t('sanity.recovery')}</div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={restoreAmount}
                      onChange={(e) => setRestoreAmount(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleGain()}
                      placeholder={t('common.amount')}
                      className="flex-1 rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-center text-white outline-none transition-all placeholder:text-gray-500 focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/25"
                    />
                    <button
                      onClick={() => handleGain()}
                      className="px-5 py-3 rounded-xl border border-purple-500/40 bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 transition-all font-semibold"
                    >
                      {t('sanity.restore')}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-400 mb-2">{t('sanity.loss')}</div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={lossAmount}
                      onChange={(e) => setLossAmount(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleLoss()}
                      placeholder={t('common.amount')}
                      className="flex-1 rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-center text-white outline-none transition-all placeholder:text-gray-500 focus:border-red-400/60 focus:ring-2 focus:ring-red-500/25"
                    />
                    <button
                      onClick={() => handleLoss()}
                      className="px-5 py-3 rounded-xl border border-red-500/40 bg-red-500/15 text-red-300 hover:bg-red-500/25 transition-all font-semibold"
                    >
                      {t('sanity.lose')}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setTempSanity(maxSanity)}
                    className="py-2.5 rounded-xl border border-blue-500/35 bg-blue-500/12 text-blue-300 hover:bg-blue-500/22 transition-all font-semibold text-sm"
                  >
                    {t('sanity.fullRestore')}
                  </button>
                  <button
                    onClick={() => setTempSanity(0)}
                    className="py-2.5 rounded-xl border border-white/10 bg-black/25 text-gray-300 hover:bg-black/40 transition-all font-semibold text-sm"
                  >
                    {t('sanity.fullMadness')}
                  </button>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-400 mb-2">{t('sanity.current')}</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTempSanity(Math.max(0, tempSanity - 1))}
                    className="w-10 h-10 rounded-xl border border-white/10 bg-black/25 hover:bg-black/40 transition-all text-xl font-bold"
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
                    className="flex-1 rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-center text-2xl font-black text-white outline-none transition-all focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/25"
                  />
                  <button
                    onClick={() => setTempSanity(Math.min(maxSanity, tempSanity + 1))}
                    className="w-10 h-10 rounded-xl border border-white/10 bg-black/25 hover:bg-black/40 transition-all text-xl font-bold"
                  >
                    +
                  </button>
                </div>
                <div className="text-center text-xs text-gray-400 mt-2">
                  {t('sanity.maxHint')}
                </div>
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
                    className="flex-1 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 px-5 py-2.5 text-sm font-bold text-white transition-all hover:shadow-lg hover:shadow-purple-500/30"
                  >
                    {t('common.save')}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

