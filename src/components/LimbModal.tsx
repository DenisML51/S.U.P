import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Limb, getLimbInjuryLevel } from '../types';
import { useI18n } from '../i18n/I18nProvider';
import { getLimbInjuryDescription, getLimbLabel } from '../i18n/domainLabels';

interface LimbModalProps {
  isOpen: boolean;
  onClose: () => void;
  limb: Limb;
  limbType: 'head' | 'arm' | 'leg' | 'torso';
  onUpdate: (updatedLimb: Limb) => void;
}

export const LimbModal: React.FC<LimbModalProps> = ({
  isOpen,
  onClose,
  limb,
  limbType,
  onUpdate,
}) => {
  const { t } = useI18n();
  const [currentHP, setCurrentHP] = useState(limb.currentHP);
  const [damageAmount, setDamageAmount] = useState('');
  const [healAmount, setHealAmount] = useState('');

  useEffect(() => {
    setCurrentHP(limb.currentHP);
    setDamageAmount('');
    setHealAmount('');
  }, [limb.id, limb.currentHP, isOpen]);

  const maxHP = limb.maxHP;
  const ac = limb.ac;
  const injuryLevel = getLimbInjuryLevel(currentHP);
  const injuryDesc = injuryLevel !== 'none'
    ? getLimbInjuryDescription(limbType, injuryLevel, t)
    : undefined;

  const handleDamage = () => {
    const amount = parseInt(damageAmount);
    if (!isNaN(amount) && amount > 0) {
      setCurrentHP(currentHP - amount);
      setDamageAmount('');
    }
  };

  const handleHeal = () => {
    const amount = parseInt(healAmount);
    if (!isNaN(amount) && amount > 0) {
      setCurrentHP(Math.min(maxHP, currentHP + amount));
      setHealAmount('');
    }
  };

  const handleSave = () => {
    onUpdate({ ...limb, currentHP });
    onClose();
  };

  const getInjuryColor = () => {
    switch (injuryLevel) {
      case 'destroyed': return 'border-red-600 bg-red-500/10';
      case 'severe': return 'border-orange-500 bg-orange-500/10';
      case 'light': return 'border-yellow-500 bg-yellow-500/10';
      default: return 'border-green-500 bg-green-500/10';
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
          className="fixed inset-0 bg-black/70 z-[1100] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-dark-card rounded-2xl border border-dark-border p-5 w-full max-w-md"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{getLimbLabel(limb.id, limb.name, t)}</h2>
              <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-dark-hover transition-all flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className={`rounded-xl p-4 border-2 ${getInjuryColor()}`}>
                <div className="text-xs text-gray-400 mb-1 text-center">{t('limb.health')}</div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{currentHP}</div>
                  <div className="text-xs text-gray-400">/ {maxHP}</div>
                </div>
              </div>

              <div className="rounded-xl p-4 border-2 border-blue-500/50 bg-blue-500/10">
                <div className="text-xs text-gray-400 mb-1 text-center">{t('limb.ac')}</div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-400">{ac}</div>
                </div>
              </div>
            </div>

            {injuryLevel !== 'none' && injuryDesc && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 mb-4">
                <div className="text-xs font-bold text-red-400 mb-1">{t('limb.injury')}</div>
                <div className="text-sm">{injuryDesc}</div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <div className="text-xs text-gray-400 mb-2 uppercase">{t('common.damage')}</div>
                <div className="relative bg-dark-bg border border-dark-border rounded-lg overflow-hidden">
                  <input
                    type="number"
                    value={damageAmount}
                    onChange={(e) => setDamageAmount(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleDamage()}
                    placeholder="0"
                    className="w-full bg-transparent px-3 py-2 text-center focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg"
                  />
                  <button
                    onClick={handleDamage}
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/30 transition-all font-bold flex items-center justify-center"
                  >
                    −
                  </button>
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-400 mb-2 uppercase">{t('limb.healing')}</div>
                <div className="relative bg-dark-bg border border-dark-border rounded-lg overflow-hidden">
                  <input
                    type="number"
                    value={healAmount}
                    onChange={(e) => setHealAmount(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleHeal()}
                    placeholder="0"
                    className="w-full bg-transparent px-3 py-2 text-center focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg"
                  />
                  <button
                    onClick={handleHeal}
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 bg-green-500/20 border border-green-500/50 text-green-400 rounded-lg hover:bg-green-500/30 transition-all font-bold flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setCurrentHP(maxHP)}
                className="flex-1 py-2 bg-blue-500/20 border border-blue-500/50 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all text-sm font-semibold"
              >
                {t('limb.fullHeal')}
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg hover:shadow-lg transition-all text-sm font-semibold"
              >
                {t('common.save')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

