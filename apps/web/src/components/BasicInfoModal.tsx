import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Character, RACES, CLASSES } from '../types';
import { X, User, Sparkles } from 'lucide-react';
import { Check } from 'lucide-react';

interface BasicInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: Character;
  onSave: (updatedCharacter: Character) => void;
}

export const BasicInfoModal: React.FC<BasicInfoModalProps> = ({
  isOpen,
  onClose,
  character,
  onSave,
}) => {
  const [name, setName] = useState(character.name);
  const [race, setRace] = useState(character.race);
  const [subrace, setSubrace] = useState(character.subrace || '');
  const [charClass, setCharClass] = useState(character.class);
  const [subclass, setSubclass] = useState(character.subclass);

  const [isCustomRace, setIsCustomRace] = useState(false);
  const [isCustomSubrace, setIsCustomSubrace] = useState(false);
  const [isCustomClass, setIsCustomClass] = useState(false);
  const [isCustomSubclass, setIsCustomSubclass] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(character.name);
      setRace(character.race);
      setSubrace(character.subrace || '');
      setCharClass(character.class);
      setSubclass(character.subclass);

      const raceExists = RACES.some(r => r.id === character.race);
      setIsCustomRace(!raceExists && !!character.race);
      
      const raceObj = RACES.find(r => r.id === character.race);
      const subraceExists = raceObj?.subraces?.some(sr => sr.id === character.subrace);
      setIsCustomSubrace(!subraceExists && !!character.subrace);

      const classExists = CLASSES.some(c => c.id === character.class);
      setIsCustomClass(!classExists && !!character.class);

      const classObj = CLASSES.find(c => c.id === character.class);
      const subclassExists = classObj?.subclasses?.some(sc => sc.id === character.subclass);
      setIsCustomSubclass(!subclassExists && !!character.subclass);
    }
  }, [isOpen, character]);

  const selectedRace = RACES.find(r => r.id === race);
  const selectedClass = CLASSES.find(c => c.id === charClass);

  const handleSave = () => {
    if (!name.trim()) return;

    const updatedCharacter: Character = {
      ...character,
      name: name.trim(),
      race,
      subrace: subrace || undefined,
      class: charClass,
      subclass,
    };

    onSave(updatedCharacter);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-dark-card rounded-2xl border border-dark-border p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <User className="w-6 h-6" />
                  Основные данные персонажа
                </h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg hover:bg-dark-hover transition-all flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-3 text-gray-300">
                    Имя персонажа
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Введите имя персонажа"
                    className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    onKeyPress={(e) => e.key === 'Enter' && handleSave()}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold text-gray-300">Раса</label>
                    <button 
                      onClick={() => {
                        setIsCustomRace(!isCustomRace);
                        if (!isCustomRace) {
                          setRace('');
                          setSubrace('');
                        }
                      }}
                      className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border transition-all ${
                        isCustomRace ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' : 'text-gray-500 border-dark-border hover:text-gray-300'
                      }`}
                    >
                      {isCustomRace ? 'Выбрать из списка' : 'Свой вариант'}
                    </button>
                  </div>
                  
                  {isCustomRace ? (
                    <input
                      type="text"
                      value={race}
                      onChange={(e) => setRace(e.target.value)}
                      placeholder="Введите название расы"
                      className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {RACES.map((r) => (
                        <motion.button
                          key={r.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setRace(r.id);
                            setSubrace('');
                            setIsCustomSubrace(false);
                          }}
                          className={`p-3 rounded-xl border-2 transition-all text-left relative overflow-hidden ${
                            race === r.id
                              ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
                              : 'border-dark-border hover:border-blue-500/50 bg-dark-bg'
                          }`}
                        >
                          {race === r.id && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center"
                            >
                              <Check className="w-3 h-3 text-white" />
                            </motion.div>
                          )}
                          <div className="font-bold">{r.name}</div>
                          <div className="text-xs text-gray-400 mt-1">{r.description}</div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>

                {(isCustomRace || (selectedRace && selectedRace.subraces && selectedRace.subraces.length > 0) || isCustomSubrace) && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-semibold text-gray-300">
                        Подраса {isCustomRace ? '' : selectedRace?.name}
                      </label>
                      <button 
                        onClick={() => {
                          setIsCustomSubrace(!isCustomSubrace);
                          if (!isCustomSubrace) setSubrace('');
                        }}
                        className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border transition-all ${
                          isCustomSubrace ? 'bg-purple-500/20 text-purple-400 border-purple-500/40' : 'text-gray-500 border-dark-border hover:text-gray-300'
                        }`}
                      >
                        {isCustomSubrace ? 'Выбрать из списка' : 'Свой вариант'}
                      </button>
                    </div>

                    {isCustomSubrace ? (
                      <input
                        type="text"
                        value={subrace}
                        onChange={(e) => setSubrace(e.target.value)}
                        placeholder="Введите название подрасы"
                        className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      />
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {selectedRace?.subraces?.map((sr) => (
                          <motion.button
                            key={sr.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSubrace(sr.id)}
                            className={`p-3 rounded-xl border-2 transition-all text-left relative overflow-hidden ${
                              subrace === sr.id
                                ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20'
                                : 'border-dark-border hover:border-purple-500/50 bg-dark-bg'
                            }`}
                          >
                            {subrace === sr.id && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute top-1 right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center"
                              >
                                <Check className="w-3 h-3 text-white" />
                              </motion.div>
                            )}
                            <div className="font-semibold text-sm">{sr.name}</div>
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Класс
                    </label>
                    <button 
                      onClick={() => {
                        setIsCustomClass(!isCustomClass);
                        if (!isCustomClass) {
                          setCharClass('');
                          setSubclass('');
                        }
                      }}
                      className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border transition-all ${
                        isCustomClass ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' : 'text-gray-500 border-dark-border hover:text-gray-300'
                      }`}
                    >
                      {isCustomClass ? 'Выбрать из списка' : 'Свой вариант'}
                    </button>
                  </div>

                  {isCustomClass ? (
                    <input
                      type="text"
                      value={charClass}
                      onChange={(e) => setCharClass(e.target.value)}
                      placeholder="Введите название класса"
                      className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {CLASSES.map((c) => (
                        <motion.button
                          key={c.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setCharClass(c.id);
                            setSubclass('');
                            setIsCustomSubclass(false);
                          }}
                          className={`p-3 rounded-xl border-2 transition-all text-left relative overflow-hidden ${
                            charClass === c.id
                              ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20'
                              : 'border-dark-border hover:border-purple-500/50 bg-dark-bg'
                          }`}
                        >
                          {charClass === c.id && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute top-1 right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center"
                            >
                              <Check className="w-3 h-3 text-white" />
                            </motion.div>
                          )}
                          <div className="font-bold text-sm">{c.name}</div>
                          <div className="text-xs text-gray-400 mt-1">{c.description}</div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>

                {(isCustomClass || (selectedClass && selectedClass.subclasses && selectedClass.subclasses.length > 0) || isCustomSubclass) && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-semibold text-gray-300">
                        Подкласс {isCustomClass ? '' : (selectedClass ? selectedClass.name + 'а' : '')}
                      </label>
                      <button 
                        onClick={() => {
                          setIsCustomSubclass(!isCustomSubclass);
                          if (!isCustomSubclass) setSubclass('');
                        }}
                        className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border transition-all ${
                          isCustomSubclass ? 'bg-purple-500/20 text-purple-400 border-purple-500/40' : 'text-gray-500 border-dark-border hover:text-gray-300'
                        }`}
                      >
                        {isCustomSubclass ? 'Выбрать из списка' : 'Свой вариант'}
                      </button>
                    </div>

                    {isCustomSubclass ? (
                      <input
                        type="text"
                        value={subclass}
                        onChange={(e) => setSubclass(e.target.value)}
                        placeholder="Введите название подкласса"
                        className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      />
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {selectedClass?.subclasses.map((sc) => (
                          <motion.button
                            key={sc.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSubclass(sc.id)}
                            className={`p-3 rounded-xl border-2 transition-all text-center relative overflow-hidden ${
                              subclass === sc.id
                                ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20'
                                : 'border-dark-border hover:border-purple-500/50 bg-dark-bg'
                            }`}
                          >
                            {subclass === sc.id && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute top-1 right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center"
                              >
                                <Check className="w-3 h-3 text-white" />
                              </motion.div>
                            )}
                            <div className="font-semibold text-sm">{sc.name}</div>
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-dark-bg border border-dark-border rounded-xl hover:bg-dark-hover transition-all font-semibold"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSave}
                  disabled={!name.trim() || !race || !charClass}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl hover:shadow-lg hover:shadow-blue-500/50 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Сохранить
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

