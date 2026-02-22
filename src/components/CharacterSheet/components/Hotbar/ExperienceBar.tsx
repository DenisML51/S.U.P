import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';

interface ExperienceBarProps {
  level: number;
  experience: number;
  xpProgress: number;
  canLevelUp: boolean;
  onXPClick: () => void;
}

export const ExperienceBar: React.FC<ExperienceBarProps> = ({
  level,
  experience,
  xpProgress,
  canLevelUp,
  onXPClick
}) => {
  return (
    <div 
      className="flex items-center gap-4 px-2 group cursor-pointer h-8"
      onClick={onXPClick}
    >
      <div className="flex-1 h-2 bg-dark-bg/95 border border-white/10 rounded-full overflow-hidden shadow-2xl relative group-hover:border-amber-500/40 transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(xpProgress, 100)}%` }}
          className="h-full bg-gradient-to-r from-amber-700 via-amber-500 to-amber-300 relative transition-all group-hover:from-amber-600 group-hover:via-amber-400 group-hover:to-amber-200"
        >
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] mix-blend-overlay" />
          {[20, 40, 60, 80].map(m => (
            <div key={m} className="absolute top-0 bottom-0 w-px bg-black/20" style={{ left: `${m}%` }} />
          ))}
        </motion.div>
      </div>

      <div className="flex items-center gap-3 shrink-0 bg-dark-bg/95 border border-white/10 rounded-2xl px-4 py-1.5 shadow-xl group-hover:border-amber-500/40 transition-all duration-300 relative">
        <div className="absolute inset-0 rounded-2xl bg-white/[0.02] pointer-events-none" />
        <div className="flex flex-col items-center">
          <span className="text-[6px] font-black text-gray-500 uppercase tracking-[0.2em] leading-none mb-0.5">LEVEL</span>
          <span className="text-xs font-black text-amber-400 leading-none drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]">{level}</span>
        </div>
        <div className="w-px h-4 bg-white/10" />
        <div className="flex flex-col items-center">
          <span className="text-[6px] font-black text-gray-500 uppercase tracking-[0.2em] leading-none mb-0.5">EXP</span>
          <span className="text-xs font-black text-gray-200 leading-none">{experience}</span>
        </div>
        {canLevelUp && (
          <>
            <div className="w-px h-4 bg-white/10" />
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                filter: ['brightness(1)', 'brightness(1.5)', 'brightness(1)']
              }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="bg-green-500/20 border border-green-500/50 rounded-lg p-1 shadow-[0_0_10px_rgba(34,197,94,0.3)]"
            >
              <ArrowUp size={10} className="text-green-400" />
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};

