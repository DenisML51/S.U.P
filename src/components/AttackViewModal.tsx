import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Attack, ATTRIBUTES_LIST } from '../types';
import { Sword, Target, Zap } from 'lucide-react';
import { MarkdownText } from './MarkdownText';
import { getLucideIcon } from '../utils/iconUtils';

interface AttackViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  attack: Attack;
  onEdit: () => void;
}

export const AttackViewModal: React.FC<AttackViewModalProps> = ({
  isOpen,
  onClose,
  attack,
  onEdit,
}) => {
  const attributeName = ATTRIBUTES_LIST.find(a => a.id === attack.attribute)?.name || 'Сила';

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
            className="bg-dark-card rounded-2xl border border-dark-border p-6 w-full max-w-lg"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center border shadow-lg"
                  style={{ 
                    backgroundColor: `${attack.color || (attack.weaponId ? '#ef4444' : '#a855f7')}20`,
                    borderColor: `${attack.color || (attack.weaponId ? '#ef4444' : '#a855f7')}40`,
                    color: attack.color || (attack.weaponId ? '#ef4444' : '#a855f7')
                  }}
                >
                  {getLucideIcon(attack.iconName || (attack.weaponId ? 'Sword' : 'Zap'), { size: 24 })}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{attack.name}</h2>
                  {attack.weaponId && (
                    <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full mt-1 inline-block">
                      От оружия
                    </span>
                  )}
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
            {attack.description && (
              <div className="mb-6 p-4 bg-dark-bg rounded-xl border border-dark-border">
                <div className="text-sm text-gray-400 mb-2">Описание</div>
                <MarkdownText content={attack.description} />
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl p-4 text-center">
                <Target className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                <div className="text-xs text-gray-400 mb-1">Бонус к попаданию</div>
                <div className="text-3xl font-bold text-blue-400">
                  {attack.hitBonus >= 0 ? '+' : ''}{attack.hitBonus}
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                <Sword className="w-5 h-5 text-red-400 mx-auto mb-2" />
                <div className="text-xs text-gray-400 mb-1">Урон</div>
                <div className="text-2xl font-bold text-red-400">{attack.damage}</div>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between p-3 bg-dark-bg rounded-lg">
                <span className="text-sm text-gray-400">Тип урона</span>
                <span className="font-semibold">{attack.damageType}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-dark-bg rounded-lg">
                <span className="text-sm text-gray-400">Характеристика</span>
                <span className="font-semibold">{attributeName}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-dark-bg rounded-lg">
                <span className="text-sm text-gray-400">Тип действия</span>
                <span className={`font-semibold px-3 py-1 rounded-full text-sm ${
                  attack.actionType === 'action' ? 'bg-blue-500/20 text-blue-400' :
                  attack.actionType === 'bonus' ? 'bg-green-500/20 text-green-400' :
                  'bg-orange-500/20 text-orange-400'
                }`}>
                  {attack.actionType === 'action' ? 'Основное' :
                   attack.actionType === 'bonus' ? 'Бонусное' : 'Реакция'}
                </span>
              </div>

              {attack.usesAmmunition && (
                <div className="flex items-center gap-2 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                  <Zap className="w-4 h-4 text-orange-400" />
                  <span className="text-sm text-orange-400">
                    Тратит {attack.ammunitionCost} боеприпас(а) за атаку
                  </span>
                </div>
              )}
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

