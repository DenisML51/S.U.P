import React from 'react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useI18n } from '../../../i18n/I18nProvider';
import { SaveStatus } from '../CharacterCreationLogic';

interface FinalizeStepProps {
  name: string;
  race: string;
  subrace: string;
  charClass: string;
  subclass: string;
  pointsRemaining: number;
  saveStatus: SaveStatus;
  saveError: string | null;
  onCreate: () => void;
}

export const FinalizeStep: React.FC<FinalizeStepProps> = ({
  name,
  race,
  subrace,
  charClass,
  subclass,
  pointsRemaining,
  saveStatus,
  saveError,
  onCreate,
}) => {
  const { t } = useI18n();
  const canCreate = pointsRemaining === 0 && name.trim() && race.trim() && charClass.trim();

  return (
    <motion.section
      key="finalize"
      initial={{ opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 14 }}
      className="space-y-4"
    >
      <div className="rounded-2xl bg-gradient-to-br from-blue-500/[0.08] via-violet-500/[0.03] to-transparent p-6 space-y-4">
        <h3 className="text-lg font-semibold">{t('creation.finalizeTitle')}</h3>
        <p className="text-sm text-gray-400">{t('creation.finalizeHint')}</p>
        <div className="grid sm:grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-black/35 p-3">
            <div className="text-xs text-gray-500">{t('common.name')}</div>
            <div className="font-semibold">{name || '—'}</div>
          </div>
          <div className="rounded-xl bg-black/35 p-3">
            <div className="text-xs text-gray-500">{t('basicInfo.race')}</div>
            <div className="font-semibold">{race || '—'}</div>
            {subrace ? <div className="text-xs text-gray-500 mt-1">{subrace}</div> : null}
          </div>
          <div className="rounded-xl bg-black/35 p-3">
            <div className="text-xs text-gray-500">{t('basicInfo.class')}</div>
            <div className="font-semibold">{charClass || '—'}</div>
          </div>
          <div className="rounded-xl bg-black/35 p-3">
            <div className="text-xs text-gray-500">{t('basicInfo.subclass')}</div>
            <div className="font-semibold">{subclass || '—'}</div>
          </div>
        </div>
      </div>

      {!canCreate ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {t('creation.fillRequired')}
        </div>
      ) : null}

      {saveError ? (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {saveError}
        </div>
      ) : null}

      <button
        type="button"
        onClick={onCreate}
        disabled={!canCreate || saveStatus === 'saving'}
        className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {saveStatus === 'saving' ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
        {saveStatus === 'saving' ? t('creation.creatingCharacter') : t('creation.createCharacter')}
      </button>
    </motion.section>
  );
};
