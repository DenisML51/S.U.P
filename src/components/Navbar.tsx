import React, { useState, useEffect } from 'react';
import { useCharacter, TabType } from '../context/CharacterContext';
import { 
  User, 
  Heart, 
  Sparkles, 
  Swords, 
  Shield, 
  Briefcase, 
  BarChart2,
  Menu,
  Coins,
  Target,
  ChevronLeft,
  Settings,
  LogOut,
  Download,
  FileJson,
  Sliders
} from 'lucide-react';
import { getLucideIcon } from '../utils/iconUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { SettingsModal } from './SettingsModal';

const tabs: { id: TabType; label: string; icon: any }[] = [
  { id: 'stats', label: 'Статы', icon: BarChart2 },
  { id: 'personality', label: 'Герой', icon: User },
  { id: 'health', label: 'Жизнь', icon: Heart },
  { id: 'abilities', label: 'Умения', icon: Sparkles },
  { id: 'attacks', label: 'Атаки', icon: Swords },
  { id: 'equipment', label: 'Броня', icon: Shield },
  { id: 'inventory', label: 'Вещи', icon: Briefcase },
];

export const Navbar: React.FC = () => {
  const { character, activeTab, setActiveTab, goToCharacterList, exportToJSON, updateResourceCount } = useCharacter();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile && activeTab === 'stats') {
        setActiveTab('personality');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTab, setActiveTab]);

  if (!character) return null;

  const totalAmmo = character.inventory
    .filter(item => item.type === 'ammunition')
    .reduce((sum, item) => sum + (item.quantity || 0), 0);

  const visibleTabs = isMobile ? tabs : tabs.filter(t => t.id !== 'stats');
  const resourcesWithValues = character.resources.filter(r => r.max > 0);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 p-8 pointer-events-none">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4 pointer-events-auto px-2 py-3">
        
        {/* Left: Name */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={goToCharacterList}
            className="p-2 hover:bg-dark-hover rounded-xl transition-colors text-gray-400 hover:text-white"
            title="К списку персонажей"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="truncate">
            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent truncate">
              {character.name}
            </h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider truncate">
              {character.class} • {character.level} ур.
            </p>
          </div>
        </div>

        {/* Center: Tabs */}
        <div className="flex items-center bg-dark-bg/50 rounded-xl p-1 border border-dark-border/50">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-0 hover:gap-3 px-4 py-2.5 rounded-xl transition-all group ${
                  isActive 
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' 
                    : 'text-gray-400 hover:text-gray-200 hover:bg-dark-card/50'
                }`}
              >
                <Icon className="w-6 h-6 flex-shrink-0" />
                
                <span
                  className={`overflow-hidden whitespace-nowrap text-sm font-bold transition-all duration-300 ${
                    isActive ? 'max-w-[200px] opacity-100 ml-3' : 'max-w-0 opacity-0 group-hover:max-w-[200px] group-hover:opacity-100 group-hover:ml-3'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: Resources, Currency, Ammo, Menu */}
        <div className="flex items-center gap-2">
          {/* Resources */}
          <div className="hidden lg:flex items-center gap-2">
            {resourcesWithValues.map(resource => {
              return (
                <div 
                  key={resource.id}
                  onClick={() => updateResourceCount(resource.id, -1)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    window.dispatchEvent(new CustomEvent('open-character-modal', { 
                      detail: { type: 'resource', data: resource } 
                    }));
                  }}
                  className="relative group cursor-pointer"
                >
                  <div className="w-12 h-12 bg-dark-bg/80 border border-dark-border/50 rounded-xl flex items-center justify-center hover:border-blue-500/50 hover:bg-dark-hover transition-all active:scale-95 shadow-lg">
                    {getLucideIcon(resource.iconName, { className: "w-6 h-6 text-blue-400" })}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm border border-dark-bg">
                      {resource.current}
                    </div>
                  </div>
                  {/* Tooltip */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-dark-card border border-dark-border rounded-lg text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
                    <div className="font-bold text-gray-200">{resource.name}: {resource.current}/{resource.max}</div>
                    <div className="text-gray-500 mt-1">ЛКМ: -1 • ПКМ: просмотр</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Ammo */}
          {totalAmmo > 0 && (
            <div 
              onClick={() => {
                window.dispatchEvent(new CustomEvent('open-character-modal', { 
                  detail: { type: 'ammunition' } 
                }));
              }}
              className="relative group cursor-pointer"
            >
              <div className="w-12 h-12 bg-dark-bg/80 border border-dark-border/50 rounded-xl flex items-center justify-center hover:border-orange-500/50 hover:bg-dark-hover transition-all active:scale-95 shadow-lg">
                <Target className="w-6 h-6 text-orange-400" />
                <div className="absolute -bottom-1 -right-1 min-w-[20px] px-1 h-5 bg-orange-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm border border-dark-bg">
                  {totalAmmo}
                </div>
              </div>
              {/* Tooltip */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-dark-card border border-dark-border rounded-lg text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
                <div className="font-bold text-gray-200">Боеприпасы</div>
                <div className="text-gray-500 mt-1">Клик: быстрая трата</div>
              </div>
            </div>
          )}

          {/* Currency */}
          <div 
            onClick={() => {
              window.dispatchEvent(new CustomEvent('open-character-modal', { 
                detail: { type: 'currency' } 
              }));
            }}
            className="relative group cursor-pointer"
          >
            <div className="w-12 h-12 bg-dark-bg/80 border border-dark-border/50 rounded-xl flex items-center justify-center hover:border-yellow-500/50 hover:bg-dark-hover transition-all active:scale-95 shadow-lg">
              <Coins className="w-6 h-6 text-yellow-500" />
              <div className="absolute -bottom-1 -right-1 min-w-[20px] px-1 h-5 bg-yellow-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm border border-dark-bg">
                {Math.floor(character.currency.gold + character.currency.silver / 10 + character.currency.copper / 100)}
              </div>
            </div>
            {/* Tooltip */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-dark-card border border-dark-border rounded-lg text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
              <div className="font-bold text-gray-200">Валюта: {(character.currency.gold + character.currency.silver / 10 + character.currency.copper / 100).toFixed(2)} ЗМ</div>
              <div className="text-gray-500 mt-1">Клик: управление кошельком</div>
            </div>
          </div>

          {/* Menu */}
          <div className="relative ml-2">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all ${
                isMenuOpen ? 'bg-blue-500 text-white' : 'bg-dark-bg/80 text-gray-400 hover:text-white border border-dark-border/50 shadow-lg'
              }`}
            >
              <Menu className="w-6 h-6" />
            </button>

            <AnimatePresence>
              {isMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-[-1]" 
                    onClick={() => setIsMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-4 w-56 bg-dark-card border border-dark-border rounded-2xl shadow-2xl p-2 z-50 overflow-hidden"
                  >
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Управление
                    </div>
                    <button
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('open-app-settings'));
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-dark-hover rounded-xl text-gray-300 hover:text-white transition-colors text-sm"
                    >
                      <Sliders className="w-4 h-4" />
                      Настройки
                    </button>
                    <button
                      onClick={() => {
                        exportToJSON();
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-dark-hover rounded-xl text-gray-300 hover:text-white transition-colors text-sm"
                    >
                      <FileJson className="w-4 h-4" />
                      Экспорт в JSON
                    </button>
                    <button
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-dark-hover rounded-xl text-gray-300 hover:text-white transition-colors text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Экспорт в PDF
                    </button>
                    <div className="my-1 border-t border-dark-border" />
                    <button
                      onClick={goToCharacterList}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-red-500/10 text-red-400 rounded-xl transition-colors text-sm"
                    >
                      <LogOut className="w-4 h-4" />
                      Выйти из персонажа
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </nav>
  );
};

