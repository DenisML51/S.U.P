import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trait } from '../types';
import { X, Sparkles, Plus } from 'lucide-react';
import { MarkdownEditor } from './MarkdownEditor';
import { useI18n } from '../i18n/I18nProvider';

interface TraitModalProps {
  isOpen: boolean;
  onClose: () => void;
  trait?: Trait;
  onSave: (trait: Trait) => void;
  onDelete?: () => void;
}

export const TraitModal: React.FC<TraitModalProps> = ({
  isOpen,
  onClose,
  trait,
  onSave,
  onDelete,
}) => {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (trait) {
      setName(trait.name);
      setDescription(trait.description);
    } else {
      setName('');
      setDescription('');
    }
  }, [trait, isOpen]);

  const handleSave = () => {
    if (!name.trim()) return;

    const newTrait: Trait = {
      id: trait?.id || `trait_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      description: description.trim(),
    };

    onSave(newTrait);
    onClose();
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
            className="bg-dark-card rounded-2xl border border-dark-border w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
          >
            <div className="p-6 border-b border-dark-border flex items-center justify-between bg-dark-card/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{trait ? t('traitModal.editTitle') : t('traitModal.newTitle')}</h2>
                  <p className="text-xs text-gray-400">{t('traitModal.subtitle')}</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="w-8 h-8 rounded-lg hover:bg-dark-hover transition-all flex items-center justify-center text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('traitModal.nameLabel')}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('traitModal.namePlaceholder')}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  onKeyPress={(e) => e.key === 'Enter' && handleSave()}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Plus className="w-3 h-3 text-purple-400" />
                  {t('traitModal.descriptionLabel')}
                </label>
                <MarkdownEditor
                  value={description}
                  onChange={setDescription}
                  placeholder={t('traitModal.descriptionPlaceholder')}
                  rows={8}
                  minHeight="200px"
                />
              </div>
            </div>

            <div className="p-6 bg-dark-card/50 backdrop-blur-sm border-t border-dark-border flex gap-3">
              {onDelete && trait && (
                <button
                  onClick={() => { onDelete(); onClose(); }}
                  className="px-4 py-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/20 transition-all text-sm font-bold flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  {t('common.delete')}
                </button>
              )}
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-dark-bg border border-dark-border rounded-xl hover:bg-dark-hover transition-all text-sm font-bold text-gray-400"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={!name.trim()}
                className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl hover:shadow-lg hover:shadow-purple-500/40 transition-all text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('traitModal.save')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

