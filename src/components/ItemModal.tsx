import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Sword, Box, Zap } from 'lucide-react';
import { InventoryItem, ItemType, WeaponClass } from '../types';

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: InventoryItem;
  onSave: (item: InventoryItem) => void;
  onDelete?: () => void;
}

export const ItemModal: React.FC<ItemModalProps> = ({
  isOpen,
  onClose,
  item,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState(item?.name || '');
  const [type, setType] = useState<ItemType>(item?.type || 'item');
  const [description, setDescription] = useState(item?.description || '');
  const [weight, setWeight] = useState(item?.weight || 0);
  const [cost, setCost] = useState(item?.cost || 0);
  const [quantity, setQuantity] = useState(item?.quantity || 1);
  const [itemClass, setItemClass] = useState(item?.itemClass || '');
  
  // Armor specific
  const [baseAC, setBaseAC] = useState(item?.baseAC || 10);
  const [dexModifier, setDexModifier] = useState(item?.dexModifier ?? true);
  const [maxDexModifier, setMaxDexModifier] = useState<number | null>(item?.maxDexModifier ?? null);
  const [limbACs, setLimbACs] = useState(item?.limbACs || {
    head: 0,
    torso: 0,
    rightArm: 0,
    leftArm: 0,
    rightLeg: 0,
    leftLeg: 0,
  });
  
  // Weapon specific
  const [weaponClass, setWeaponClass] = useState<WeaponClass>(item?.weaponClass || 'melee');
  const [damage, setDamage] = useState(item?.damage || '');
  const [damageType, setDamageType] = useState(item?.damageType || '');
  const [ammunitionType, setAmmunitionType] = useState(item?.ammunitionType || '');

  // Синхронизация состояния с props при открытии модалки
  useEffect(() => {
    if (isOpen) {
      setName(item?.name || '');
      setType(item?.type || 'item');
      setDescription(item?.description || '');
      setWeight(item?.weight || 0);
      setCost(item?.cost || 0);
      setQuantity(item?.quantity || 1);
      setItemClass(item?.itemClass || '');
      setBaseAC(item?.baseAC || 10);
      setDexModifier(item?.dexModifier ?? true);
      setMaxDexModifier(item?.maxDexModifier ?? null);
      setLimbACs(item?.limbACs || {
        head: 0,
        torso: 0,
        rightArm: 0,
        leftArm: 0,
        rightLeg: 0,
        leftLeg: 0,
      });
      setWeaponClass(item?.weaponClass || 'melee');
      setDamage(item?.damage || '');
      setDamageType(item?.damageType || '');
      setAmmunitionType(item?.ammunitionType || '');
    }
  }, [isOpen, item]);

  const handleSave = () => {
    if (!name.trim()) return;
    
    const newItem: InventoryItem = {
      id: item?.id || `item_${Date.now()}`,
      name,
      type,
      equipped: item?.equipped || false,
      weight,
      cost,
      description,
    };

    // Add type-specific fields
    if (type === 'armor') {
      newItem.baseAC = baseAC;
      newItem.dexModifier = dexModifier;
      newItem.maxDexModifier = maxDexModifier;
      newItem.limbACs = limbACs;
    } else if (type === 'weapon') {
      newItem.weaponClass = weaponClass;
      newItem.damage = damage;
      newItem.damageType = damageType;
      if (weaponClass === 'ranged') {
        newItem.ammunitionType = ammunitionType;
      }
    } else if (type === 'ammunition') {
      newItem.quantity = quantity;
    } else if (type === 'item') {
      newItem.quantity = quantity;
      newItem.itemClass = itemClass;
    }
    
    onSave(newItem);
    onClose();
  };

  const typeIcons = {
    armor: Shield,
    weapon: Sword,
    ammunition: Zap,
    item: Box,
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
            className="bg-dark-card rounded-2xl border border-dark-border p-5 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{item ? 'Редактировать предмет' : 'Новый предмет'}</h2>
              <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-dark-hover transition-all flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              {/* Type Selector */}
              <div>
                <div className="text-xs text-gray-400 mb-2 uppercase">Тип предмета</div>
                <div className="grid grid-cols-4 gap-2">
                  {(['armor', 'weapon', 'ammunition', 'item'] as ItemType[]).map((t) => {
                    const Icon = typeIcons[t];
                    const labels = { armor: 'Броня', weapon: 'Оружие', ammunition: 'Боеприпас', item: 'Предмет' };
                    return (
                      <button
                        key={t}
                        onClick={() => setType(t)}
                        className={`py-2 px-2 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-1.5 ${
                          type === t
                            ? 'bg-blue-500 text-white'
                            : 'bg-dark-bg border border-dark-border hover:bg-dark-hover'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {labels[t]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Name */}
              <div>
                <div className="text-xs text-gray-400 mb-1.5 uppercase">Название</div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Название предмета..."
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Common fields for all except ammunition */}
              {type !== 'ammunition' && (
                <div>
                  <div className="text-xs text-gray-400 mb-1.5 uppercase">Описание</div>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    placeholder="Описание предмета..."
                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              )}

              {/* Weight & Cost */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-xs text-gray-400 mb-1.5 uppercase">Вес</div>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                      setWeight(Math.max(0, val));
                    }}
                    step="0.1"
                    min="0"
                    placeholder="0"
                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1.5 uppercase">Стоимость</div>
                  <input
                    type="number"
                    value={cost}
                    onChange={(e) => setCost(Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="0"
                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {(type === 'item' || type === 'ammunition') && (
                  <div>
                    <div className="text-xs text-gray-400 mb-1.5 uppercase">Количество</div>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      placeholder="1"
                      className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* Item Class for regular items */}
              {type === 'item' && (
                <div>
                  <div className="text-xs text-gray-400 mb-1.5 uppercase">Класс предмета</div>
                  <input
                    type="text"
                    value={itemClass}
                    onChange={(e) => setItemClass(e.target.value)}
                    placeholder="Зелье, инструмент, материал..."
                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Weapon-specific fields */}
              {type === 'weapon' && (
                <div className="border-t border-dark-border pt-3 mt-3">
                  <div className="text-sm font-semibold mb-3">Параметры оружия</div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <div className="text-xs text-gray-400 mb-1.5 uppercase">Класс оружия</div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setWeaponClass('melee')}
                          className={`py-2 rounded-lg font-semibold text-xs transition-all ${
                            weaponClass === 'melee'
                              ? 'bg-blue-500 text-white'
                              : 'bg-dark-bg border border-dark-border hover:bg-dark-hover'
                          }`}
                        >
                          Мили
                        </button>
                        <button
                          onClick={() => setWeaponClass('ranged')}
                          className={`py-2 rounded-lg font-semibold text-xs transition-all ${
                            weaponClass === 'ranged'
                              ? 'bg-blue-500 text-white'
                              : 'bg-dark-bg border border-dark-border hover:bg-dark-hover'
                          }`}
                        >
                          Огнестрел
                        </button>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1.5 uppercase">Урон</div>
                      <input
                        type="text"
                        value={damage}
                        onChange={(e) => setDamage(e.target.value)}
                        placeholder="1d6+2"
                        className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-gray-400 mb-1.5 uppercase">Тип урона</div>
                      <input
                        type="text"
                        value={damageType}
                        onChange={(e) => setDamageType(e.target.value)}
                        placeholder="Колющий, рубящий..."
                        className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    {weaponClass === 'ranged' && (
                      <div>
                        <div className="text-xs text-gray-400 mb-1.5 uppercase">Тип боеприпаса</div>
                        <input
                          type="text"
                          value={ammunitionType}
                          onChange={(e) => setAmmunitionType(e.target.value)}
                          placeholder="Стрелы, пули..."
                          className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Armor-specific fields */}
              {type === 'armor' && (
                <div className="border-t border-dark-border pt-3 mt-3">
                  <div className="text-sm font-semibold mb-3">Параметры брони</div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <div className="text-xs text-gray-400 mb-1.5 uppercase">Базовый КБ</div>
                      <input
                        type="number"
                        value={baseAC}
                        onChange={(e) => setBaseAC(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 p-2 bg-dark-bg rounded-lg border border-dark-border cursor-pointer hover:border-blue-500 transition-all mb-3">
                    <input
                      type="checkbox"
                      checked={dexModifier}
                      onChange={(e) => setDexModifier(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Добавлять модификатор Ловкости</span>
                  </label>

                  {dexModifier && (
                    <div className="mb-3">
                      <div className="text-xs text-gray-400 mb-1.5 uppercase">Макс. мод. Ловкости</div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setMaxDexModifier(null)}
                          className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                            maxDexModifier === null
                              ? 'bg-blue-500 text-white'
                              : 'bg-dark-bg border border-dark-border hover:bg-dark-hover'
                          }`}
                        >
                          Нет огр.
                        </button>
                        <input
                          type="number"
                          value={maxDexModifier ?? ''}
                          onChange={(e) => setMaxDexModifier(e.target.value ? Math.max(0, parseInt(e.target.value) || 0) : null)}
                          placeholder="2"
                          className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-2 py-1.5 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-xs text-gray-400 mb-2 uppercase">Защита конечностей</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Голова</div>
                        <input
                          type="number"
                          value={limbACs.head}
                          onChange={(e) => setLimbACs({ ...limbACs, head: Math.max(0, parseInt(e.target.value) || 0) })}
                          className="w-full bg-dark-bg border border-dark-border rounded px-2 py-1.5 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Торс</div>
                        <input
                          type="number"
                          value={limbACs.torso}
                          onChange={(e) => setLimbACs({ ...limbACs, torso: Math.max(0, parseInt(e.target.value) || 0) })}
                          className="w-full bg-dark-bg border border-dark-border rounded px-2 py-1.5 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Правая рука</div>
                        <input
                          type="number"
                          value={limbACs.rightArm}
                          onChange={(e) => setLimbACs({ ...limbACs, rightArm: Math.max(0, parseInt(e.target.value) || 0) })}
                          className="w-full bg-dark-bg border border-dark-border rounded px-2 py-1.5 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Левая рука</div>
                        <input
                          type="number"
                          value={limbACs.leftArm}
                          onChange={(e) => setLimbACs({ ...limbACs, leftArm: Math.max(0, parseInt(e.target.value) || 0) })}
                          className="w-full bg-dark-bg border border-dark-border rounded px-2 py-1.5 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Правая нога</div>
                        <input
                          type="number"
                          value={limbACs.rightLeg}
                          onChange={(e) => setLimbACs({ ...limbACs, rightLeg: Math.max(0, parseInt(e.target.value) || 0) })}
                          className="w-full bg-dark-bg border border-dark-border rounded px-2 py-1.5 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Левая нога</div>
                        <input
                          type="number"
                          value={limbACs.leftLeg}
                          onChange={(e) => setLimbACs({ ...limbACs, leftLeg: Math.max(0, parseInt(e.target.value) || 0) })}
                          className="w-full bg-dark-bg border border-dark-border rounded px-2 py-1.5 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-4">
              {item && onDelete && (
                <button
                  onClick={() => { onDelete(); onClose(); }}
                  className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 transition-all text-sm font-semibold"
                >
                  Удалить
                </button>
              )}
              <button
                onClick={onClose}
                className="flex-1 py-2 bg-dark-bg border border-dark-border rounded-lg hover:bg-dark-hover transition-all text-sm font-semibold"
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                disabled={!name.trim()}
                className="flex-1 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg hover:shadow-lg transition-all text-sm font-semibold disabled:opacity-50"
              >
                Сохранить
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
