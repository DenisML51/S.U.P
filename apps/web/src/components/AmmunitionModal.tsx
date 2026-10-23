import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, Minus, Plus, Package, Disc } from 'lucide-react';
import { InventoryItem } from '../types';

interface AmmunitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  ammunition: InventoryItem[];
  onUpdateQuantity: (itemId: string, delta: number) => void;
}

export const AmmunitionModal: React.FC<AmmunitionModalProps> = ({
  isOpen,
  onClose,
  ammunition,
  onUpdateQuantity,
}) => {
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
            className="bg-dark-card rounded-2xl border border-dark-border p-6 w-full max-w-lg shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <Disc className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Боеприпасы</h2>
                  <p className="text-xs text-gray-400">Управление запасами стрел и патронов</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="w-8 h-8 rounded-lg hover:bg-dark-hover transition-all flex items-center justify-center text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {ammunition.length > 0 ? (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {ammunition.map((ammo) => (
                  <motion.div 
                    key={ammo.id} 
                    layout
                    className="bg-dark-bg/50 rounded-xl p-4 border border-dark-border hover:border-orange-500/30 transition-all group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-100 group-hover:text-orange-400 transition-colors">{ammo.name}</h4>
                        <div className="flex gap-3 mt-1">
                          <span className="text-[10px] text-gray-500 uppercase font-semibold flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            Вес: {ammo.weight % 1 === 0 ? ammo.weight : ammo.weight.toFixed(1)}
                          </span>
                        </div>
                      </div>
                      <div className="text-2xl font-black text-white bg-dark-card px-3 py-1 rounded-lg border border-dark-border min-w-[60px] text-center">
                        {ammo.quantity || 0}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onUpdateQuantity(ammo.id, -10)}
                        className="flex-1 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 transition-all text-xs font-bold"
                      >
                        -10
                      </button>
                      <button
                        onClick={() => onUpdateQuantity(ammo.id, -1)}
                        className="w-10 h-10 bg-dark-card border border-dark-border text-gray-300 rounded-lg hover:bg-dark-hover transition-all flex items-center justify-center"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => onUpdateQuantity(ammo.id, 1)}
                        className="w-10 h-10 bg-dark-card border border-dark-border text-gray-300 rounded-lg hover:bg-dark-hover transition-all flex items-center justify-center"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onUpdateQuantity(ammo.id, 10)}
                        className="flex-1 py-2 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg hover:bg-green-500/20 transition-all text-xs font-bold"
                      >
                        +10
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-dark-bg/30 rounded-2xl border border-dashed border-dark-border">
                <Disc className="w-12 h-12 mx-auto mb-3 text-gray-600 opacity-50" />
                <p className="text-gray-400 font-medium">Боеприпасы не найдены</p>
                <p className="text-xs text-gray-500 mt-1 max-w-[200px] mx-auto">
                  Добавьте патроны или стрелы в инвентаре, выбрав тип "Боеприпас"
                </p>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full mt-6 py-3 bg-dark-bg border border-dark-border rounded-xl hover:bg-dark-hover transition-all font-semibold text-gray-300 hover:text-white"
            >
              Закрыть
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

