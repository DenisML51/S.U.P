import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Character } from '../types';
import { X, User, Sparkles, BookUser, Shield, Fingerprint } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';

interface BasicInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: Character;
  onSave: (updatedCharacter: Character) => void;
}

export const BasicInfoModal: React.FC<BasicInfoModalProps> = ({
  isOpen,
  onClose,
  character,
  onSave,
}) => {
  const { t } = useI18n();
  const [name, setName] = useState(character.name);
  const [race, setRace] = useState(character.race);
  const [subrace, setSubrace] = useState(character.subrace || '');
  const [charClass, setCharClass] = useState(character.class);
  const [subclass, setSubclass] = useState(character.subclass);

  useEffect(() => {
    if (isOpen) {
      setName(character.name);
      setRace(character.race);
      setSubrace(character.subrace || '');
      setCharClass(character.class);
      setSubclass(character.subclass);
    }
  }, [isOpen, character]);

  const handleSave = () => {
    if (!name.trim()) return;

    const updatedCharacter: Character = {
      ...character,
      name: name.trim(),
      race,
      subrace: subrace || undefined,
      class: charClass,
      subclass,
    };

    onSave(updatedCharacter);
    onClose();
  };

  const canSave = Boolean(name.trim() && race.trim() && charClass.trim());

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 18 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30, mass: 0.85 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#171b26] to-[#10131d] shadow-[0_30px_90px_rgba(0,0,0,0.55)]"
            >
              <div className="border-b border-white/10 px-6 py-5 md:px-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-blue-200">
                      <BookUser className="h-3.5 w-3.5" />
                      Профиль героя
                    </div>
                    <h2 className="flex items-center gap-2 text-2xl font-black text-white">
                      <User className="h-6 w-6 text-blue-300" />
                      {t('basicInfo.title')}
                    </h2>
                    <p className="mt-1 text-xs text-gray-400">
                      Обновите ключевые данные персонажа для листа и лобби.
                    </p>
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
                <div className="mb-6 rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2">
                      <div className="text-[9px] font-black uppercase tracking-[0.16em] text-blue-300/75">
                        {t('basicInfo.name')}
                      </div>
                      <div className="mt-1 truncate text-sm font-bold text-blue-100">{name || '—'}</div>
                    </div>
                    <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 px-3 py-2">
                      <div className="text-[9px] font-black uppercase tracking-[0.16em] text-purple-300/75">
                        {t('basicInfo.class')}
                      </div>
                      <div className="mt-1 truncate text-sm font-bold text-purple-100">{charClass || '—'}</div>
                    </div>
                    <div className="rounded-xl border border-pink-500/20 bg-pink-500/10 px-3 py-2">
                      <div className="text-[9px] font-black uppercase tracking-[0.16em] text-pink-300/75">
                        {t('basicInfo.race')}
                      </div>
                      <div className="mt-1 truncate text-sm font-bold text-pink-100">{race || '—'}</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-gray-400">
                      <User className="h-3.5 w-3.5 text-blue-300" />
                      {t('basicInfo.name')}
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('basicInfo.namePlaceholder')}
                      className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-base text-white outline-none transition-all placeholder:text-gray-500 focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/25"
                      onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-gray-400">
                      <Fingerprint className="h-3.5 w-3.5 text-pink-300" />
                      {t('basicInfo.race')}
                    </label>
                    <input
                      type="text"
                      value={race}
                      onChange={(e) => setRace(e.target.value)}
                      placeholder={t('basicInfo.racePlaceholder')}
                      className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-gray-500 focus:border-pink-400/60 focus:ring-2 focus:ring-pink-500/25"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-gray-400">
                      <Sparkles className="h-3.5 w-3.5 text-violet-300" />
                      {t('basicInfo.class')}
                    </label>
                    <input
                      type="text"
                      value={charClass}
                      onChange={(e) => setCharClass(e.target.value)}
                      placeholder={t('basicInfo.classPlaceholder')}
                      className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-gray-500 focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/25"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-gray-400">
                      <Shield className="h-3.5 w-3.5 text-cyan-300" />
                      {t('basicInfo.subclass')}
                    </label>
                    <input
                      type="text"
                      value={subclass}
                      onChange={(e) => setSubclass(e.target.value)}
                      placeholder={t('basicInfo.subclassPlaceholder')}
                      className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-gray-500 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-500/25"
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-1.5">
                  <label className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-gray-400">
                    <Fingerprint className="h-3.5 w-3.5 text-amber-300" />
                    {t('basicInfo.subrace')}
                  </label>
                  <input
                    type="text"
                    value={subrace}
                    onChange={(e) => setSubrace(e.target.value)}
                    placeholder={t('basicInfo.subracePlaceholder')}
                    className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-gray-500 focus:border-amber-400/60 focus:ring-2 focus:ring-amber-500/25"
                  />
                </div>
              </div>

              <div className="border-t border-white/10 bg-black/25 px-6 py-4 md:px-8">
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  onClick={onClose}
                    className="rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm font-semibold text-gray-300 transition-all hover:bg-black/35 hover:text-white"
                >
                    {t('common.cancel')}
                </button>
                <button
                    onClick={handleSave}
                    disabled={!canSave}
                    className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 px-5 py-2.5 text-sm font-bold text-white transition-all hover:shadow-lg hover:shadow-blue-500/30 disabled:cursor-not-allowed disabled:opacity-50"
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

