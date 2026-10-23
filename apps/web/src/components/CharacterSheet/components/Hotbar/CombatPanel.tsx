import React from 'react';
import { Sword, ChevronUp } from 'lucide-react';

interface CombatPanelProps {
  isInCombat: boolean;
  onStartCombat: () => void;
  onNextTurn: () => void;
  onEndCombat: () => void;
}

export const CombatPanel: React.FC<CombatPanelProps> = ({
  isInCombat,
  onStartCombat,
  onNextTurn,
  onEndCombat
}) => {
  return (
    <div className="fixed top-[115px] left-0 right-0 z-[45] flex justify-center pointer-events-none px-8">
      <div className="max-w-[1600px] w-full flex justify-center pointer-events-auto">
        {!isInCombat ? (
          <button 
            onClick={onStartCombat}
            className="group/btn flex items-center gap-3 px-8 py-3 bg-blue-500/10 backdrop-blur-xl border border-blue-500/20 rounded-2xl hover:bg-blue-500/20 hover:border-blue-500/40 transition-all shadow-2xl shadow-blue-500/5"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30 group-hover/btn:scale-110 transition-transform">
              <Sword size={18} className="text-blue-400" />
            </div>
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">НАЧАТЬ БОЙ • ИНИЦИАТИВА</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 bg-dark-bg/80 backdrop-blur-2xl border border-white/10 rounded-full p-1.5 shadow-2xl">
            <button 
              onClick={onNextTurn}
              className="group/btn flex items-center gap-3 px-6 py-2 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-500/40 transition-all rounded-xl shadow-lg"
            >
              <ChevronUp size={18} className="text-amber-400 group-hover/btn:rotate-12 transition-transform" />
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">СЛЕДУЮЩИЙ ХОД</span>
            </button>
            <div className="w-px h-6 bg-white/10 mx-1" />
            <button 
              onClick={onEndCombat}
              className="px-4 py-2 text-gray-500 hover:text-red-400 text-[9px] font-black uppercase tracking-[0.2em] transition-colors rounded-xl hover:bg-red-500/5"
            >
              ВЫЙТИ ИЗ БОЯ
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

