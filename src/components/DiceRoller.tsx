import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dices, 
  RotateCcw, 
  Play, 
  X,
  Hash
} from 'lucide-react';
import { useCharacterStore } from '../store/useCharacterStore';
import { toast } from 'react-hot-toast';
import { DAMAGE_TYPES } from '../types';
import { DAMAGE_TYPE_COLORS } from '../utils/damageUtils';

// Helper to parse dice formula like "2d20 radiant + 3d10 cold + 5"
const parseDiceFormula = (formula: string) => {
  const dice: { id: string, count: number, type?: string }[] = [];
  let bonus = 0;

  // Split by "+" and "and" (и)
  const parts = formula.toLowerCase().split(/\s*\+\s*|\s+и\s+/);

  parts.forEach(part => {
    const trimmed = part.trim();
    if (!trimmed) return;

    if (trimmed.includes('d')) {
      // Look for damage type after the dice
      const diceMatch = trimmed.match(/(\d*)d(\d+)(.*)/);
      if (diceMatch) {
        const count = diceMatch[1] === '' ? 1 : parseInt(diceMatch[1]);
        const sides = parseInt(diceMatch[2]);
        const rest = diceMatch[3].trim();
        
        let foundType = undefined;
        if (rest) {
          foundType = DAMAGE_TYPES.find(t => 
            rest.toLowerCase().includes(t.toLowerCase()) || 
            t.toLowerCase().includes(rest.toLowerCase())
          );
        }

        if (!isNaN(sides)) {
          dice.push({ 
            id: `d${sides}`, 
            count: isNaN(count) ? 1 : count, 
            type: foundType 
          });
        }
      }
    } else {
      const val = parseInt(trimmed);
      if (!isNaN(val)) bonus += val;
    }
  });

  return { dice, bonus };
};

// Helper to generate positions for dice pile with "layering" logic
const getRandomDiceStyles = (index: number) => {
  const colCount = 6;
  const rowCount = 2;
  const maxInGrid = colCount * rowCount;
  
  const gridIndex = index % maxInGrid;
  const col = gridIndex % colCount;
  const row = Math.floor(gridIndex / colCount);
  
  let baseX = (col - (colCount - 1) / 2) * 55;
  let baseY = (row - 0.5) * 50;
  
  if (index >= maxInGrid) {
    const layer = Math.floor(index / maxInGrid);
    const layerOffset = layer * 15;
    baseX += layerOffset;
    baseY += layerOffset * 0.5;
  }
  
  return {
    rotate: Math.random() * 30 - 15,
    x: baseX + (Math.random() * 8 - 4),
    y: baseY + (Math.random() * 6 - 3),
    scale: 1.0 + Math.random() * 0.1
  };
};

