import React from 'react';
import { motion } from 'framer-motion';
import { CharacterPreview } from '../context/CharacterContext';
import { CLASSES, Resistance } from '../types';
import { Heart, User, X } from 'lucide-react';
import { DAMAGE_TYPE_COLORS, getDamageTypeIcon } from '../utils/damageUtils';

interface CharacterCardProps {
  character: CharacterPreview;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  compact?: boolean;
}

export const CharacterCard: React.FC<CharacterCardProps> = ({ character, onClick, onDelete, compact }) => {
  const charClass = CLASSES.find(c => c.id === character.class);
  const subclass = charClass?.subclasses.find(sc => sc.id === character.subclass);
  const healthPercentage = (character.currentHP / character.maxHP) * 100;

  const renderMiniResistances = () => {
    if (!character.resistances || character.resistances.length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-white/5">
        {character.resistances.map((res: Resistance) => {
          const color = DAMAGE_TYPE_COLORS[res.type] || '#94a3b8';
          
          return (
            <div 
              key={res.id} 
              className="relative flex items-center justify-center p-1 rounded bg-dark-bg/30 border border-white/5 group"
              title={`${res.type}: ${res.level}`}
              style={{ color }}
            >
              {getDamageTypeIcon(res.type, 16)}
              {res.level === 'resistance' && <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-600 rounded-full border border-dark-card" />}
              {res.level === 'vulnerability' && <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-red-600 rounded-full border border-dark-card" />}
              {res.level === 'immunity' && <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-purple-600 rounded-full border border-dark-card" />}
            </div>
          );
        })}
      </div>
    );
  };

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        onClick={onClick}
        className="group relative bg-dark-card border border-dark-border hover:border-blue-500/50 transition-all cursor-pointer overflow-hidden rounded-xl shadow-lg p-3 flex items-center gap-3"
      >
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center border border-blue-500/30 flex-shrink-0 overflow-hidden">
          {character.avatar ? (
            <img src={character.avatar} alt={character.name} className="w-full h-full object-cover" />
          ) : (
            <User className="w-5 h-5 text-blue-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm text-gray-100 truncate">{character.name}</h3>
          <p className="text-[10px] text-gray-500 truncate">{charClass?.name || character.class} • {character.level} ур.</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="w-12 h-1 bg-dark-bg rounded-full overflow-hidden border border-dark-border">
            <div 
              className={`h-full transition-all ${
                healthPercentage > 75 ? 'bg-green-500' :
                healthPercentage > 50 ? 'bg-blue-500' :
                healthPercentage > 25 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${healthPercentage}%` }}
            />
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(e); }}
            className="opacity-0 group-hover:opacity-100 p-1 text-gray-600 hover:text-red-400 transition-all"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      onClick={onClick}
      className="group relative bg-gradient-to-br from-dark-card to-dark-bg rounded-xl border border-dark-border hover:border-blue-500/50 transition-all cursor-pointer overflow-hidden shadow-lg hover:shadow-xl hover:shadow-blue-500/10"
    >
      {/* Delete button */}
      <button
        onClick={onDelete}
        className="absolute top-2 right-2 w-8 h-8 bg-red-500/20 border border-red-500/30 rounded-lg hover:bg-red-500/30 opacity-0 group-hover:opacity-100 transition-all z-10 flex items-center justify-center"
        title="Удалить персонажа"
      >
        <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center border border-blue-500/30 flex-shrink-0 overflow-hidden">
            {character.avatar ? (
              <img src={character.avatar} alt={character.name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-6 h-6 text-blue-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg text-gray-100 truncate mb-1">{character.name}</h3>
            <div className="text-xs text-gray-400">
              {charClass?.name || character.class}
              {subclass && ` • ${subclass.name}`}
            </div>
          </div>
        </div>

        {/* Level Badge */}
        <div className="flex items-center gap-2 mb-3">
          <div className="px-2.5 py-1 bg-blue-500/20 border border-blue-500/30 rounded-lg">
            <span className="text-xs font-semibold text-blue-400">Уровень {character.level}</span>
          </div>
        </div>

        {/* Health Bar */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs text-gray-400">Здоровье</span>
            </div>
            <span className="text-xs font-semibold text-gray-300">
              {character.currentHP} / {character.maxHP}
            </span>
          </div>
          <div className="h-2 bg-dark-bg rounded-full overflow-hidden border border-dark-border">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${healthPercentage}%` }}
              transition={{ duration: 0.3 }}
              className={`h-full rounded-full ${
                healthPercentage > 75 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                healthPercentage > 50 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                healthPercentage > 25 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                'bg-gradient-to-r from-red-500 to-pink-500'
              }`}
            />
          </div>
        </div>
        {renderMiniResistances()}
      </div>
    </motion.div>
  );
};

