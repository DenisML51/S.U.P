import React from 'react';
import { CheckCircle2, List } from 'lucide-react';
import { motion } from 'framer-motion';
import { useI18n } from '../../../i18n/I18nProvider';

interface CharacterCompleteStepProps {
  name: string;
  onOpenSheet: () => void;
  onBackToRoster: () => void;
}

export const CharacterCompleteStep: React.FC<CharacterCompleteStepProps> = ({
  name,
  onOpenSheet,
  onBackToRoster,
}) => {
  const { t } = useI18n();

  return (
    <motion.section
      key="complete"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-gradient-to-br from-emerald-500/20 via-blue-500/[0.06] to-transparent p-8 text-center"
    >
      <CheckCircle2 className="w-12 h-12 text-emerald-300 mx-auto" />
      <h2 className="text-2xl font-semibold mt-4">{t('creation.completeTitle')}</h2>
      <p className="text-gray-300 mt-2">
        {t('creation.completeHint')} <span className="font-semibold text-white">{name || t('creation.unnamedHero')}</span>
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onOpenSheet}
          className="px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold"
        >
          {t('creation.openSheet')}
        </button>
        <button
          type="button"
          onClick={onBackToRoster}
          className="px-5 py-2.5 rounded-xl bg-white/[0.08] text-gray-200 font-semibold inline-flex items-center gap-2"
        >
          <List className="w-4 h-4" />
          {t('creation.backToRoster')}
        </button>
      </div>
    </motion.section>
  );
};
