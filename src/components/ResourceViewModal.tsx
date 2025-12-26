import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Resource } from '../types';
import { getLucideIcon } from '../utils/iconUtils';
import { X } from 'lucide-react';
import { MarkdownText } from './MarkdownText';

interface ResourceViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: Resource;
  onEdit: () => void;
  onUpdate: (updatedResource: Resource) => void;
}

export const ResourceViewModal: React.FC<ResourceViewModalProps> = ({
  isOpen,
  onClose,
  resource,
  onEdit,
  onUpdate,
}) => {
  const [tempResource, setTempResource] = useState(resource);
  const [addAmount, setAddAmount] = useState('');
  const [removeAmount, setRemoveAmount] = useState('');

  React.useEffect(() => {
    setTempResource(resource);
  }, [resource]);

  const handleSave = () => {
    onUpdate(tempResource);
    onClose();
  };

  const handleAdd = (amount?: number) => {
    const value = amount !== undefined ? amount : parseInt(addAmount);
    if (isNaN(value) || value <= 0) return;
    
    setTempResource({
      ...tempResource,
      current: Math.min(tempResource.max, tempResource.current + value)
    });
    setAddAmount('');
  };

  const handleRemove = (amount?: number) => {
    const value = amount !== undefined ? amount : parseInt(removeAmount);
    if (isNaN(value) || value <= 0) return;
    
    setTempResource({
      ...tempResource,
      current: Math.max(0, tempResource.current - value)
    });
    setRemoveAmount('');
  };

  const percentage = (tempResource.current / tempResource.max) * 100;

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
                  className="w-12 h-12 rounded-xl border flex items-center justify-center transition-colors"
                  style={{ 
                    backgroundColor: `${tempResource.color || '#3b82f6'}20`,
                    borderColor: `${tempResource.color || '#3b82f6'}30`
                  }}
                >
                  {getLucideIcon(tempResource.iconName, { 
                    style: { color: tempResource.color || '#3b82f6' },
                    className: "w-6 h-6" 
                  })}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{tempResource.name}</h2>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="w-8 h-8 rounded-lg hover:bg-dark-hover transition-all flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Description */}
            {tempResource.description && (
              <div className="mb-6 p-4 bg-dark-bg rounded-xl border border-dark-border">
                <div className="text-sm text-gray-400 mb-2 uppercase font-semibold">Описание</div>
                <div className="max-h-32 overflow-y-auto custom-scrollbar pr-2">
                  <MarkdownText content={tempResource.description} />
                </div>
              </div>
            )}

            {/* Current/Max Display */}
            <div className="mb-6">
              <div 
                className="border rounded-xl p-6 text-center transition-colors"
                style={{ 
                  backgroundColor: `${tempResource.color || '#3b82f6'}10`,
                  borderColor: `${tempResource.color || '#3b82f6'}30`
                }}
              >
                <div className="text-sm text-gray-400 mb-2 uppercase">Текущее количество</div>
                <div className="text-5xl font-bold mb-2">
                  <span style={{ color: tempResource.color || '#3b82f6' }}>{tempResource.current}</span>
                  <span className="text-gray-400 text-3xl"> / {tempResource.max}</span>
                </div>
                <div className="h-3 bg-dark-card rounded-full overflow-hidden border border-dark-border mt-4">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.3 }}
                    className={`h-full rounded-full ${
                      percentage > 75 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                      percentage > 50 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                      percentage > 25 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                      'bg-gradient-to-r from-red-500 to-pink-500'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-3 mb-6">
              {/* Add */}
              <div>
                <div className="text-sm text-gray-400 mb-2 uppercase">Добавить ресурс</div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
                    placeholder="Количество"
                    className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    onClick={() => handleAdd()}
                    className="px-6 py-2 bg-green-500/20 border border-green-500/50 text-green-400 rounded-lg hover:bg-green-500/30 transition-all font-semibold"
                  >
                    Добавить
                  </button>
                </div>
              </div>

              {/* Remove */}
              <div>
                <div className="text-sm text-gray-400 mb-2 uppercase">Убрать ресурс</div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={removeAmount}
                    onChange={(e) => setRemoveAmount(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleRemove()}
                    placeholder="Количество"
                    className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-center focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <button
                    onClick={() => handleRemove()}
                    className="px-6 py-2 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/30 transition-all font-semibold"
                  >
                    Убрать
                  </button>
                </div>
              </div>

              {/* Quick buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setTempResource({ ...tempResource, current: tempResource.max })}
                  className="py-2 bg-blue-500/20 border border-blue-500/50 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all font-semibold text-sm"
                >
                  Полное восстановление
                </button>
                <button
                  onClick={() => setTempResource({ ...tempResource, current: 0 })}
                  className="py-2 bg-dark-bg border border-dark-border text-gray-400 rounded-lg hover:bg-dark-hover transition-all font-semibold text-sm"
                >
                  Обнулить
                </button>
              </div>
            </div>

            {/* Manual Control */}
            <div className="mb-6">
              <div className="text-sm text-gray-400 mb-2 uppercase">Текущее количество</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTempResource({ ...tempResource, current: Math.max(0, tempResource.current - 1) })}
                  className="w-10 h-10 rounded-lg bg-dark-bg border border-dark-border hover:bg-dark-hover transition-all text-xl font-bold"
                >
                  −
                </button>
                <input
                  type="number"
                  value={tempResource.current}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setTempResource({
                      ...tempResource,
                      current: Math.min(tempResource.max, Math.max(0, val))
                    });
                  }}
                  className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => setTempResource({ ...tempResource, current: Math.min(tempResource.max, tempResource.current + 1) })}
                  className="w-10 h-10 rounded-lg bg-dark-bg border border-dark-border hover:bg-dark-hover transition-all text-xl font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-dark-bg border border-dark-border rounded-xl hover:bg-dark-hover transition-all font-semibold"
              >
                Отмена
              </button>
              <button
                onClick={onEdit}
                className="px-4 py-3 bg-dark-bg border border-dark-border rounded-xl hover:bg-dark-hover transition-all font-semibold"
              >
                Настроить
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl hover:shadow-lg hover:shadow-blue-500/50 transition-all font-semibold"
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

