import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Character } from '../types';
import { X, User, Sparkles } from 'lucide-react';
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
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
              className="bg-dark-card rounded-2xl border border-dark-border p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <User className="w-6 h-6" />
                  {t('basicInfo.title')}
                </h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg hover:bg-dark-hover transition-all flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-3 text-gray-300">
                    {t('basicInfo.name')}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('basicInfo.namePlaceholder')}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    onKeyPress={(e) => e.key === 'Enter' && handleSave()}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-3 text-gray-300">{t('basicInfo.race')}</label>
                  <input
                    type="text"
                    value={race}
                    onChange={(e) => setRace(e.target.value)}
                    placeholder={t('basicInfo.racePlaceholder')}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-3 text-gray-300">{t('basicInfo.subrace')}</label>
                  <input
                    type="text"
                    value={subrace}
                    onChange={(e) => setSubrace(e.target.value)}
                    placeholder={t('basicInfo.subracePlaceholder')}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  />
                </div>

                <div>
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
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-3 text-gray-300">{t('basicInfo.subclass')}</label>
                  <input
                    type="text"
                    value={subclass}
                    onChange={(e) => setSubclass(e.target.value)}
                    placeholder={t('basicInfo.subclassPlaceholder')}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-dark-bg border border-dark-border rounded-xl hover:bg-dark-hover transition-all font-semibold"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSave}
                  disabled={!name.trim() || !race || !charClass}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl hover:shadow-lg hover:shadow-blue-500/50 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('common.save')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

