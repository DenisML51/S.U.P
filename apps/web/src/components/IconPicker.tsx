import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getLucideIcon, LUCIDE_PICKER_ICONS, CUSTOM_PICKER_ICONS } from '../utils/iconUtils';
import { Search, X } from 'lucide-react';

interface IconPickerProps {
  isOpen: boolean;
  onClose: () => void;
  currentIcon: string;
  onSelect: (iconName: string) => void;
}

export const IconPicker: React.FC<IconPickerProps> = ({
  isOpen,
  onClose,
  currentIcon,
  onSelect,
}) => {
  const [activeTab, setActiveTab] = useState<'lucide' | 'custom'>(
    CUSTOM_PICKER_ICONS.includes(currentIcon) ? 'custom' : 'lucide'
  );
  const [search, setSearch] = useState('');

  const icons = activeTab === 'lucide' ? LUCIDE_PICKER_ICONS : CUSTOM_PICKER_ICONS;
  const filteredIcons = icons.filter(name => 
    name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute top-full left-0 mt-2 bg-dark-card border border-white/10 rounded-2xl shadow-2xl z-[9999] w-72 overflow-hidden flex flex-col backdrop-blur-xl"
          >
            <div className="flex border-b border-white/5 p-1 bg-white/5">
              <button
                onClick={() => setActiveTab('lucide')}
                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                  activeTab === 'lucide' ? 'bg-blue-500 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                Lucide
              </button>
              <button
                onClick={() => setActiveTab('custom')}
                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                  activeTab === 'custom' ? 'bg-blue-500 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                Custom
              </button>
            </div>

            <div className="p-2 border-b border-white/5">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Поиск иконки..."
                  className="w-full bg-dark-bg/50 border border-white/5 rounded-lg pl-8 pr-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                />
              </div>
            </div>

            <div className="p-3 grid grid-cols-4 gap-2 max-h-64 overflow-y-auto custom-scrollbar">
              {filteredIcons.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    onSelect(name);
                    onClose();
                  }}
                  className={`aspect-square hover:bg-white/10 rounded-xl flex items-center justify-center transition-all group ${
                    currentIcon === name ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50' : 'text-gray-400'
                  }`}
                  title={name}
                >
                  {getLucideIcon(name, { size: 20, className: 'group-hover:scale-110 transition-transform' })}
                </button>
              ))}
              {filteredIcons.length === 0 && (
                <div className="col-span-4 py-8 text-center text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                  Ничего не найдено
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

