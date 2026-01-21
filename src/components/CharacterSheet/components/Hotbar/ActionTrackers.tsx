import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Circle, Triangle, Zap, Minus, Plus } from 'lucide-react';
import { Character } from '../../../../types';

interface ActionTrackersProps {
  character: Character;
  updateCharacter: (character: Character) => void;
}

export const ActionTrackers: React.FC<ActionTrackersProps> = ({
  character,
  updateCharacter
}) => {
  const [editingActionId, setEditingActionId] = useState<string | null>(null);

  const actionLimits = character.actionLimits || { action: 1, bonus: 1, reaction: 1 };
  const spentActions = character.spentActions || { action: 0, bonus: 0, reaction: 0 };

  const toggleAction = (id: 'action' | 'bonus' | 'reaction', index: number) => {
    const currentSpent = spentActions[id];
    let newSpent = currentSpent;
    if (index < currentSpent) {
      newSpent = index;
    } else {
      newSpent = index + 1;
    }

    updateCharacter({
      ...character,
      spentActions: { ...spentActions, [id]: newSpent }
    });
  };

  const updateActionLimit = (id: 'action' | 'bonus' | 'reaction', limit: number) => {
    const newLimits = { ...actionLimits, [id]: Math.max(1, limit) };
    const newSpent = { ...spentActions, [id]: Math.min(spentActions[id], newLimits[id]) };
    
    updateCharacter({
      ...character,
      actionLimits: newLimits,
      spentActions: newSpent
    });
  };

  const actions = [
    { id: 'action' as const, icon: Circle, color: '#3b82f6', title: 'Основное действие' },
    { id: 'bonus' as const, icon: Triangle, color: '#22c55e', title: 'Бонусное действие' },
    { id: 'reaction' as const, icon: Zap, color: '#f97316', title: 'Реакция' }
  ];

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-dark-bg/95 backdrop-blur-3xl border border-white/10 rounded-[1.25rem] shadow-2xl relative group/actions">
      <div className="absolute inset-0 bg-white/[0.02] pointer-events-none rounded-[1.25rem]" />
      {actions.map(act => (
        <div key={act.id} className="flex gap-1 relative group/act-group">
          {Array.from({ length: actionLimits[act.id] }).map((_, i) => {
            const isSpent = i < spentActions[act.id];
            return (
              <button
                key={`${act.id}-${i}`}
                onClick={() => toggleAction(act.id, i)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setEditingActionId(act.id);
                }}
                className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all relative group/act ${
                  isSpent 
                    ? 'bg-red-500/20 border-red-500/50 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.1)]' 
                    : 'bg-dark-card border-white/10 hover:border-white/20'
                }`}
                style={{ 
                  borderColor: !isSpent ? `${act.color}60` : undefined,
                  color: !isSpent ? act.color : undefined
                }}
                title={`${act.title} ${i + 1}/${actionLimits[act.id]}`}
              >
                {!isSpent && (
                  <div 
                    className="absolute inset-0 rounded-full opacity-10 blur-sm group-hover/act:opacity-20 transition-opacity" 
                    style={{ backgroundColor: act.color }} 
                  />
                )}
                <act.icon 
                  size={14} 
                  className={`relative z-10 transition-transform ${isSpent ? 'opacity-50' : 'drop-shadow-[0_0_8px_rgba(0,0,0,0.5)]'}`}
                />
                {isSpent && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-0.5 bg-red-500/50 rotate-45 absolute" />
                    <div className="w-full h-0.5 bg-red-500/50 -rotate-45 absolute" />
                  </div>
                )}
              </button>
            );
          })}

          {/* Action Limit Popover */}
          <AnimatePresence>
            {editingActionId === act.id && (
              <>
                <div className="fixed inset-0 z-[1001]" onClick={() => setEditingActionId(null)} />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 p-4 bg-dark-bg/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-[1002] min-w-[180px]"
                >
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 text-center border-b border-white/5 pb-2">
                    {act.title}
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[10px] text-gray-500 font-bold uppercase whitespace-nowrap">Кол-во за ход:</span>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => updateActionLimit(act.id, actionLimits[act.id] - 1)}
                        className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-sm font-bold text-white min-w-[1ch] text-center">{actionLimits[act.id]}</span>
                      <button 
                        onClick={() => updateActionLimit(act.id, actionLimits[act.id] + 1)}
                        className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
};

