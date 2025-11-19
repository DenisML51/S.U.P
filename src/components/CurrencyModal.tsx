import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Currency } from '../types';
import { Coins } from 'lucide-react';

interface CurrencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: Currency;
  onSave: (currency: Currency) => void;
}

export const CurrencyModal: React.FC<CurrencyModalProps> = ({
  isOpen,
  onClose,
  currency,
  onSave,
}) => {
  const [copper, setCopper] = useState(currency.copper);
  const [silver, setSilver] = useState(currency.silver);
  const [gold, setGold] = useState(currency.gold);

  // Синхронизация состояния с props при открытии модалки
  useEffect(() => {
    if (isOpen) {
      setCopper(currency.copper);
      setSilver(currency.silver);
      setGold(currency.gold);
    }
  }, [isOpen, currency]);

  const handleSave = () => {
    onSave({
      copper: Math.max(0, copper),
      silver: Math.max(0, silver),
      gold: Math.max(0, gold),
    });
    onClose();
  };

  const updateCopper = (delta: number) => setCopper(Math.max(0, copper + delta));
  const updateSilver = (delta: number) => setSilver(Math.max(0, silver + delta));
  const updateGold = (delta: number) => setGold(Math.max(0, gold + delta));

  // Конвертация валют
  const convertCopperToSilver = () => {
    if (copper >= 10) {
      const silverGain = Math.floor(copper / 10);
      setCopper(copper % 10);
      setSilver(silver + silverGain);
    }
  };

  const convertSilverToGold = () => {
    if (silver >= 10) {
      const goldGain = Math.floor(silver / 10);
      setSilver(silver % 10);
      setGold(gold + goldGain);
    }
  };

  const convertGoldToSilver = () => {
    if (gold >= 1) {
      setGold(gold - 1);
      setSilver(silver + 10);
    }
  };

  const convertSilverToCopper = () => {
    if (silver >= 1) {
      setSilver(silver - 1);
      setCopper(copper + 10);
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
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-dark-card rounded-2xl border border-dark-border p-5 w-full max-w-lg"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl flex items-center justify-center">
                  <Coins className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-bold">Валюта</h2>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg hover:bg-dark-hover transition-all flex items-center justify-center"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Currency Cards */}
            <div className="space-y-3 mb-5">
              {/* Gold */}
              <div className="bg-gradient-to-br from-yellow-500/10 to-amber-600/10 border border-yellow-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-lg flex items-center justify-center">
                      <Coins className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 uppercase">Золото</div>
                      <div className="text-xs text-gray-500">1 ЗМ = 10 СМ</div>
                    </div>
                  </div>
                  <input
                    type="number"
                    value={gold}
                    onChange={(e) => setGold(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-24 text-3xl font-bold text-yellow-400 bg-transparent text-right focus:outline-none focus:ring-2 focus:ring-yellow-500 rounded px-2"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateGold(-10)}
                    className="flex-1 py-2 rounded-lg bg-dark-bg hover:bg-dark-hover transition-all text-sm font-bold"
                  >
                    −10
                  </button>
                  <button
                    onClick={() => updateGold(-1)}
                    className="flex-1 py-2 rounded-lg bg-dark-bg hover:bg-dark-hover transition-all text-sm font-bold"
                  >
                    −1
                  </button>
                  <button
                    onClick={() => updateGold(1)}
                    className="flex-1 py-2 rounded-lg bg-dark-bg hover:bg-dark-hover transition-all text-sm font-bold"
                  >
                    +1
                  </button>
                  <button
                    onClick={() => updateGold(10)}
                    className="flex-1 py-2 rounded-lg bg-dark-bg hover:bg-dark-hover transition-all text-sm font-bold"
                  >
                    +10
                  </button>
                </div>
              </div>

              {/* Silver */}
              <div className="bg-gradient-to-br from-gray-400/10 to-gray-500/10 border border-gray-400/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-500 rounded-lg flex items-center justify-center">
                      <Coins className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 uppercase">Серебро</div>
                      <div className="text-xs text-gray-500">1 СМ = 10 ММ</div>
                    </div>
                  </div>
                  <input
                    type="number"
                    value={silver}
                    onChange={(e) => setSilver(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-24 text-3xl font-bold text-gray-300 bg-transparent text-right focus:outline-none focus:ring-2 focus:ring-gray-400 rounded px-2"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateSilver(-10)}
                    className="flex-1 py-2 rounded-lg bg-dark-bg hover:bg-dark-hover transition-all text-sm font-bold"
                  >
                    −10
                  </button>
                  <button
                    onClick={() => updateSilver(-1)}
                    className="flex-1 py-2 rounded-lg bg-dark-bg hover:bg-dark-hover transition-all text-sm font-bold"
                  >
                    −1
                  </button>
                  <button
                    onClick={() => updateSilver(1)}
                    className="flex-1 py-2 rounded-lg bg-dark-bg hover:bg-dark-hover transition-all text-sm font-bold"
                  >
                    +1
                  </button>
                  <button
                    onClick={() => updateSilver(10)}
                    className="flex-1 py-2 rounded-lg bg-dark-bg hover:bg-dark-hover transition-all text-sm font-bold"
                  >
                    +10
                  </button>
                </div>
              </div>

              {/* Copper */}
              <div className="bg-gradient-to-br from-orange-700/10 to-amber-800/10 border border-orange-700/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-700 to-amber-800 rounded-lg flex items-center justify-center">
                      <Coins className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 uppercase">Медь</div>
                      <div className="text-xs text-gray-500">10 ММ = 1 СМ</div>
                    </div>
                  </div>
                  <input
                    type="number"
                    value={copper}
                    onChange={(e) => setCopper(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-24 text-3xl font-bold text-orange-400 bg-transparent text-right focus:outline-none focus:ring-2 focus:ring-orange-500 rounded px-2"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateCopper(-10)}
                    className="flex-1 py-2 rounded-lg bg-dark-bg hover:bg-dark-hover transition-all text-sm font-bold"
                  >
                    −10
                  </button>
                  <button
                    onClick={() => updateCopper(-1)}
                    className="flex-1 py-2 rounded-lg bg-dark-bg hover:bg-dark-hover transition-all text-sm font-bold"
                  >
                    −1
                  </button>
                  <button
                    onClick={() => updateCopper(1)}
                    className="flex-1 py-2 rounded-lg bg-dark-bg hover:bg-dark-hover transition-all text-sm font-bold"
                  >
                    +1
                  </button>
                  <button
                    onClick={() => updateCopper(10)}
                    className="flex-1 py-2 rounded-lg bg-dark-bg hover:bg-dark-hover transition-all text-sm font-bold"
                  >
                    +10
                  </button>
                </div>
              </div>
            </div>

            {/* Conversion Buttons */}
            <div className="bg-dark-bg rounded-xl p-3 mb-4 border border-dark-border">
              <div className="text-xs text-gray-400 mb-2 uppercase">Конвертация</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={convertCopperToSilver}
                  disabled={copper < 10}
                  className="py-2 px-3 bg-dark-card border border-dark-border rounded-lg hover:bg-dark-hover transition-all text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  10 ММ → 1 СМ
                </button>
                <button
                  onClick={convertSilverToGold}
                  disabled={silver < 10}
                  className="py-2 px-3 bg-dark-card border border-dark-border rounded-lg hover:bg-dark-hover transition-all text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  10 СМ → 1 ЗМ
                </button>
                <button
                  onClick={convertSilverToCopper}
                  disabled={silver < 1}
                  className="py-2 px-3 bg-dark-card border border-dark-border rounded-lg hover:bg-dark-hover transition-all text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  1 СМ → 10 ММ
                </button>
                <button
                  onClick={convertGoldToSilver}
                  disabled={gold < 1}
                  className="py-2 px-3 bg-dark-card border border-dark-border rounded-lg hover:bg-dark-hover transition-all text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  1 ЗМ → 10 СМ
                </button>
              </div>
            </div>

            {/* Total in Gold */}
            <div className="bg-gradient-to-r from-yellow-500/10 to-amber-600/10 border border-yellow-500/20 rounded-xl p-3 mb-4 text-center">
              <div className="text-xs text-gray-400 mb-1">Всего в золотых</div>
              <div className="text-2xl font-bold text-yellow-400">
                {(gold + silver / 10 + copper / 100).toFixed(2)} ЗМ
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2 bg-dark-bg border border-dark-border rounded-lg hover:bg-dark-hover transition-all text-sm font-semibold"
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-2 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-lg hover:shadow-lg hover:shadow-yellow-500/50 transition-all text-sm font-semibold"
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

