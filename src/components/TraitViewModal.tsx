import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trait } from '../types';
import { X, Sparkles } from 'lucide-react';
import { MarkdownText } from './MarkdownText';

interface TraitViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  trait: Trait;
  onEdit: () => void;
}

export const TraitViewModal: React.FC<TraitViewModalProps> = ({
  isOpen,
  onClose,
  trait,
  onEdit,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 z-[1050] flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-dark-card rounded-2xl border border-dark-border p-6 w-full max-w-lg shadow-2xl"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{trait.name}</h2>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg hover:bg-dark-hover transition-all flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {trait.description && (
                <div className="mb-6 p-4 bg-dark-bg rounded-xl border border-dark-border">
                  <div className="text-sm text-gray-400 mb-2 uppercase font-semibold">Описание</div>
                  <div className="max-h-60 overflow-y-auto custom-scrollbar pr-2">
                    <MarkdownText content={trait.description} />
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-dark-bg border border-dark-border rounded-xl hover:bg-dark-hover transition-all font-semibold"
                >
                  Закрыть
                </button>
                <button
                  onClick={onEdit}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl hover:shadow-lg hover:shadow-blue-500/50 transition-all font-semibold"
                >
                  Редактировать
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

