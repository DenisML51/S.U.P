import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Spell, Resource, RESOURCE_ICONS } from '../types';
import { MarkdownEditor } from './MarkdownEditor';
import { CustomSelect } from './CustomSelect';
import { getLucideIcon } from '../utils/iconUtils';
import { Wand2, Clock, MapPin, Sparkles, X, Minus, Plus, Shield, Target, Search } from 'lucide-react';

interface SpellModalProps {
  isOpen: boolean;
  onClose: () => void;
  spell?: Spell;
  resources: Resource[];
  onSave: (spell: Spell) => void;
  onDelete?: () => void;
  knownSchools?: string[];
}

export const SpellModal: React.FC<SpellModalProps> = ({
  isOpen,
  onClose,
  spell,
  resources,
  onSave,
  onDelete,
  knownSchools = [],
}) => {
  const [name, setName] = useState(spell?.name || '');
  const [level, setLevel] = useState(spell?.level || 0);
  const [school, setSchool] = useState(spell?.school || '');
  const [actionType, setActionType] = useState(spell?.actionType || 'action');
  const [castingTime, setCastingTime] = useState(spell?.castingTime || '1 действие');
  const [range, setRange] = useState(spell?.range || '60 футов');
  const [components, setComponents] = useState(spell?.components || 'В, С');
  const [duration, setDuration] = useState(spell?.duration || 'Мгновенная');
  const [description, setDescription] = useState(spell?.description || '');
  const [effect, setEffect] = useState(spell?.effect || '');
  const [resourceId, setResourceId] = useState(spell?.resourceId || '');
  const [prepared, setPrepared] = useState(spell?.prepared || false);
  const [iconName, setIconName] = useState(spell?.iconName || 'Wand2');
  const [color, setColor] = useState(spell?.color || '#3b82f6');
  const [showIconPicker, setShowIconPicker] = useState(false);

  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', 
    '#ec4899', '#06b6d4', '#6366f1', '#14b8a6', '#f97316'
  ];

  useEffect(() => {
    if (isOpen) {
      setName(spell?.name || '');
      setLevel(spell?.level || 0);
      setSchool(spell?.school || '');
      setActionType(spell?.actionType || 'action');
      setCastingTime(spell?.castingTime || '1 действие');
      setRange(spell?.range || '60 футов');
      setComponents(spell?.components || 'В, С');
      setDuration(spell?.duration || 'Мгновенная');
      setDescription(spell?.description || '');
      setEffect(spell?.effect || '');
      setResourceId(spell?.resourceId || '');
      setPrepared(spell?.prepared || false);
      setIconName(spell?.iconName || 'Wand2');
      setColor(spell?.color || '#3b82f6');
      setShowIconPicker(false);
    }
  }, [isOpen, spell]);

  const handleSave = () => {
    if (!name.trim()) return;
    
    const newSpell: Spell = {
      id: spell?.id || `spell_${Date.now()}`,
      name,
      level,
      school,
      actionType,
      castingTime,
      range,
      components,
      duration,
      description,
      effect,
      resourceId: resourceId || undefined,
      prepared,
      iconName,
      color,
    };
    
    onSave(newSpell);
    onClose();
  };

  const actionTypes = [
    { id: 'action', label: 'Основное', activeClass: 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' },
    { id: 'bonus', label: 'Бонусное', activeClass: 'bg-green-500 text-white shadow-lg shadow-green-500/20' },
    { id: 'reaction', label: 'Реакция', activeClass: 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' },
  ];

  const spellLevels = [
    { value: '0', label: 'Заговор' },
    ...Array.from({ length: 9 }, (_, i) => ({ value: (i + 1).toString(), label: `${i + 1} круг` }))
  ];

  const schools = [
    'Воплощение', 'Вызов', 'Иллюзия', 'Некромантия', 
    'Очарование', 'Преобразование', 'Прорицание', 'Ограждение'
  ].map(s => ({ value: s, label: s }));

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
            className="bg-dark-card rounded-2xl border border-dark-border w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-6 border-b border-dark-border flex items-center justify-between bg-dark-card/50 backdrop-blur-sm relative z-[100]">
              <div className="flex items-center gap-4">
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowIconPicker(!showIconPicker)}
                      className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all border border-white/10 hover:scale-105"
                      style={{ backgroundColor: `${color}20`, color: color }}
                    >
                      {getLucideIcon(iconName, { size: 24 })}
                    </button>
                    
                    <AnimatePresence>
                      {showIconPicker && (
                        <>
                          <div className="fixed inset-0 z-[9998]" onClick={() => setShowIconPicker(false)} />
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            className="absolute top-full left-0 mt-2 bg-dark-card border border-white/10 rounded-xl p-3 grid grid-cols-4 gap-2 z-[9999] shadow-2xl w-64 backdrop-blur-xl"
                          >
                            {RESOURCE_ICONS.map((ico) => (
                              <button
                                key={ico.name}
                                type="button"
                                onClick={() => {
                                  setIconName(ico.name);
                                  setShowIconPicker(false);
                                }}
                                className={`aspect-square hover:bg-white/10 rounded-lg flex items-center justify-center transition-all ${
                                  iconName === ico.name ? 'bg-white/20 text-white' : 'text-gray-400'
                                }`}
                              >
                                {getLucideIcon(ico.name, { size: 18 })}
                              </button>
                            ))}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  {/* Color Picker */}
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
                  <h2 className="text-xl font-bold">{spell ? 'Редактировать заклинание' : 'Новое заклинание'}</h2>
                  <p className="text-xs text-gray-400">Мистические силы вашего персонажа</p>
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
              {/* Name & Level */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Название</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Огненный шар, Лечение ран..."
                    className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div>
                  <CustomSelect
                    label="Круг"
                    value={level.toString()}
                    onChange={(v) => setLevel(parseInt(v))}
                    options={spellLevels}
                  />
                </div>
              </div>

              {/* School & Action Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <CustomSelect
                  label="Школа магии"
                  value={school}
                  onChange={setSchool}
                  options={schools}
                  placeholder="Выберите школу..."
                />
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    Тип действия
                  </label>
                  <div className="grid grid-cols-3 gap-2 p-1 bg-dark-bg rounded-xl border border-dark-border">
                    {actionTypes.map((t) => (
                      <button
                        key={t.id}
                        type="button"
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
              </div>

              {/* Resource Selection & Prepared */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <CustomSelect
                    label="Использовать ячейки"
                    value={resourceId}
                    onChange={setResourceId}
                    options={[
                      { value: '', label: 'Не требует ячеек' },
                      ...resources
                        .filter(r => r.spellSlotLevel !== undefined)
                        .map(r => ({ value: r.id, label: r.name }))
                    ]}
                    placeholder="Выберите ячейки..."
                  />
                </div>
                <div className="flex items-end pb-1">
                  <button
                    type="button"
                    onClick={() => setPrepared(!prepared)}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-all font-bold text-xs ${
                      prepared 
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-lg shadow-blue-500/10' 
                        : 'bg-dark-bg border-dark-border text-gray-500 hover:border-gray-400'
                    }`}
                  >
                    <Sparkles size={14} className={prepared ? 'animate-pulse' : ''} />
                    {prepared ? 'Подготовлено' : 'Не подготовлено'}
                  </button>
                </div>
              </div>

              {/* Spell Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Время накл.</label>
                  <input
                    type="text"
                    value={castingTime}
                    onChange={(e) => setCastingTime(e.target.value)}
                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Дистанция</label>
                  <input
                    type="text"
                    value={range}
                    onChange={(e) => setRange(e.target.value)}
                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Компоненты</label>
                  <input
                    type="text"
                    value={components}
                    onChange={(e) => setComponents(e.target.value)}
                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Длительность</label>
                  <input
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Описание</label>
                  <MarkdownEditor
                    value={description}
                    onChange={setDescription}
                    placeholder="Краткое описание для списка..."
                    rows={2}
                    minHeight="60px"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Полный эффект</label>
                  <MarkdownEditor
                    value={effect}
                    onChange={setEffect}
                    placeholder="Подробные правила заклинания..."
                    rows={4}
                    minHeight="120px"
                  />
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 bg-dark-card/50 backdrop-blur-sm border-t border-dark-border flex gap-3">
              {spell && onDelete && (
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
                className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl hover:shadow-lg hover:shadow-blue-500/40 transition-all text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Сохранить заклинание
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

