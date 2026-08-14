import React from 'react';
import { useI18n } from '../i18n/I18nProvider';

export const LanguageSwitcher: React.FC = () => {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-black/30 border border-white/10">
      <button
        onClick={() => setLocale('ru')}
        className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-colors ${
          locale === 'ru' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-white/5'
        }`}
      >
        {t('lang.ru')}
      </button>
      <button
        onClick={() => setLocale('en')}
        className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-colors ${
          locale === 'en' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-white/5'
        }`}
      >
        {t('lang.en')}
      </button>
    </div>
  );
};
