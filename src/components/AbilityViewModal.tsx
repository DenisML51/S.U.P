import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ability, Resource } from '../types';
import { Sparkles, Zap, Sword } from 'lucide-react';
import { getLucideIcon } from '../utils/iconUtils';
import { MarkdownText } from './MarkdownText';
import { DAMAGE_TYPE_COLORS, getDamageTypeIcon } from '../utils/damageUtils';

interface AbilityViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  ability: Ability;
  resource?: Resource;
  onEdit: () => void;
}

export const AbilityViewModal: React.FC<AbilityViewModalProps> = ({
  isOpen,
  onClose,
  ability,
  resource,
  onEdit,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
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
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center border shadow-lg"
                  style={{ 
                    backgroundColor: `${ability.color || '#a855f7'}20`,
                    borderColor: `${ability.color || '#a855f7'}40`,
                    color: ability.color || '#a855f7'
                  }}
                >
                  {getLucideIcon(ability.iconName || 'Zap', { size: 24 })}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{ability.name}</h2>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="w-8 h-8 rounded-lg hover:bg-dark-hover transition-all flex items-center justify-center"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Description */}
            {ability.description && (
              <div className="mb-6 p-4 bg-dark-bg rounded-xl border border-dark-border">
                <div className="text-sm text-gray-400 mb-2">Описание</div>
                <div className="max-h-32 overflow-y-auto custom-scrollbar pr-2">
                  <MarkdownText content={ability.description} />
                </div>
              </div>
            )}

            {/* Action Type & Resource */}
            <div className="grid gap-3 mb-6">
              <div className="p-3 bg-dark-bg rounded-lg flex items-center justify-between">
                <span className="text-sm text-gray-400">Тип действия</span>
                <span className={`font-semibold px-3 py-1 rounded-full text-sm ${
                  ability.actionType === 'action' ? 'bg-blue-500/20 text-blue-400' :
                  ability.actionType === 'bonus' ? 'bg-green-500/20 text-green-400' :
                  'bg-orange-500/20 text-orange-400'
                }`}>
                  {ability.actionType === 'action' ? 'Основное' :
                   ability.actionType === 'bonus' ? 'Бонусное' : 'Реакция'}
                </span>
              </div>

              {resource && (
                <div 
                  className="p-4 border rounded-xl"
                  style={{ 
                    backgroundColor: `${resource.color || '#a855f7'}10`,
                    borderColor: `${resource.color || '#a855f7'}30`
                  }}
                >
                  <div className="flex items-center gap-3">
                    {resource.iconName && (
                      <div className="w-10 h-10 bg-dark-card rounded-lg flex items-center justify-center">
                        {getLucideIcon(resource.iconName, { 
                          className: "w-5 h-5",
                          style: { color: resource.color || '#a855f7' }
                        })}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="text-sm text-gray-400">Тратит ресурс</div>
                      <div 
                        className="font-semibold"
                        style={{ color: resource.color || '#a855f7' }}
                      >
                        {ability.resourceCost} {resource.name}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {ability.damageComponents && ability.damageComponents.length > 0 ? (
                ability.damageComponents.map((comp, idx) => (
                  <div 
                    key={idx}
                    className="p-4 border rounded-xl"
                    style={{ 
                      backgroundColor: `${DAMAGE_TYPE_COLORS[comp.type || ''] || '#ef4444'}10`,
                      borderColor: `${DAMAGE_TYPE_COLORS[comp.type || ''] || '#ef4444'}30`
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-dark-card rounded-lg flex items-center justify-center">
                        <div style={{ color: DAMAGE_TYPE_COLORS[comp.type || ''] || '#ef4444' }}>
                          {getDamageTypeIcon(comp.type || '', 20)}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-gray-400">Урон</div>
                        <div 
                          className="text-lg font-black"
                          style={{ color: DAMAGE_TYPE_COLORS[comp.type || ''] || '#ef4444' }}
                        >
                          {comp.damage} {comp.type && <span className="text-xs uppercase ml-1 opacity-60">{comp.type}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : ability.damage && (
                <div 
                  className="p-4 border rounded-xl"
                  style={{ 
                    backgroundColor: `${DAMAGE_TYPE_COLORS[ability.damageType || ''] || '#ef4444'}10`,
                    borderColor: `${DAMAGE_TYPE_COLORS[ability.damageType || ''] || '#ef4444'}30`
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-dark-card rounded-lg flex items-center justify-center">
                      <div style={{ color: DAMAGE_TYPE_COLORS[ability.damageType || ''] || '#ef4444' }}>
                        {getDamageTypeIcon(ability.damageType || '', 20)}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-gray-400">Урон</div>
                      <div 
                        className="text-lg font-black"
                        style={{ color: DAMAGE_TYPE_COLORS[ability.damageType || ''] || '#ef4444' }}
                      >
                        {ability.damage} {ability.damageType && <span className="text-xs uppercase ml-1 opacity-60">{ability.damageType}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Effect */}
            <div className="mb-6">
              <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-blue-400" />
                  <div className="text-sm font-semibold text-blue-400">Эффект</div>
                </div>
                <div className="max-h-48 overflow-y-auto custom-scrollbar pr-2">
                  <MarkdownText content={ability.effect} />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-dark-bg border border-dark-border rounded-xl hover:bg-dark-hover transition-all font-semibold"
              >
                Закрыть
              </button>
              <button
                onClick={onEdit}
                className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl hover:shadow-lg transition-all font-semibold"
              >
                Редактировать
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

