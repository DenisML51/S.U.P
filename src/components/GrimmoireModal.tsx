import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Book, X, Wand2, Sparkles, Check, Info, Settings2, Plus, Minus, Search, Trash2 } from 'lucide-react';
import { Character, Spell, Resource } from '../types';
import { getLucideIcon } from '../utils/iconUtils';

interface GrimmoireModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: Character;
  onSaveSpell: (spell: Spell) => void;
  onDeleteSpell: (id: string) => void;
  onUpdateCharacter: (char: Character) => void;
  onOpenSpellModal: (spell?: Spell) => void;
}

export const GrimmoireModal: React.FC<GrimmoireModalProps> = ({
  isOpen,
  onClose,
  character,
  onSaveSpell,
  onDeleteSpell,
  onUpdateCharacter,
  onOpenSpellModal,
}) => {
  const [search, setSearch] = useState('');
  const [activeLevel, setActiveLevel] = useState<number | 'all'>(-1);
  const [showSettings, setShowInitiativeSettings] = useState(false);

  const spells = character.spells || [];
  const knownSchools = character.knownSchools || [];
  
  const allSchools = [
    'Воплощение', 'Вызов', 'Иллюзия', 'Некромантия', 
    'Очарование', 'Преобразование', 'Прорицание', 'Ограждение'
  ];

  const filteredSpells = spells.filter(spell => {
    const matchesSearch = spell.name.toLowerCase().includes(search.toLowerCase());
    const matchesLevel = activeLevel === -1 || spell.level === activeLevel;
    return matchesSearch && matchesLevel;
  });

  const spellsByLevel = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => ({
    level,
    spells: filteredSpells.filter(s => s.level === level)
  })).filter(group => group.spells.length > 0);

  const getPreparedCount = (level: number) => {
    return spells.filter(s => s.level === level && s.prepared).length;
  };

  const getMaxPrepared = (level: number) => {
    return character.maxPreparedSpells?.[level] ?? 99;
  };

  const toggleSchool = (school: string) => {
    const next = knownSchools.includes(school)
      ? knownSchools.filter(s => s !== school)
      : [...knownSchools, school];
    onUpdateCharacter({ ...character, knownSchools: next });
  };

  const updateMaxPrepared = (level: number, delta: number) => {
    const current = character.maxPreparedSpells || {};
    const next = { ...current, [level]: Math.max(0, (current[level] ?? 5) + delta) };
    onUpdateCharacter({ ...character, maxPreparedSpells: next });
  };

  const canPrepare = (spell: Spell) => {
    if (spell.prepared) return true; // Can always unprepare
    const levelMax = getMaxPrepared(spell.level);
    const levelCurrent = getPreparedCount(spell.level);
    const knowsSchool = knownSchools.includes(spell.school);
    return levelCurrent < levelMax && knowsSchool;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-dark-card rounded-3xl border border-white/10 w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 bg-dark-card/50 backdrop-blur-xl flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <Book className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white leading-none">Гримуар</h2>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Все изученные заклинания</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onOpenSpellModal()}
                  className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 border border-white/10 transition-all active:scale-95 shadow-lg"
                >
                  <Plus size={16} />
                  Новое
                </button>
                <button
                  onClick={() => setShowInitiativeSettings(!showSettings)}
                  className={`p-2.5 rounded-xl transition-all border ${showSettings ? 'bg-purple-500/20 border-purple-500/50 text-purple-400' : 'bg-white/5 border-white/5 text-gray-500 hover:text-white'}`}
                >
                  <Settings2 size={20} />
                </button>
                <button 
                  onClick={onClose}
                  className="w-10 h-10 rounded-xl hover:bg-white/5 transition-all flex items-center justify-center text-gray-500 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden flex">
              {/* Main List */}
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
                <div className="flex items-center gap-4 sticky top-0 z-10 bg-dark-card/80 backdrop-blur-md py-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Поиск по названию..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                    />
                  </div>
                </div>

                <div className="space-y-8">
                  {spellsByLevel.map(group => (
                    <div key={group.level} className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] whitespace-nowrap">
                          {group.level === 0 ? 'Заговоры' : `${group.level} круг`}
                        </div>
                        <div className="h-px flex-1 bg-gradient-to-r from-blue-500/20 to-transparent" />
                        <div className="text-[10px] font-bold text-gray-500 uppercase">
                          Подготовлено: {getPreparedCount(group.level)} / {getMaxPrepared(group.level)}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        {group.spells.map(spell => {
                          const knowsSchool = knownSchools.includes(spell.school);
                          const canPrep = canPrepare(spell);

                          return (
                            <div 
                              key={spell.id}
                              className={`p-4 rounded-2xl border transition-all ${
                                spell.prepared 
                                  ? 'bg-blue-500/10 border-blue-500/40 shadow-lg shadow-blue-500/5' 
                                  : 'bg-white/5 border-white/10 hover:border-white/20'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4 flex-1">
                                  <button
                                    onClick={() => {
                                      if (canPrep || spell.prepared) {
                                        onSaveSpell({ ...spell, prepared: !spell.prepared });
                                      }
                                    }}
                                    className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all flex-shrink-0 ${
                                      spell.prepared 
                                        ? 'bg-blue-500 text-white border-blue-400 shadow-lg shadow-blue-500/40' 
                                        : !knowsSchool 
                                          ? 'bg-red-500/10 border-red-500/30 text-red-400/50 cursor-not-allowed'
                                          : !canPrep 
                                            ? 'bg-orange-500/10 border-orange-500/30 text-orange-400/50 cursor-not-allowed'
                                            : 'bg-dark-bg border-white/10 text-gray-500 hover:border-blue-500/50 hover:text-blue-400'
                                    }`}
                                    title={!knowsSchool ? "Школа не изучена" : !canPrep && !spell.prepared ? "Лимит подготовки исчерпан" : spell.prepared ? "Снять подготовку" : "Подготовить"}
                                  >
                                    {getLucideIcon(spell.iconName || 'Wand2', { size: 24 })}
                                  </button>
                                  <div className="flex-1">
                                    <div className="font-bold text-base text-white">{spell.name}</div>
                                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                                      <span className={knowsSchool ? 'text-gray-400' : 'text-red-400 font-black'}>
                                        {spell.school}
                                      </span>
                                      <span className="text-white/10">•</span>
                                      <span className="text-gray-500 italic font-medium normal-case">{spell.castingTime}</span>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                  {spell.prepared && (
                                    <div className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20 uppercase tracking-widest">
                                      Готово
                                    </div>
                                  )}
                                  <button
                                    onClick={() => onDeleteSpell(spell.id)}
                                    className="p-2.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sidebar Settings */}
              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 300, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    className="border-l border-white/5 bg-white/5 backdrop-blur-xl overflow-y-auto custom-scrollbar"
                  >
                    <div className="p-6 space-y-8">
                      {/* Known Schools */}
                      <div>
                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Sparkles size={12} className="text-purple-400" />
                          Изученные школы
                        </h3>
                        <div className="grid grid-cols-1 gap-2">
                          {allSchools.map(school => (
                            <button
                              key={school}
                              onClick={() => toggleSchool(school)}
                              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                                knownSchools.includes(school)
                                  ? 'bg-purple-500/20 border-purple-500/40 text-purple-300 shadow-lg'
                                  : 'bg-white/5 border-transparent text-gray-500 hover:bg-white/10'
                              }`}
                            >
                              {school}
                              {knownSchools.includes(school) && <Check size={12} />}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Limits */}
                      <div>
                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Wand2 size={12} className="text-purple-400" />
                          Лимиты подготовки
                        </h3>
                        <div className="space-y-3">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => (
                            <div key={level} className="flex items-center justify-between bg-dark-bg/50 p-2 rounded-xl border border-white/5">
                              <span className="text-[10px] font-bold text-gray-400 uppercase ml-2">{level} круг</span>
                              <div className="flex items-center gap-3">
                                <button 
                                  onClick={() => updateMaxPrepared(level, -1)}
                                  className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:bg-white/10"
                                >
                                  <Minus size={12} />
                                </button>
                                <span className="text-xs font-black text-white w-4 text-center">{getMaxPrepared(level)}</span>
                                <button 
                                  onClick={() => updateMaxPrepared(level, 1)}
                                  className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:bg-white/10"
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

