import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { InventoryItem } from '../types';
import { Shield, Sword, Box, Zap, Weight, DollarSign, Crosshair, Disc } from 'lucide-react';
import { getLucideIcon } from '../utils/iconUtils';
import { MarkdownText } from './MarkdownText';

interface ItemViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem;
  onEdit: () => void;
}

export const ItemViewModal: React.FC<ItemViewModalProps> = ({
  isOpen,
  onClose,
  item,
  onEdit,
}) => {
  const getIcon = () => {
    if (item.iconName) {
      return (props: any) => getLucideIcon(item.iconName!, { ...props, style: { ...props.style, color: item.color || props.style?.color } });
    }
    switch (item.type) {
      case 'armor': return (props: any) => <Shield {...props} style={{ ...props.style, color: item.color || props.style?.color }} />;
      case 'weapon': 
        const WeaponIcon = item.weaponClass === 'ranged' ? Crosshair : Sword;
        return (props: any) => <WeaponIcon {...props} style={{ ...props.style, color: item.color || props.style?.color }} />;
      case 'ammunition': return (props: any) => <Disc {...props} style={{ ...props.style, color: item.color || props.style?.color }} />;
      default: return (props: any) => <Box {...props} style={{ ...props.style, color: item.color || props.style?.color }} />;
    }
  };

  const getGradient = () => {
    switch (item.type) {
      case 'armor': return 'from-blue-500 to-cyan-500';
      case 'weapon': return 'from-red-500 to-orange-500';
      case 'ammunition': return 'from-orange-500 to-yellow-500';
      default: return 'from-purple-500 to-pink-500';
    }
  };

  const Icon = getIcon();
  const gradient = getGradient();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 z-[1100] flex items-center justify-center p-4"
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
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${!item.color ? `bg-gradient-to-br ${gradient}` : ''}`}
                  style={item.color ? { backgroundColor: `${item.color}20`, border: `1px solid ${item.color}30` } : {}}
                >
                  <Icon className="w-6 h-6 text-white" style={item.color ? { color: item.color } : {}} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{item.name}</h2>
                  <span className="text-xs px-2 py-1 bg-dark-bg rounded-full mt-1 inline-block">
                    {item.type === 'armor' ? 'Броня' : item.type === 'weapon' ? 'Оружие' : item.type === 'ammunition' ? 'Боеприпас' : 'Предмет'}
                  </span>
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
            {item.description && (
              <div className="mb-6 p-4 bg-dark-bg rounded-xl border border-dark-border">
                <div className="text-sm text-gray-400 mb-2">Описание</div>
                <div className="max-h-48 overflow-y-auto custom-scrollbar pr-2">
                  <MarkdownText content={item.description} />
                </div>
              </div>
            )}

            {/* Armor Stats */}
            {item.type === 'armor' && (
              <div className="mb-6 space-y-3">
                <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl p-4">
                  <div className="text-sm text-gray-400 mb-3">Защита</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-gray-500">Базовый КБ</div>
                      <div className="text-2xl font-bold text-blue-400">{item.baseAC}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Мод. Ловкости</div>
                      <div className="text-sm font-semibold">
                        {item.dexModifier ? (item.maxDexModifier !== null ? `Макс +${item.maxDexModifier}` : 'Без огр.') : 'Нет'}
                      </div>
                    </div>
                  </div>
                </div>
                {item.limbACs && (
                  <div className="bg-dark-bg rounded-xl p-3">
                    <div className="text-xs text-gray-400 mb-2">Защита конечностей</div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                        <div className="text-gray-500">Голова</div>
                        <div className="font-bold">{item.limbACs.head}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500">Торс</div>
                        <div className="font-bold">{item.limbACs.torso}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500">Руки</div>
                        <div className="font-bold">{item.limbACs.rightArm}</div>
                      </div>
                      <div className="text-center col-span-3">
                        <div className="text-gray-500">Ноги</div>
                        <div className="font-bold">{item.limbACs.rightLeg}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Weapon Stats */}
            {item.type === 'weapon' && (
              <div className="mb-6 bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-xl p-4">
                <div className="text-sm text-gray-400 mb-3">Характеристики оружия</div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Урон</span>
                    <span className="font-bold text-red-400">{item.damage}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Тип урона</span>
                    <span className="font-semibold">{item.damageType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Класс</span>
                    <span className="font-semibold">{item.weaponClass === 'melee' ? 'Мили' : 'Огнестрел'}</span>
                  </div>
                  {item.weaponClass === 'ranged' && item.ammunitionType && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Боеприпас</span>
                      <span className="font-semibold">{item.ammunitionType}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Item Class */}
            {item.itemClass && (
              <div className="mb-6 p-3 bg-dark-bg rounded-xl">
                <div className="text-xs text-gray-400">Класс предмета</div>
                <div className="font-semibold">{item.itemClass}</div>
              </div>
            )}

            {/* Weight, Cost, Quantity */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-dark-bg rounded-xl p-3 text-center">
                <Weight className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                <div className="text-xs text-gray-400">Вес</div>
                <div className="font-bold">{item.weight % 1 === 0 ? item.weight : item.weight.toFixed(1)}</div>
              </div>
              <div className="bg-dark-bg rounded-xl p-3 text-center">
                <DollarSign className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                <div className="text-xs text-gray-400">Цена</div>
                <div className="font-bold">{item.cost}</div>
              </div>
              {item.quantity !== undefined && (
                <div className="bg-dark-bg rounded-xl p-3 text-center">
                  <Box className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                  <div className="text-xs text-gray-400">Кол-во</div>
                  <div className="font-bold">{item.quantity}</div>
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

