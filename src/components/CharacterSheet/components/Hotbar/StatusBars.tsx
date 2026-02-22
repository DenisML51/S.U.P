import React from 'react';
import { motion } from 'framer-motion';

interface StatusBarsProps {
  sanity: number;
  maxSanity: number;
  currentHP: number;
  maxHP: number;
  tempHP: number;
  onSanityClick: () => void;
  onHealthClick: () => void;
}

export const StatusBars: React.FC<StatusBarsProps> = ({
  sanity,
  maxSanity,
  currentHP,
  maxHP,
  tempHP,
  onSanityClick,
  onHealthClick
}) => {
  const sanityPercentage = (sanity / maxSanity) * 100;
  const hpPercentage = (currentHP / maxHP) * 100;
  const tempHPPercentage = (tempHP / maxHP) * 100;

  return (
    <div className="flex items-end gap-4 mb-2">
      <div className="flex items-center justify-center w-7 h-48">
        <div 
          className={`w-full h-full bg-dark-bg/95 border rounded-full overflow-hidden flex flex-col-reverse cursor-pointer shadow-2xl relative group transition-all duration-500 ${
            sanity <= 0 ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'border-white/10 hover:border-white/20'
          }`}
          onClick={onSanityClick}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
          <motion.div 
            initial={{ height: 0 }}
            animate={{ height: `${sanityPercentage}%` }}
            className={`w-full rounded-t-full relative transition-all duration-700 ${
              sanity <= 0 
                ? 'bg-gradient-to-t from-red-600 to-red-400 shadow-[0_0_20px_rgba(239,68,68,0.4)]' 
                : 'bg-gradient-to-t from-purple-600 to-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
            }`}
          >
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay" />
          </motion.div>
          
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
            <span className="text-[12px] font-black text-white drop-shadow-[0_0_8px_rgba(0,0,0,1)] -rotate-90">
              {sanity}
            </span>
          </div>

          <div className="absolute inset-0 flex items-center justify-center rotate-90 whitespace-nowrap pointer-events-none">
            <span className={`text-[9px] font-black uppercase tracking-[0.3em] transition-colors duration-500 group-hover:opacity-0 ${
              sanity <= 0 ? 'text-red-400' : 'text-white/20 group-hover:text-white/50'
            }`}>SANITY</span>
          </div>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 px-5 py-4 bg-dark-bg/95 backdrop-blur-2xl border border-white/10 rounded-3xl text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none shadow-2xl z-[1001] translate-y-2 group-hover:translate-y-0 text-gray-200 border-t-white/20 min-w-[150px] text-center">
            <div className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] mb-2 border-b border-purple-500/20 pb-2">РАССУДОК</div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-purple-400 text-lg">{sanity}</span>
              <span className="text-gray-500 text-sm">/</span>
              <span className="text-gray-100 text-lg">{maxSanity}</span>
            </div>
            <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest pt-2 border-t border-white/5">Нажми для управления</div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center w-7 h-48">
        <div 
          className={`w-full h-full bg-dark-bg/95 border rounded-full overflow-hidden flex flex-col-reverse cursor-pointer shadow-2xl relative group transition-all duration-500 ${
            currentHP === 0 ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'border-white/10 hover:border-white/20'
          }`}
          onClick={onHealthClick}
        >
          <div className="absolute inset-0 flex flex-col-reverse overflow-hidden rounded-full">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${hpPercentage}%` }}
              className={`w-full relative transition-all duration-700 ${
                currentHP === 0 ? 'bg-red-600' : 
                hpPercentage < 25 ? 'bg-gradient-to-t from-red-600 to-red-400 shadow-[0_0_20px_rgba(239,68,68,0.4)]' : 
                'bg-gradient-to-t from-green-600 to-green-400 shadow-[0_0_20px_rgba(34,197,94,0.2)]'
              }`}
            >
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay" />
            </motion.div>

            {tempHP > 0 && (
              <motion.div 
                initial={{ height: 0 }}
                animate={{ height: `${tempHPPercentage}%` }}
                className="w-full bg-blue-400 backdrop-blur-[1px] border-t border-blue-300/50 shadow-[0_-5px_15px_rgba(96,165,250,0.5)] relative"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-blue-500/40 to-transparent" />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay" />
              </motion.div>
            )}
          </div>

          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] to-transparent pointer-events-none z-20" />

          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-30 pointer-events-none">
            <span className="text-[12px] font-black text-white drop-shadow-[0_0_8px_rgba(0,0,0,1)] -rotate-90 whitespace-nowrap">
              {currentHP}{tempHP > 0 ? `+${tempHP}` : ''}
            </span>
          </div>

          <div className="absolute inset-0 flex items-center justify-center -rotate-90 whitespace-nowrap pointer-events-none z-20">
            <span className={`text-[9px] font-black uppercase tracking-[0.3em] transition-colors duration-500 group-hover:opacity-0 ${
              currentHP === 0 ? 'text-red-400' : 'text-white/20 group-hover:text-white/50'
            }`}>HEALTH</span>
          </div>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 px-5 py-4 bg-dark-bg/95 backdrop-blur-2xl border border-white/10 rounded-3xl text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none shadow-2xl z-[1001] translate-y-2 group-hover:translate-y-0 text-gray-200 border-t-white/20 min-w-[150px] text-center">
            <div className="text-[10px] font-black text-green-400 uppercase tracking-[0.2em] mb-2 border-b border-green-500/20 pb-2">ЗДОРОВЬЕ</div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-green-400 text-lg">{currentHP}</span>
              {tempHP > 0 && <span className="text-blue-400 text-lg">+{tempHP}</span>}
              <span className="text-gray-500 text-sm">/</span>
              <span className="text-gray-100 text-lg">{maxHP}</span>
            </div>
            <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest pt-2 border-t border-white/5">Нажми для управления</div>
          </div>
        </div>
      </div>
    </div>
  );
};

