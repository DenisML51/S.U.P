import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RESOURCE_ICONS, Resource } from '../types';
import { getLucideIcon } from '../utils/iconUtils';
import { MarkdownEditor } from './MarkdownEditor';
import { CustomSelect } from './CustomSelect';
import { X, Minus, Plus, Settings2, Sparkles, Wand2 } from 'lucide-react';

interface ResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource?: Resource;
  onSave: (resource: Resource) => void;
  onDelete?: () => void;
}

export const ResourceModal: React.FC<ResourceModalProps> = ({
  isOpen,
  onClose,
  resource,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState(resource?.name || '');
  const [iconName, setIconName] = useState(resource?.iconName || 'Circle');
  const [current, setCurrent] = useState(resource?.current || 0);
  const [max, setMax] = useState(resource?.max || 1);
  const [description, setDescription] = useState(resource?.description || '');
  const [spellSlotLevel, setSpellSlotLevel] = useState<number | undefined>(resource?.spellSlotLevel);
  const [color, setColor] = useState(resource?.color || '#3b82f6');
  const [showIconPicker, setShowIconPicker] = useState(false);

  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', 
    '#ec4899', '#06b6d4', '#6366f1', '#14b8a6', '#f97316'
  ];

  // Синхронизация состояния с props при открытии модалки
  useEffect(() => {
    if (isOpen) {
      setName(resource?.name || '');
      setIconName(resource?.iconName || 'Circle');
      setCurrent(resource?.current || 0);
      setMax(resource?.max || 1);
      setDescription(resource?.description || '');
      setSpellSlotLevel(resource?.spellSlotLevel);
      setColor(resource?.color || '#3b82f6');
      setShowIconPicker(false);
    }
  }, [isOpen, resource]);

  const handleSave = () => {
    if (!name.trim()) return;
    
    const newResource: Resource = {
      id: resource?.id || `resource_${Date.now()}`,
      name,
      iconName,
      current: Math.min(current, max),
      max,
      description,
      spellSlotLevel,
      color,
    };
    
    onSave(newResource);
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
            {/* Header */}
            <div className="p-6 border-b border-dark-border flex items-center justify-between bg-dark-card/50 backdrop-blur-sm relative z-[100]">
              <div className="flex items-center gap-3">
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
                  <h2 className="text-xl font-bold">{resource ? 'Редактировать ресурс' : 'Новый ресурс'}</h2>
                  <p className="text-xs text-gray-400">Настройка отслеживаемых параметров</p>
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
              <div className="grid grid-cols-3 gap-6">
                {/* Icon Picker Column */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Иконка</label>
                  <div className="relative">
                    <button
                      onClick={() => setShowIconPicker(!showIconPicker)}
                      className={`w-full aspect-square bg-dark-bg border-2 rounded-2xl flex items-center justify-center transition-all group ${showIconPicker ? 'border-blue-500 bg-blue-500/10' : 'border-dark-border hover:border-blue-500/50'}`}
                    >
                      {getLucideIcon(iconName, { size: 32, className: 'text-blue-400 group-hover:scale-110 transition-transform' })}
                    </button>
                    
                    {showIconPicker && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        className="absolute top-full left-0 mt-2 bg-dark-card border border-white/10 rounded-xl p-3 grid grid-cols-4 gap-2 z-[9999] shadow-2xl w-64"
                      >
                        {RESOURCE_ICONS.map((ico) => (
                          <button
                            key={ico.name}
                            onClick={() => {
                              setIconName(ico.name);
                              setShowIconPicker(false);
                            }}
                            className={`aspect-square hover:bg-blue-500/20 rounded-lg flex items-center justify-center transition-all ${
                              iconName === ico.name ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-gray-400'
                            }`}
                            title={ico.label}
                          >
                            {getLucideIcon(ico.name, { size: 18 })}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Info Column */}
                <div className="col-span-2 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Название</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ярость, Очки магии..."
                      className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-dark-bg/50 border border-dark-border rounded-xl">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 text-center">Текущее</label>
                      <div className="flex items-center justify-between">
                        <button onClick={() => setCurrent(Math.max(0, current - 1))} className="w-6 h-6 rounded bg-dark-card border border-dark-border flex items-center justify-center text-xs">-</button>
                        <span className="text-xl font-black text-white">{current}</span>
                        <button onClick={() => setCurrent(Math.min(max, current + 1))} className="w-6 h-6 rounded bg-dark-card border border-dark-border flex items-center justify-center text-xs">+</button>
                      </div>
                    </div>
                    <div className="p-3 bg-dark-bg/50 border border-dark-border rounded-xl">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 text-center">Максимум</label>
                      <div className="flex items-center justify-between">
                        <button onClick={() => setMax(Math.max(1, max - 1))} className="w-6 h-6 rounded bg-dark-card border border-dark-border flex items-center justify-center text-xs">-</button>
                        <span className="text-xl font-black text-white">{max}</span>
                        <button onClick={() => setMax(max + 1)} className="w-6 h-6 rounded bg-dark-card border border-dark-border flex items-center justify-center text-xs">+</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Magic Focus / Spell Slots */}
              <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 text-blue-400">
                  <Wand2 size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">Магическая фокусировка</span>
                </div>
                
                <CustomSelect
                  value={(spellSlotLevel ?? -1).toString()}
                  onChange={(v) => {
                    const val = parseInt(v);
                    setSpellSlotLevel(val === -1 ? undefined : val);
                    // Automatically set icon if it's a spell slot
                    if (val !== -1) setIconName('Zap');
                  }}
                  options={[
                    { value: '-1', label: 'Обычный ресурс' },
                    { value: '0', label: 'Ячейки (Заговоры/Особое)' },
                    ...Array.from({ length: 9 }, (_, i) => ({ value: (i + 1).toString(), label: `Ячейки ${i + 1} круга` }))
                  ]}
                />
                <p className="text-[10px] text-gray-500 leading-relaxed px-1">
                  Если выбрано, этот ресурс будет отображаться во вкладке заклинаний как ячейки соответствующего круга.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-blue-400" />
                  Описание эффекта
                </label>
                <MarkdownEditor
                  value={description}
                  onChange={setDescription}
                  placeholder="Что происходит, когда вы тратите этот ресурс..."
                  rows={4}
                  minHeight="120px"
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 bg-dark-card/50 backdrop-blur-sm border-t border-dark-border flex gap-3">
              {resource && onDelete && (
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
                className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl hover:shadow-lg hover:shadow-blue-500/40 transition-all text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Сохранить ресурс
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
