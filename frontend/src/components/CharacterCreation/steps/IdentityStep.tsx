import React from 'react';
import { Compass, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useI18n } from '../../../i18n/I18nProvider';
import { AvatarUpload } from '../../AvatarUpload';

interface IdentityStepProps {
  name: string;
  concept: string;
  avatar: string;
  setName: (value: string) => void;
  setConcept: (value: string) => void;
  setAvatar: (value: string) => void;
}

export const IdentityStep: React.FC<IdentityStepProps> = ({
  name,
  concept,
  avatar,
  setName,
  setConcept,
  setAvatar,
}) => {
  const { t } = useI18n();

  return (
    <motion.section
      key="identity"
      initial={{ opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 14 }}
      className="space-y-4"
    >
      <div className="rounded-2xl border border-blue-400/35 bg-gradient-to-br from-blue-500/[0.08] via-violet-500/[0.04] to-transparent p-6">
        <div className="grid grid-cols-1 md:grid-cols-[140px_minmax(0,1fr)] gap-6 items-start">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-gray-400">{t('creation.portrait')}</div>
            <AvatarUpload currentAvatar={avatar} onAvatarChange={setAvatar} />
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-3">
                <User className="w-4 h-4" />
                {t('basicInfo.name')}
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('basicInfo.namePlaceholder')}
                className="w-full rounded-xl bg-black/50 px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="rounded-xl bg-black/30 p-3 text-xs text-gray-400">
              {t('creation.identityHint')}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-violet-400/35 bg-gradient-to-br from-violet-500/[0.08] via-blue-500/[0.04] to-transparent p-6">
        <label className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-3">
          <Compass className="w-4 h-4" />
          {t('creation.characterConcept')}
        </label>
        <textarea
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          rows={4}
          placeholder={t('creation.characterConceptPlaceholder')}
          className="w-full rounded-xl bg-black/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
        />
      </div>
    </motion.section>
  );
};
