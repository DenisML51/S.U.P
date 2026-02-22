import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CONDITIONS, Condition } from '../../../constants/conditions';
import { Plus, X, Info } from 'lucide-react';

interface ConditionsSectionProps {
  activeConditionIds: string[];
  onToggleCondition: (id: string, active: boolean) => void;
}

export const ConditionsSection: React.FC<ConditionsSectionProps> = ({ 
  activeConditionIds, 
  onToggleCondition 
}) => {
  const activeConditions = CONDITIONS.filter(c => activeConditionIds.includes(c.id));
  const [showPicker, setShowPicker] = React.useState(false);

  return (
    <div className="bg-dark-card/40 backdrop-blur-md rounded-2xl border border-white/5 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">Состояния</h3>
        <button 
          onClick={() => setShowPicker(!showPicker)}
          className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
        >
          <Plus size={18} />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <AnimatePresence mode="popLayout">
          {activeConditions.map(condition => (
            <motion.div
              key={condition.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="group relative flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm"
            >
              <span>{condition.name}</span>
              <button 
                onClick={() => onToggleCondition(condition.id, false)}
                className="hover:text-orange-300 transition-colors"
              >
                <X size={14} />
              </button>
              
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 rounded-lg bg-dark-bg border border-white/10 text-xs text-white/70 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-2xl backdrop-blur-xl">
                {condition.description}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {activeConditions.length === 0 && !showPicker && (
          <div className="text-sm text-white/20 italic py-1">Нет активных состояний</div>
        )}
      </div>

      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CONDITIONS.map(condition => {
                const isActive = activeConditionIds.includes(condition.id);
                return (
                  <button
                    key={condition.id}
                    onClick={() => onToggleCondition(condition.id, !isActive)}
                    className={`text-left px-3 py-2 rounded-xl text-xs transition-all ${
                      isActive 
                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' 
                        : 'bg-white/5 text-white/40 border border-transparent hover:bg-white/10'
                    }`}
                  >
                    {condition.name}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

