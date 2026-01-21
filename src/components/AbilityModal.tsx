import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ability, Resource, DAMAGE_TYPES, DamageComponent } from '../types';
import { MarkdownEditor } from './MarkdownEditor';
import { CustomSelect } from './CustomSelect';
import { IconPicker } from './IconPicker';
import { getLucideIcon } from '../utils/iconUtils';
import { DAMAGE_TYPE_COLORS } from '../utils/damageUtils';
import { Sparkles, Zap, Clock, X, Minus, Plus, Sword, Trash2 } from 'lucide-react';

interface AbilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  ability?: Ability;
  resources: Resource[];
  onSave: (ability: Ability) => void;
  onDelete?: () => void;
}

export const AbilityModal: React.FC<AbilityModalProps> = ({
  isOpen,
  onClose,
  ability,
  resources,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState(ability?.name || '');
  const [description, setDescription] = useState(ability?.description || '');
  const [actionType, setActionType] = useState(ability?.actionType || 'action');
  const [resourceId, setResourceId] = useState(ability?.resourceId || '');
  const [resourceCost, setResourceCost] = useState(ability?.resourceCost || 1);
  
  const initialComponents = ability?.damageComponents?.length 
    ? ability.damageComponents 
    : (ability?.damage ? [{ damage: ability.damage, type: ability.damageType || '' }] : []);

  const [components, setComponents] = useState<DamageComponent[]>(initialComponents);
  const [effect, setEffect] = useState(ability?.effect || '');
  const [iconName, setIconName] = useState(ability?.iconName || 'Zap');
  const [color, setColor] = useState(ability?.color || '#a855f7');
  const [showIconPicker, setShowIconPicker] = useState(false);

  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', 
    '#ec4899', '#06b6d4', '#6366f1', '#14b8a6', '#f97316'
  ];

  useEffect(() => {
    if (isOpen) {
      setName(ability?.name || '');
      setDescription(ability?.description || '');
      setActionType(ability?.actionType || 'action');
      setResourceId(ability?.resourceId || '');
      setResourceCost(ability?.resourceCost || 1);
      
      const comps = ability?.damageComponents?.length 
        ? ability.damageComponents 
        : (ability?.damage ? [{ damage: ability.damage, type: ability.damageType || '' }] : []);
      
      setComponents(comps);
      setEffect(ability?.effect || '');
      setIconName(ability?.iconName || 'Zap');
      setColor(ability?.color || '#a855f7');
      setShowIconPicker(false);
    }
  }, [isOpen, ability]);

  const handleSave = () => {
    if (!name.trim()) return;
    
    const newAbility: Ability = {
      id: ability?.id || `ability_${Date.now()}`,
      name,
      description,
      actionType: actionType as 'action' | 'bonus' | 'reaction',
      resourceId: resourceId || undefined,
      resourceCost: resourceId ? resourceCost : undefined,
      damage: components[0]?.damage || undefined,
      damageType: components[0]?.type || undefined,
      damageComponents: components.length > 0 ? components : undefined,
      effect,
      iconName,
      color,
    };
    
    onSave(newAbility);
    onClose();
  };

  const addComponent = () => {
    setComponents([...components, { damage: '1d6', type: '' }]);
  };

  const updateComponent = (index: number, field: keyof DamageComponent, value: string) => {
    const next = [...components];
    next[index] = { ...next[index], [field]: value };
    setComponents(next);
  };

  const removeComponent = (index: number) => {
    setComponents(components.filter((_, i) => i !== index));
  };

  const actionTypes = [
    { id: 'action', label: 'Основное', activeClass: 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' },
    { id: 'bonus', label: 'Бонусное', activeClass: 'bg-green-500 text-white shadow-lg shadow-green-500/20' },
    { id: 'reaction', label: 'Реакция', activeClass: 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' },
  ];

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
            {/* Header */}
            <div className="p-6 border-b border-dark-border flex items-center justify-between bg-dark-card/50 backdrop-blur-sm relative z-[100]">
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-2">
                  <div className="relative group">
                    <button
                      type="button"
                      onClick={() => setShowIconPicker(!showIconPicker)}
                      className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all border border-white/10 hover:scale-105"
                      style={{ backgroundColor: `${color}20`, color: color }}
                    >
                      {getLucideIcon(iconName, { size: 24 })}
                    </button>
                    
                    <IconPicker
                      isOpen={showIconPicker}
                      onClose={() => setShowIconPicker(false)}
                      currentIcon={iconName}
                      onSelect={setIconName}
                    />
                  </div>
                  <div className="flex gap-1">
                    {colors.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-3 h-3 rounded-full transition-all ${color === c ? 'scale-125 ring-2 ring-white/50' : 'opacity-50 hover:opacity-100'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-bold">{ability ? 'Редактировать способность' : 'Новая способность'}</h2>
                  <p className="text-xs text-gray-400">Уникальные умения вашего героя</p>
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
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Название способности</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Второе дыхание, Мощная атака..."
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    Тип действия
                  </label>
                  <div className="grid grid-cols-3 gap-2 p-1 bg-dark-bg rounded-xl border border-dark-border">
                    {actionTypes.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setActionType(t.id as any)}
                        className={`py-2 rounded-lg text-[10px] font-bold transition-all ${
                          actionType === t.id 
                            ? t.activeClass 
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <CustomSelect
                    label="Тратит ресурс"
                    value={resourceId}
                    onChange={setResourceId}
                    options={[
                      { value: '', label: 'Не требует' },
                      ...resources.map(r => ({ value: r.id, label: r.name }))
                    ]}
                    placeholder="Выберите ресурс..."
                  />
                </div>
              </div>

              {/* Damage Section */}
              <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl space-y-4">
                <div className="flex items-center justify-between text-red-400 mb-1">
                  <div className="flex items-center gap-2">
                    <Sword className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">Параметры урона</span>
                  </div>
                  <button
                    onClick={addComponent}
                    className="px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-lg text-[10px] font-black uppercase hover:bg-red-500/20 transition-all"
                  >
                    + Добавить тип
                  </button>
                </div>
                
                <div className="space-y-3">
                  {components.map((comp, idx) => (
                    <div key={idx} className="flex items-start gap-2 relative group/comp animate-in slide-in-from-right-2 duration-300">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={comp.damage}
                          onChange={(e) => updateComponent(idx, 'damage', e.target.value)}
                          placeholder="1d8+3"
                          className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-lg font-black focus:outline-none focus:ring-1 focus:ring-red-500 transition-all text-center"
                          style={{ color: DAMAGE_TYPE_COLORS[comp.type] || '#ef4444' }}
                        />
                        <div className="space-y-2">
                          <CustomSelect
                            label=""
                            value={DAMAGE_TYPES.includes(comp.type) ? comp.type : (comp.type ? 'custom' : '')}
                            onChange={(v) => updateComponent(idx, 'type', v === 'custom' ? '' : v)}
                            options={[
                              { value: '', label: 'Без типа' },
                              ...DAMAGE_TYPES.map(t => ({ value: t, label: t })),
                              { value: 'custom', label: 'Свой тип...' }
                            ]}
                          />
                          {(comp.type === '' || !DAMAGE_TYPES.includes(comp.type)) && (
                            <input
                              type="text"
                              value={comp.type}
                              onChange={(e) => updateComponent(idx, 'type', e.target.value)}
                              placeholder="Введите свой тип..."
                              className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-1.5 text-[10px] text-center text-gray-400 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all"
                            />
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => removeComponent(idx)}
                        className="mt-2.5 p-2 text-gray-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {resourceId && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-2xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 text-purple-400">
                    <Zap className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">Стоимость использования</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setResourceCost(Math.max(1, resourceCost - 1))} className="w-8 h-8 rounded-lg bg-dark-bg border border-purple-500/30 flex items-center justify-center text-purple-400 hover:bg-purple-500/10 transition-all"><Minus className="w-4 h-4" /></button>
                    <span className="text-lg font-black text-white w-6 text-center">{resourceCost}</span>
                    <button onClick={() => setResourceCost(resourceCost + 1)} className="w-8 h-8 rounded-lg bg-dark-bg border border-purple-500/30 flex items-center justify-center text-purple-400 hover:bg-purple-500/10 transition-all"><Plus className="w-4 h-4" /></button>
                  </div>
                </motion.div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Краткое описание</label>
                  <MarkdownEditor
                    value={description}
                    onChange={setDescription}
                    placeholder="Пара слов для списка способностей..."
                    rows={2}
                    minHeight="60px"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Полный эффект</label>
                  <MarkdownEditor
                    value={effect}
                    onChange={setEffect}
                    placeholder="Подробное описание того, что делает способность..."
                    rows={4}
                    minHeight="120px"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 bg-dark-card/50 backdrop-blur-sm border-t border-dark-border flex gap-3">
              {ability && onDelete && (
                <button
                  onClick={() => { onDelete(); onClose(); }}
                  className="px-4 py-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/20 transition-all text-sm font-bold flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Удалить
                </button>
              )}
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-dark-bg border border-dark-border rounded-xl hover:bg-dark-hover transition-all text-sm font-bold text-gray-400"
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                disabled={!name.trim()}
                className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl hover:shadow-lg hover:shadow-blue-500/40 transition-all text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Сохранить умение
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