const D4Icon = ({ color, size = 32 }: { color: string, size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l9 16H3l9-16z" />
    <path d="M12 3v16" strokeOpacity="0.5" strokeWidth="1.5" />
  </svg>
);

const D6Icon = ({ color, size = 32 }: { color: string, size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <circle cx="8" cy="8" r="1.5" fill={color} stroke="none" />
    <circle cx="16" cy="16" r="1.5" fill={color} stroke="none" />
    <circle cx="12" cy="12" r="1.5" fill={color} stroke="none" />
  </svg>
);

const D8Icon = ({ color, size = 32 }: { color: string, size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l8 10-8 10-8-10z" />
    <path d="M4 12h16" strokeOpacity="0.5" strokeWidth="1.5" />
    <path d="M12 2v20" strokeOpacity="0.3" strokeWidth="1" />
  </svg>
);

const D10Icon = ({ color, size = 32 }: { color: string, size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l7 7-7 13-7-13z" />
    <path d="M12 2v20" strokeOpacity="0.5" strokeWidth="1.5" />
    <path d="M5 9h14" strokeOpacity="0.5" strokeWidth="1.5" />
  </svg>
);

const D12Icon = ({ color, size = 32 }: { color: string, size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l9 6v8l-9 6-9-6V8z" />
    <path d="M12 2v20" strokeOpacity="0.3" strokeWidth="1.5" />
    <path d="M3 8h18" strokeOpacity="0.3" strokeWidth="1.5" />
    <path d="M3 16h18" strokeOpacity="0.3" strokeWidth="1.5" />
  </svg>
);

const D20Icon = ({ color, size = 32 }: { color: string, size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l10 6-10 14L2 8z" />
    <path d="M12 2v20" strokeOpacity="0.3" strokeWidth="1.5" />
    <path d="M2 8l10 4 10-4" strokeOpacity="0.3" strokeWidth="1.5" />
    <path d="M2 8h20" strokeOpacity="0.2" strokeWidth="1" />
  </svg>
);

const D100Icon = ({ color, size = 32 }: { color: string, size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <text x="12" y="15" fontSize="7" fontWeight="900" fill={color} textAnchor="middle" stroke="none">100</text>
  </svg>
);

interface DiceConfig {
  id: string;
  sides: number;
  label: string;
  color: string;
  icon: React.FC<{ color: string, size?: number }>;
}

const DICE_TYPES: DiceConfig[] = [
  { id: 'd4', sides: 4, label: 'd4', color: '#f87171', icon: D4Icon },
  { id: 'd6', sides: 6, label: 'd6', color: '#fb923c', icon: D6Icon },
  { id: 'd8', sides: 8, label: 'd8', color: '#facc15', icon: D8Icon },
  { id: 'd10', sides: 10, label: 'd10', color: '#4ade80', icon: D10Icon },
  { id: 'd12', sides: 12, label: 'd12', color: '#60a5fa', icon: D12Icon },
  { id: 'd20', sides: 20, label: 'd20', color: '#c084fc', icon: D20Icon },
  { id: 'd100', sides: 100, label: 'd100', color: '#f472b6', icon: D100Icon },
];

export const DiceRoller: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDice, setSelectedDice] = useState<{id: string, style: any, type?: string}[]>([]);
  const [bonuses, setBonuses] = useState<Record<string, number>>({});
  const { logHistory, character } = useCharacterStore();

  const totalBonus = useMemo(() => 
    Object.values(bonuses).reduce((sum, b) => sum + b, 0),
  [bonuses]);

  useEffect(() => {
    const handleOpenDiceHub = (e: any) => {
      const { formula, components } = e.detail || {};
      
      let finalDice: {id: string, style: any, type?: string}[] = [];
      let newBonuses: Record<string, number> = {};

      if (components && Array.isArray(components)) {
        components.forEach((comp: any) => {
          const { dice, bonus: parsedBonus } = parseDiceFormula(comp.damage);
          dice.forEach(d => {
            for (let i = 0; i < d.count; i++) {
              finalDice.push({ 
                id: d.id, 
                style: getRandomDiceStyles(finalDice.length),
                type: comp.type || d.type
              });
            }
          });
          if (parsedBonus !== 0) {
            const type = comp.type || '';
            newBonuses[type] = (newBonuses[type] || 0) + parsedBonus;
          }
        });
      } else if (formula) {
        const { dice, bonus: parsedBonus } = parseDiceFormula(formula);
        dice.forEach(d => {
          for (let i = 0; i < d.count; i++) {
            finalDice.push({ 
              id: d.id, 
              style: getRandomDiceStyles(finalDice.length),
              type: d.type
            });
          }
        });
        if (parsedBonus !== 0) {
          newBonuses[''] = parsedBonus;
        }
      }

      if (finalDice.length > 0 || Object.keys(newBonuses).length > 0) {
        setSelectedDice(finalDice);
        setBonuses(newBonuses);
        setIsOpen(true);
      } else {
        setIsOpen(true);
      }
    };

    window.addEventListener('open-dice-hub' as any, handleOpenDiceHub);
    return () => window.removeEventListener('open-dice-hub' as any, handleOpenDiceHub);
  }, []);

  const diceCounts = useMemo(() => {
    return selectedDice.reduce((acc, die) => {
      acc[die.id] = (acc[die.id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [selectedDice]);

  const addDie = (id: string) => {
    setSelectedDice(prev => [...prev, { id, style: getRandomDiceStyles(prev.length) }]);
  };

  const removeDie = (id: string) => {
    setSelectedDice(prev => {
      const idx = prev.findLastIndex(d => d.id === id);
      if (idx === -1) return prev;
      const next = [...prev];
      next.splice(idx, 1);
      return next;
    });
  };

  const reset = () => {
    setSelectedDice([]);
    setBonuses({});
  };

  const roll = useCallback(() => {
    if (selectedDice.length === 0 && totalBonus === 0) return;

    const totalsByType: Record<string, number> = { ...bonuses };
    const rollDetailsByType: Record<string, string[]> = {};

    selectedDice.forEach(die => {
      const config = DICE_TYPES.find(d => d.id === die.id);
      if (!config) return;
      
      const r = Math.floor(Math.random() * config.sides) + 1;
      const type = die.type || '';
      
      totalsByType[type] = (totalsByType[type] || 0) + r;
      if (!rollDetailsByType[type]) rollDetailsByType[type] = [];
      rollDetailsByType[type].push(`${r}(${config.label})`);
    });

    const grandTotal = Object.values(totalsByType).reduce((sum, val) => sum + val, 0);
    
    const damageBreakdown = Object.entries(totalsByType)
      .filter(([_, total]) => total !== 0)
      .map(([type, total]) => {
        const typeLabel = type || 'Урон';
        return `${total} ${typeLabel.toLowerCase()}`;
      }).join(', ');

    const detailedHistory = Object.entries(totalsByType)
      .filter(([_, total]) => total !== 0)
      .map(([type, total]) => {
        const typeLabel = type || 'Без типа';
        const rolls = rollDetailsByType[type]?.join(' + ') || '';
        const bonusForType = bonuses[type] || 0;
        const bonusStr = bonusForType !== 0 ? ` + ${bonusForType}(бонус)` : '';
        return `${typeLabel}: ${total} [${rolls}${bonusStr}]`;
      }).join(' | ');

    const message = `Бросок: ${grandTotal} (${damageBreakdown}). Детали: ${detailedHistory}`;
    
    toast.success(
      <div className="flex flex-col gap-2 min-w-[200px]">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <Dices className="w-5 h-5 text-blue-400" />
            <span className="font-black text-2xl text-white">{grandTotal}</span>
          </div>
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Итого</span>
        </div>
        <div className="space-y-1">
          {Object.entries(totalsByType)
            .filter(([_, total]) => total !== 0)
            .map(([type, total]) => (
            <div key={type} className="flex items-center justify-between gap-4">
              <span 
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: type ? (DAMAGE_TYPE_COLORS[type] || '#94a3b8') : '#94a3b8' }}
              >
                {type || 'Общий'}
              </span>
              <span 
                className="font-black text-sm"
                style={{ color: type ? (DAMAGE_TYPE_COLORS[type] || '#fff') : '#fff' }}
              >
                {total}
              </span>
            </div>
          ))}
        </div>
      </div>,
      {
        duration: 6000,
        style: {
          background: '#0f172a',
          color: '#fff',
          border: '2px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '1.5rem',
          backdropFilter: 'blur(12px)',
          padding: '1rem'
        }
      }
    );

    logHistory(message, 'other');
  }, [selectedDice, bonuses, totalBonus, logHistory]);

  const hasSelection = selectedDice.length > 0 || totalBonus !== 0;

  if (!character) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center z-[100] transition-all shadow-2xl active:scale-90 ${
          isOpen 
            ? 'bg-blue-600 text-white rotate-90 scale-110 shadow-blue-500/40' 
            : 'bg-slate-900 text-blue-400 border-2 border-blue-500/30 hover:bg-blue-500/10 hover:border-blue-500 hover:scale-110 shadow-black/50'
        }`}
      >
        {isOpen ? <X size={28} strokeWidth={3} /> : <Dices size={28} strokeWidth={2.5} />}
        {hasSelection && !isOpen && (
           <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-slate-900 animate-bounce">
             !
           </div>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[90]"
            />
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95, x: '-50%' }}
              animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
              exit={{ opacity: 0, y: 50, scale: 0.95, x: '-50%' }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[440px] bg-slate-900/95 border-2 border-white/10 rounded-[2.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] z-[100] backdrop-blur-3xl overflow-hidden p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-500/20">
                    <Dices className="w-5 h-5 text-blue-400" strokeWidth={3} />
                  </div>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white">Дайс-Хаб</h3>
                </div>
                <button 
                  onClick={reset}
                  className="p-2 text-slate-500 hover:text-white transition-all bg-white/5 rounded-lg border border-white/5 hover:border-white/10 active:scale-90"
                  title="Очистить"
                >
                  <RotateCcw size={16} strokeWidth={2.5} />
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 mb-6 bg-black/30 p-2.5 rounded-[1.5rem] border border-white/5">
                {DICE_TYPES.map((die) => (
                  <button
                    key={die.id}
                    onClick={() => addDie(die.id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      removeDie(die.id);
                    }}
                    className="flex-1 aspect-square rounded-xl flex items-center justify-center transition-all hover:bg-white/10 active:scale-90 group relative"
                  >
                    <die.icon color={die.color} size={30} />
                    {diceCounts[die.id] > 0 && (
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-blue-500 text-white text-[9px] font-black flex items-center justify-center border-2 border-slate-900 rounded-full"
                      >
                        {diceCounts[die.id]}
                      </motion.div>
                    )}
                  </button>
                ))}
                <div className="w-px h-6 bg-white/10 mx-1" />
                <button
                  onClick={() => setBonuses(prev => ({ ...prev, '': (prev[''] || 0) + 1 }))}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setBonuses(prev => ({ ...prev, '': Math.max(0, (prev[''] || 0) - 1) }));
                  }}
                  className="flex-1 aspect-square rounded-xl flex items-center justify-center transition-all hover:bg-white/10 active:scale-90 group relative"
                >
                  {totalBonus === 0 ? (
                    <Hash size={24} className="text-slate-400" strokeWidth={3} />
                  ) : (
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-black text-amber-500 leading-none">
                        {totalBonus > 0 ? `+${totalBonus}` : totalBonus}
                      </span>
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter mt-0.5">Бонус</span>
                    </div>
                  )}
                </button>
              </div>

              <div className="relative h-36 mb-6 overflow-hidden flex items-center justify-center bg-black/20 rounded-[2rem] border border-white/5">
                {selectedDice.length === 0 && totalBonus === 0 ? (
                  <div className="flex flex-col items-center gap-2 opacity-10">
                    <Dices size={40} strokeWidth={1.5} className="text-slate-400" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Пул пуст</span>
                  </div>
                ) : (
                  <div className="relative w-full h-full">
                    <AnimatePresence mode="popLayout">
                      {selectedDice.map((die, idx) => {
                        const config = DICE_TYPES.find(d => d.id === die.id)!;
                        return (
                          <motion.div
                            key={`${die.id}-${idx}`}
                            initial={{ scale: 0, rotate: -45, opacity: 0 }}
                            animate={{ 
                              scale: die.style.scale, 
                              rotate: die.style.rotate, 
                              x: die.style.x, 
                              y: die.style.y,
                              opacity: 1 
                            }}
                            exit={{ scale: 0, opacity: 0 }}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-2 cursor-pointer hover:brightness-125 transition-all hover:z-[100]"
                            style={{ 
                              zIndex: idx,
                              filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.4))'
                            }}
                            onClick={() => removeDie(die.id)}
                          >
                            <config.icon color={die.type ? (DAMAGE_TYPE_COLORS[die.type] || config.color) : config.color} size={42} />
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              <button
                disabled={!hasSelection}
                onClick={roll}
                className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-[0.3em] text-xs transition-all ${
                  hasSelection 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 border-t border-white/10' 
                    : 'bg-white/5 text-slate-600 cursor-not-allowed border border-white/5'
                }`}
              >
                <Play className={`w-4 h-4 ${hasSelection ? 'fill-current animate-pulse' : ''}`} />
                СДЕЛАТЬ БРОСОК
              </button>
              
              {hasSelection && (
                <div className="mt-4 text-center">
                  <div className="inline-block px-3 py-1 bg-white/5 rounded-full border border-white/5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {Object.entries(diceCounts)
                        .filter(([_, count]) => count > 0)
                        .map(([id, count]) => `${count}${id}`)
                        .join(' + ')}
                      {totalBonus !== 0 && (totalBonus > 0 ? ` + ${totalBonus}` : ` - ${Math.abs(totalBonus)}`)}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
