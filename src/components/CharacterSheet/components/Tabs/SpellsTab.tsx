import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, Plus, Search, Sparkles, Book, Star, Trash2, Edit2, Zap, Brain } from 'lucide-react';
import { Character, Spell, Resource } from '../../../../types';
import { MarkdownText } from '../../../MarkdownText';
import { MarkdownEditor } from '../../../MarkdownEditor';
import { getLucideIcon } from '../../../../utils/iconUtils';

interface SpellsTabProps {
  character: Character;
  openSpellView: (spell: Spell) => void;
  toggleSpellPrepared: (spellId: string) => void;
  updateResourceCount: (resourceId: string, delta: number) => void;
  updateSpellsNotes: (notes: string) => void;
  updateSpellcastingDifficulty: (name: string, value: number) => void;
  openGrimmoire: () => void;
}

export const SpellsTab: React.FC<SpellsTabProps> = ({
  character,
  openSpellView,
  toggleSpellPrepared,
  updateResourceCount,
  updateSpellsNotes,
  updateSpellcastingDifficulty,
  openGrimmoire,
}) => {
  const [search, setSearch] = useState('');
  const [activeLevel, setActiveLevel] = useState<number | 'all'>(-1); // -1 for all, 0 for cantrips, 1-9 for levels

  const spells = character.spells || [];
  
  const filteredSpells = useMemo(() => {
    return spells.filter(spell => {
      if (!spell.prepared) return false;
      const matchesSearch = spell.name.toLowerCase().includes(search.toLowerCase()) ||
                          spell.school.toLowerCase().includes(search.toLowerCase());
      const matchesLevel = activeLevel === -1 || spell.level === activeLevel;
      return matchesSearch && matchesLevel;
    });
  }, [spells, search, activeLevel]);

  const spellSlots = useMemo(() => {
    return character.resources.filter(r => r.spellSlotLevel !== undefined);
  }, [character.resources]);

  const levels = useMemo(() => {
    const uniqueLevels = Array.from(new Set(spells.map(s => s.level))).sort((a, b) => a - b);
    return uniqueLevels;
  }, [spells]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Controls Header */}
      <div className="flex flex-col gap-6 sticky top-0 z-30 bg-dark-bg/80 backdrop-blur-md py-4 -mx-2 px-2 border-b border-white/5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 relative min-w-[200px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск заклинания или школы..."
              className="w-full bg-dark-card/30 border border-dark-border rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <button
            onClick={openGrimmoire}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
          >
            <Book size={18} />
            Гримуар
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Spell Slots Compact (Icon based) */}
          <div className="flex flex-wrap gap-3">
            {/* Spellcasting Difficulty Editor */}
            <div className="flex items-center gap-2 bg-dark-bg/80 border border-purple-500/30 rounded-2xl px-3 h-12 shadow-lg backdrop-blur-sm group transition-all hover:border-purple-500/50">
              <Brain size={18} className="text-purple-400" />
              <div className="flex flex-col">
                <input
                  type="text"
                  value={character.spellcastingDifficultyName || 'СЛ ЗКЛ'}
                  onChange={(e) => updateSpellcastingDifficulty(e.target.value, character.spellcastingDifficultyValue || 10)}
                  placeholder="Название..."
                  className="bg-transparent border-none p-0 text-[10px] font-black uppercase tracking-tighter text-purple-400/70 focus:outline-none focus:text-purple-400 w-24"
                />
                <input
                  type="number"
                  value={character.spellcastingDifficultyValue || 10}
                  onChange={(e) => updateSpellcastingDifficulty(character.spellcastingDifficultyName || 'СЛ ЗКЛ', parseInt(e.target.value) || 0)}
                  className="bg-transparent border-none p-0 text-lg font-black text-white focus:outline-none w-12 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>

            {spellSlots.sort((a, b) => (a.spellSlotLevel || 0) - (b.spellSlotLevel || 0)).map(slot => {
              const romanNumerals = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
              const level = slot.spellSlotLevel || 0;
              const isEmpty = slot.current <= 0;

              return (
                <div 
                  key={slot.id}
                  onClick={() => updateResourceCount(slot.id, -1)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    window.dispatchEvent(new CustomEvent('open-character-modal', { 
                      detail: { type: 'resource', data: slot } 
                    }));
                  }}
                  className="group relative cursor-pointer"
                >
                  <div 
                    className={`w-12 h-12 bg-dark-bg/80 border rounded-2xl flex flex-col items-center justify-center transition-all shadow-lg backdrop-blur-sm ${
                      isEmpty ? 'border-red-500 bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : ''
                    }`}
                    style={!isEmpty ? { 
                      borderColor: `${slot.color || '#3b82f6'}40`,
                      backgroundColor: `${slot.color || '#3b82f6'}05`
                    } : {}}
                  >
                    {getLucideIcon(slot.iconName || 'Zap', { 
                      size: 20, 
                      style: { color: isEmpty ? '#ef4444' : (slot.color || '#60a5fa') }
                    } as any)}
                    {level > 0 && (
                      <span 
                        className={`text-[11px] font-black mt-0.5 tracking-tighter leading-none`}
                        style={{ color: isEmpty ? '#f87171' : (slot.color || '#93c5fd') }}
                      >
                        {romanNumerals[level]}
                      </span>
                    )}
                  </div>
                  
                  {/* Tooltip */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-dark-card border border-dark-border rounded-lg text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
                    <div className="font-bold text-gray-200">{slot.name}: {slot.current}/{slot.max}</div>
                    <div className="text-gray-500 mt-1 uppercase tracking-tighter">ЛКМ: -1 • ПКМ: Настр.</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Level Filter */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-dark-card/30 border border-dark-border rounded-xl">
            <button
              onClick={() => setActiveLevel(-1)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                activeLevel === -1 
                  ? 'bg-blue-500 text-white shadow-lg' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Все
            </button>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(l => spells.some(s => s.level === l)).map(level => (
              <button
                key={level}
                onClick={() => setActiveLevel(level)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                  activeLevel === level 
                    ? 'bg-blue-500 text-white shadow-lg' 
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {level === 0 ? 'Заговоры' : level}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Spells Grid */}
      <div className="flex flex-wrap gap-4">
        <AnimatePresence mode="popLayout">
          {filteredSpells.map((spell) => (
            <motion.div
              key={spell.id}
              onClick={() => openSpellView(spell)}
              className="group relative bg-dark-card/30 border border-white/5 hover:border-white/20 rounded-2xl transition-all duration-300 ease-out cursor-pointer shadow-lg"
              style={{ 
                borderColor: spell.prepared ? `${spell.color || '#3b82f6'}40` : undefined,
                backgroundColor: spell.prepared ? `${spell.color || '#3b82f6'}05` : undefined,
              }}
            >
              {/* Icon Section */}
              <div 
                className="w-14 h-14 flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                style={{ color: spell.color || '#3b82f6' }}
              >
                {getLucideIcon(spell.iconName || 'Wand2', { size: 28 })}
              </div>

              {/* Enhanced Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-4 bg-dark-bg/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none z-50">
                {/* Decorative glow */}
                <div 
                  className="absolute inset-0 rounded-2xl opacity-10 blur-xl -z-10"
                  style={{ backgroundColor: spell.color || '#3b82f6' }}
                />
                
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-white text-base leading-tight">{spell.name}</span>
                      <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20 shrink-0 mt-0.5">
                        {spell.level === 0 ? 'Заговор' : `${spell.level} круг`}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium italic opacity-70">
                      {spell.school}
                    </span>
                  </div>

                  <div className="h-px bg-white/5 w-full" />

                  <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[8px] text-gray-500 uppercase font-black tracking-tighter">Время</span>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-300 font-bold">
                        <Zap size={10} className="text-blue-400" />
                        {spell.castingTime}
                      </div>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[8px] text-gray-500 uppercase font-black tracking-tighter">Тип</span>
                      <div className={`text-[10px] font-bold ${
                        spell.actionType === 'bonus' ? 'text-green-400' :
                        spell.actionType === 'reaction' ? 'text-orange-400' :
                        'text-blue-400'
                      }`}>
                        {spell.actionType === 'bonus' ? 'Бонусное' : 
                         spell.actionType === 'reaction' ? 'Реакция' : 'Основное'}
                      </div>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[8px] text-gray-500 uppercase font-black tracking-tighter">Дистанция</span>
                      <span className="text-[10px] text-gray-300 font-bold">{spell.range}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[8px] text-gray-500 uppercase font-black tracking-tighter">Длительность</span>
                      <span className="text-[10px] text-gray-300 font-bold">{spell.duration}</span>
                    </div>
                  </div>
                </div>

                {/* Elegant SVG Arrow */}
                <div className="absolute -bottom-[9px] left-1/2 -translate-x-1/2 w-4 h-2.5 flex justify-center">
                  <div 
                    className="absolute inset-0 blur-[2px] opacity-20"
                    style={{ backgroundColor: spell.color || '#3b82f6' }}
                  />
                  <svg 
                    className="relative w-4 h-2.5" 
                    viewBox="0 0 16 10" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path 
                      d="M8 10L0 0H16L8 10Z" 
                      fill="rgba(15, 15, 15, 0.95)"
                    />
                    <path 
                      d="M0 0L8 10L16 0" 
                      stroke="rgba(255, 255, 255, 0.1)" 
                      strokeWidth="1"
                    />
                  </svg>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredSpells.length === 0 && (
        <div className="text-center py-20 bg-dark-card/20 rounded-3xl border border-dashed border-dark-border">
          <div className="w-16 h-16 bg-dark-bg border border-dark-border rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-600">
            <Book size={32} />
          </div>
          <h3 className="text-gray-400 font-bold">Заклинаний не найдено</h3>
          <p className="text-sm text-gray-600 mt-1">Добавьте свое первое магическое умение</p>
        </div>
      )}

      {/* Notes Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 px-1">
          <h3 className="text-xl font-bold tracking-tight text-gray-200 uppercase tracking-widest">Заметки заклинателя</h3>
          <div className="h-px flex-1 bg-gradient-to-r from-dark-border to-transparent"></div>
        </div>
        <MarkdownEditor
          value={character.spellsNotes}
          onChange={updateSpellsNotes}
          placeholder="Особые правила, фокусировка, магические традиции..."
          minHeight="150px"
        />
      </div>
    </div>
  );
};

