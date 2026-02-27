import React from 'react';
import { motion } from 'framer-motion';
import { User, Sparkles, TrendingUp } from 'lucide-react';
import { useI18n } from '../../../i18n/I18nProvider';

interface BasicInfoStepProps {
  name: string;
  setName: (name: string) => void;
  race: string;
  setRace: (race: string) => void;
  subrace: string;
  setSubrace: (subrace: string) => void;
  charClass: string;
  setCharClass: (charClass: string) => void;
  subclass: string;
  setSubclass: (subclass: string) => void;
  speed: number;
  setSpeed: (speed: number) => void;
  isBasicValid: boolean;
  setCurrentStep: (step: any) => void;
}

export const BasicInfoStep: React.FC<BasicInfoStepProps> = ({
  name, setName,
  race, setRace,
  subrace, setSubrace,
  charClass, setCharClass,
  subclass, setSubclass,
  speed, setSpeed,
  isBasicValid,
  setCurrentStep,
}) => {
  const { t } = useI18n();
  return (
    <motion.div
      key="basic"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-6"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-dark-card to-dark-bg rounded-2xl p-6 border border-dark-border shadow-lg"
      >
        <label className="block text-sm font-semibold mb-3 text-gray-300 flex items-center gap-2">
          <User className="w-4 h-4" />
          {t('basicInfo.name')}
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('basicInfo.namePlaceholder')}
          className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
        />
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-dark-card to-dark-bg rounded-2xl p-6 border border-dark-border shadow-lg"
      >
        <label className="block text-sm font-semibold mb-3 text-gray-300">{t('basicInfo.race')}</label>
        <input
          type="text"
          value={race}
          onChange={(e) => setRace(e.target.value)}
          placeholder={t('basicInfo.racePlaceholder')}
          className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-gradient-to-br from-dark-card to-dark-bg rounded-2xl p-6 border border-dark-border shadow-lg"
      >
        <label className="block text-sm font-semibold mb-3 text-gray-300">{t('basicInfo.subrace')}</label>
        <input
          type="text"
          value={subrace}
          onChange={(e) => setSubrace(e.target.value)}
          placeholder={t('basicInfo.subracePlaceholder')}
          className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
        />
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-dark-card to-dark-bg rounded-2xl p-6 border border-dark-border shadow-lg"
      >
        <label className="block text-sm font-semibold mb-3 text-gray-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          {t('basicInfo.class')}
        </label>
        <input
          type="text"
          value={charClass}
          onChange={(e) => setCharClass(e.target.value)}
          placeholder={t('basicInfo.classPlaceholder')}
          className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gradient-to-br from-dark-card to-dark-bg rounded-2xl p-6 border border-dark-border shadow-lg"
      >
        <label className="block text-sm font-semibold mb-3 text-gray-300">{t('basicInfo.subclass')}</label>
        <input
          type="text"
          value={subclass}
          onChange={(e) => setSubclass(e.target.value)}
          placeholder={t('basicInfo.subclassPlaceholder')}
          className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-gradient-to-br from-dark-card to-dark-bg rounded-2xl p-6 border border-dark-border shadow-lg"
      >
        <label className="block text-sm font-semibold mb-3 text-gray-300">{t('creation.speed')}</label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSpeed(Math.max(0, speed - 5))}
            className="w-12 h-12 rounded-xl bg-dark-bg border border-dark-border hover:bg-dark-hover transition-all text-2xl font-bold flex items-center justify-center"
          >
            −
          </button>
          <input
            type="number"
            value={speed}
            onChange={(e) => setSpeed(parseInt(e.target.value) || 0)}
            className="flex-1 bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
          <button
            onClick={() => setSpeed(speed + 5)}
            className="w-12 h-12 rounded-xl bg-dark-bg border border-dark-border hover:bg-dark-hover transition-all text-2xl font-bold flex items-center justify-center"
          >
            +
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex justify-end"
      >
        <button
          onClick={() => isBasicValid && setCurrentStep('attributes')}
          disabled={!isBasicValid}
          className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-blue-500/50 transition-all flex items-center gap-2"
        >
          {t('creation.nextAttributes')}
          <TrendingUp className="w-5 h-5" />
        </button>
      </motion.div>
    </motion.div>
  );
};

