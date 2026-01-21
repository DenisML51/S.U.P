import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sword, Sparkles, Wand2, Box } from 'lucide-react';
import { Attack, Ability, Spell, InventoryItem } from '../../../../types';
import { getLucideIcon } from '../../../../utils/iconUtils';

interface HotbarPanelsProps {
  actionGroups: {
    attacks: any[];
    abilities: any[];
    spells: any[];
    items: any[];
  };
  hoveredItemId: string | null;
  onItemClick: (action: any) => void;
  onItemRightClick: (action: any) => void;
  onItemHover: (item: any, rect: DOMRect) => void;
  onItemUnhover: () => void;
}

export const HotbarPanels: React.FC<HotbarPanelsProps> = ({
  actionGroups,
  hoveredItemId,
  onItemClick,
  onItemRightClick,
  onItemHover,
  onItemUnhover
}) => {
  const categories = [
    { id: 'attacks', label: 'Атаки', icon: Sword, data: actionGroups.attacks, color: '#ef4444' },
    { id: 'abilities', label: 'Умения', icon: Sparkles, data: actionGroups.abilities, color: '#a855f7' },
    { id: 'spells', label: 'Магия', icon: Wand2, data: actionGroups.spells, color: '#3b82f6' },
    { id: 'items', label: 'Вещи', icon: Box, data: actionGroups.items, color: '#94a3b8' },
  ];

  return (
    <div className="flex flex-row items-stretch justify-center gap-3 w-full relative group/hotbar">
      {categories.map((cat) => (
        <div 
          key={cat.id} 
          className="flex flex-col gap-0 flex-1 min-w-0 bg-dark-bg backdrop-blur-3xl border border-white/5 rounded-[2rem] shadow-2xl relative overflow-hidden group/cat-panel transition-all duration-500 hover:border-white/10"
        >
          {/* Subtle color glow in background */}
          <div 
            className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-24 blur-[40px] opacity-10 pointer-events-none transition-opacity duration-500 group-hover/cat-panel:opacity-20"
            style={{ backgroundColor: cat.color }}
          />
          
          <div className="flex items-center justify-between px-5 py-3 relative z-10">
            <div className="flex items-center gap-2.5">
              <div 
                className="p-1.5 rounded-lg transition-transform duration-500 group-hover/cat-panel:scale-110"
                style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
              >
                <cat.icon size={14} />
              </div>
              <span 
                className="text-[10px] font-black uppercase tracking-[0.25em] transition-colors duration-500"
                style={{ color: cat.color }}
              >
                {cat.label}
              </span>
            </div>
            <div 
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: cat.color, boxShadow: `0 0 10px ${cat.color}` }}
            />
          </div>
          
          <div className="flex flex-wrap gap-2.5 p-4 min-h-[150px] max-h-[200px] overflow-y-auto custom-scrollbar content-start relative z-10 bg-black/40 rounded-t-[1.5rem] border-t border-white/5 shadow-inner transition-colors duration-500 group-hover/cat-panel:bg-black/50">
            <AnimatePresence mode="popLayout">
              {cat.data.length > 0 ? (
                cat.data.map((action, idx) => (
                  <motion.div
                    key={action.id + idx}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => onItemClick(action)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      onItemRightClick(action);
                    }}
                    onMouseEnter={(e) => onItemHover(action, e.currentTarget.getBoundingClientRect())}
                    onMouseLeave={onItemUnhover}
                    className="relative w-12 h-12 bg-dark-card/60 border border-white/5 rounded-2xl flex items-center justify-center cursor-pointer hover:scale-110 hover:bg-dark-card hover:border-white/20 active:scale-95 transition-all shadow-lg"
                    style={{ 
                      boxShadow: hoveredItemId === action.id ? `0 0 20px ${cat.color}20` : undefined
                    }}
                  >
                    {getLucideIcon(
                      (action as any).hotbarType === 'spell' ? ((action as any).iconName || 'Wand2') : 
                      (action as any).hotbarType === 'attack' ? ((action as any).iconName || ((action as any).weaponId ? 'Sword' : 'Zap')) :
                      (action as any).hotbarType === 'ability' ? ((action as any).iconName || 'Zap') :
                      ((action as any).iconName || ((action as any).type === 'weapon' ? 'Sword' : (action as any).type === 'armor' ? 'Shield' : 'Box')),
                      { size: 24, style: { color: (action as any).color || cat.color } }
                    )}
                    {(action as any).actionType && (
                      <div 
                        className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-dark-bg shadow-sm"
                        style={{ backgroundColor: (action as any).actionType === 'bonus' ? '#22c55e' : (action as any).actionType === 'reaction' ? '#f97316' : '#3b82f6' }}
                      />
                    )}
                  </motion.div>
                ))
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 opacity-20">
                  <cat.icon size={32} style={{ color: cat.color }} />
                  <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: cat.color }}>Пусто</span>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      ))}
    </div>
  );
};

