import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Spell, Resource } from '../types';
import { MarkdownText } from './MarkdownText';
import { getLucideIcon } from '../utils/iconUtils';
import { Wand2, Clock, MapPin, Sparkles, X, Edit2, Zap, Target } from 'lucide-react';

interface SpellViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  spell: Spell;
  resource?: Resource;
  onEdit: () => void;
}

export const SpellViewModal: React.FC<SpellViewModalProps> = ({
  isOpen,
  onClose,
  spell,
  resource,
  onEdit,
}) => {
  const getLevelLabel = (level: number) => {
    if (level === 0) return 'Заговор';
    return `${level} круг`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-dark-card rounded-3xl border border-white/10 w-full max-w-lg overflow-hidden flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="relative p-8 pb-6 bg-gradient-to-br from-blue-500/10 to-transparent">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                    {getLucideIcon(spell.iconName || 'Wand2', { className: 'w-6 h-6 text-blue-400' })}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-black text-white leading-tight">{spell.name}</h2>
                      {spell.prepared && (
                        <div className="p-1 rounded-full bg-blue-500/20 text-blue-400" title="Подготовлено">
                          <Sparkles size={12} className="animate-pulse" />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                      <span>{getLevelLabel(spell.level)}</span>
                      <span>•</span>
                      <span>{spell.school}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={onClose} 
                  className="w-10 h-10 rounded-xl hover:bg-white/5 transition-all flex items-center justify-center text-gray-500 hover:text-white border border-transparent hover:border-white/10"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 gap-3 mt-6">
                <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase mb-1">
                    <Clock size={12} className="text-blue-400" />
                    Накладывание
                  </div>
                  <div className="text-sm text-gray-200 font-semibold">{spell.castingTime}</div>
                </div>
                <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase mb-1">
                    <Target size={12} className="text-blue-400" />
                    Дистанция
                  </div>
                  <div className="text-sm text-gray-200 font-semibold">{spell.range}</div>
                </div>
                <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase mb-1">
                    <MapPin size={12} className="text-blue-400" />
                    Компоненты
                  </div>
                  <div className="text-sm text-gray-200 font-semibold">{spell.components}</div>
                </div>
                <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase mb-1">
                    <Clock size={12} className="text-blue-400" />
                    Длительность
                  </div>
                  <div className="text-sm text-gray-200 font-semibold">{spell.duration}</div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              {resource && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-blue-400" />
                    <div>
                      <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Использует ресурс</div>
                      <div className="text-sm font-bold text-white">{resource.name}</div>
                    </div>
                  </div>
                  <div className="text-xl font-black text-blue-400">{resource.current} / {resource.max}</div>
                </div>
              )}

              {spell.description && (
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Описание</div>
                  <div className="text-sm text-gray-300 leading-relaxed italic">
                    <MarkdownText content={spell.description} />
                  </div>
                </div>
              )}

              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Эффект</div>
                <div className="p-5 bg-blue-500/5 border border-blue-500/10 rounded-3xl text-sm text-gray-200 leading-relaxed shadow-inner">
                  <MarkdownText content={spell.effect} />
                </div>
              </div>
            </div>

            <div className="p-8 pt-4 flex gap-3">
              <button
                onClick={onEdit}
                className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-sm font-bold text-white flex items-center justify-center gap-2"
              >
                <Edit2 size={16} />
                Редактировать
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

