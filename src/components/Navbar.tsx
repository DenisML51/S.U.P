import React, { useState, useEffect } from 'react';
import { useCharacterStore } from '../store/useCharacterStore';
import { TabType } from '../types';
import { 
  User, 
  Heart, 
  Sparkles, 
  Swords, 
  Shield, 
  Briefcase, 
  BarChart2,
  Menu,
  Bell,
  Coins,
  Target,
  ChevronLeft,
  Settings,
  LogOut,
  Download,
  FileJson,
  Sliders,
  Wand2,
  History as HistoryLogIcon,
  X,
  Clock,
  Activity,
  Zap as SanityIcon,
  Package,
  Star,
  MessageSquare
} from 'lucide-react';
import { getLucideIcon } from '../utils/iconUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { SettingsModal } from './SettingsModal';
import { useAuthStore } from '../store/useAuthStore';
import { useSystemNotificationsStore } from '../store/useSystemNotificationsStore';
import { useI18n } from '../i18n/I18nProvider';

import { exportToPDF } from '../utils/pdfExport';

export const Navbar: React.FC = () => {
  const { t } = useI18n();
  const { user } = useAuthStore();
  const { notifications, fetchNotifications, markRead, markAllRead } = useSystemNotificationsStore();
  const { 
    character, 
    activeTab, 
    setActiveTab, 
    goToCharacterList, 
    exportToJSON, 
    updateResourceCount,
    resetAllResources,
    viewMode,
    setViewMode
  } = useCharacterStore();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [isXl, setIsXl] = useState(window.innerWidth < 1280);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isResourcesOpen, setIsResourcesOpen] = useState(false);
  const [isResourcesExpanded, setIsResourcesExpanded] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const mobile = width < 1024;
      const xl = width < 1280;
      setIsMobile(mobile);
      setIsXl(xl);
      if (!mobile && activeTab === 'stats') {
        setActiveTab('personality');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTab, setActiveTab]);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
  }, [user, fetchNotifications]);

  if (!character) return null;

  const totalAmmo = character.inventory
    .filter(item => item.type === 'ammunition')
    .reduce((sum, item) => sum + (item.quantity || 0), 0);

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'stats', label: t('tabs.stats'), icon: BarChart2 },
    { id: 'personality', label: t('tabs.hero'), icon: User },
    { id: 'health', label: t('tabs.health'), icon: Heart },
    { id: 'abilities', label: t('tabs.abilities'), icon: Sparkles },
    { id: 'spells', label: t('tabs.magic'), icon: Wand2 },
    { id: 'attacks', label: t('tabs.attacks'), icon: Swords },
    { id: 'equipment', label: t('tabs.armor'), icon: Shield },
    { id: 'inventory', label: t('tabs.items'), icon: Briefcase }
  ];
  const visibleTabs = isMobile ? tabs : tabs.filter((tab) => tab.id !== 'stats');
  const resourcesWithValues = character.resources.filter(r => r.max > 0);
  const unreadCount = notifications.filter((item) => !item.isRead).length;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 p-8 pointer-events-none">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4 pointer-events-auto px-2 py-3">
        
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setViewMode(viewMode === 'tabs' ? 'hotbar' : 'tabs')}
            className="truncate text-left group border border-transparent hover:border-white/10 rounded-xl px-3 py-1.5 -mx-3 transition-all"
            title={viewMode === 'tabs' ? t('navbar.switchCombat') : t('navbar.switchTabs')}
          >
            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent truncate group-hover:from-blue-300 group-hover:to-purple-400 transition-all">
              {character.name.split(' ')[0].replace(/[.,!?;:]+$/, '')}
            </h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider truncate flex items-center gap-1.5">
              {character.class} • {character.level} {t('common.levelShort')}
              {viewMode === 'hotbar' && <Activity className="w-2.5 h-2.5 text-blue-400 animate-pulse" />}
            </p>
          </button>
        </div>

        <div className="flex items-center bg-dark-bg/50 rounded-xl p-1 border border-dark-border/50 overflow-x-auto no-scrollbar">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => viewMode !== 'hotbar' && setActiveTab(tab.id)}
                disabled={viewMode === 'hotbar'}
                className={`relative flex items-center justify-center gap-0 px-3 lg:px-4 py-2.5 rounded-xl transition-all group ${
                  viewMode !== 'hotbar' ? 'lg:hover:gap-3' : ''
                } ${
                  isActive 
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' 
                    : `text-gray-400 ${viewMode !== 'hotbar' ? 'hover:text-gray-200 hover:bg-dark-card/50' : ''}`
                } ${viewMode === 'hotbar' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Icon className="w-5 h-5 lg:w-6 lg:h-6 flex-shrink-0" />
                
                <span
                  className={`overflow-hidden whitespace-nowrap text-sm font-bold transition-all duration-300 ${
                    isActive 
                      ? 'max-w-0 lg:max-w-[200px] lg:opacity-100 lg:ml-3' 
                      : `max-w-0 opacity-0 ${viewMode !== 'hotbar' ? 'lg:group-hover:max-w-[200px] lg:group-hover:opacity-100 lg:group-hover:ml-3' : ''}`
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => {
                setIsNotificationsOpen((prev) => !prev);
                if (!isNotificationsOpen) {
                  const unreadIds = notifications.filter((item) => !item.isRead).map((item) => item.id);
                  if (unreadIds.length > 0) {
                    void markRead(unreadIds);
                  }
                }
              }}
              className="w-12 h-12 bg-dark-bg/80 border border-dark-border/50 rounded-xl flex items-center justify-center hover:bg-dark-card transition-all active:scale-95 shadow-lg relative"
              title={t('navbar.systemNotifications')}
            >
              <Bell className="w-5 h-5 text-gray-300" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-500 text-white text-[10px] font-black flex items-center justify-center border border-dark-bg">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {isNotificationsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-[50]"
                    onClick={() => setIsNotificationsOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    className="absolute right-0 mt-3 w-[360px] bg-[#1a1a1a] border border-[#333] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden z-[60] backdrop-blur-xl"
                  >
                    <div className="px-4 py-3 border-b border-[#333] flex items-center justify-between">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{t('navbar.notifications')}</div>
                      <button
                        onClick={() => {
                          void markAllRead();
                        }}
                        className="text-[10px] text-blue-400 hover:text-blue-300 font-bold"
                      >
                        {t('navbar.markAllRead')}
                      </button>
                    </div>
                    <div className="max-h-[420px] overflow-y-auto custom-scrollbar p-2">
                      {notifications.length > 0 ? (
                        <div className="space-y-1">
                          {notifications.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => {
                                if (!item.isRead) {
                                  void markRead([item.id]);
                                }
                              }}
                              className={`w-full text-left p-3 rounded-xl border transition-all ${
                                item.isRead
                                  ? 'bg-black/20 border-[#2e2e2e] text-gray-400'
                                  : 'bg-blue-500/10 border-blue-500/30 text-gray-100'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="font-bold text-sm">{item.title}</div>
                                {!item.isRead && <span className="w-2 h-2 mt-1 rounded-full bg-blue-400" />}
                              </div>
                              <div className="text-xs mt-1.5 leading-snug">{item.message}</div>
                              <div className="text-[10px] mt-2 text-gray-500">
                                {new Date(item.publishedAt).toLocaleString()}
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="py-10 text-center text-gray-500 text-sm">{t('navbar.noNotifications')}</div>
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {viewMode !== 'hotbar' && resourcesWithValues.length > 0 && (
            <div className="hidden xl:flex items-center gap-2">
              {resourcesWithValues.length > 5 && (
                <button
                  onClick={() => setIsResourcesExpanded(!isResourcesExpanded)}
                  className={`w-12 h-12 bg-dark-bg/80 border border-dark-border/50 rounded-xl flex items-center justify-center hover:bg-dark-card transition-all active:scale-95 shadow-lg group relative ${isResourcesExpanded ? 'bg-blue-500/20 border-blue-500/50' : ''}`}
                  title={isResourcesExpanded ? t('navbar.collapseResources') : t('navbar.showAllResources')}
                >
                  <ChevronLeft className={`w-6 h-6 transition-transform ${isResourcesExpanded ? 'rotate-180 text-blue-400' : 'text-gray-400 group-hover:text-white'}`} />
                  {!isResourcesExpanded && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm border border-dark-bg">
                      {resourcesWithValues.length - 5}
                    </div>
                  )}
                </button>
              )}
              
              <AnimatePresence mode="popLayout">
                {(isResourcesExpanded 
                  ? resourcesWithValues 
                  : resourcesWithValues.slice(-5)
                ).map((resource, idx) => {
                  const total = resourcesWithValues.length;
                  const isExtra = isResourcesExpanded && idx < (total - 5);
                  
                return (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, scale: 0.5, x: 50, rotate: 10 }}
                      animate={{ 
                        opacity: 1, 
                        scale: 1, 
                        x: 0, 
                        rotate: 0,
                        transition: {
                          type: "spring",
                          stiffness: 400,
                          damping: 25,
                          delay: isExtra ? (resourcesWithValues.length - 5 - idx) * 0.06 : 0
                        }
                      }}
                      exit={{ 
                        opacity: 0, 
                        scale: 0.5, 
                        x: 20,
                        transition: { duration: 0.15 }
                      }}
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
                    <div 
                      className="w-12 h-12 bg-dark-bg/80 border rounded-xl flex items-center justify-center transition-all active:scale-95 shadow-lg"
                      style={{ 
                        borderColor: `${resource.color || '#3b82f6'}30`
                      }}
                    >
                      {getLucideIcon(resource.iconName, { 
                        size: 24, 
                        style: { color: resource.color || '#3b82f6' }
                      })}
                      <div 
                        className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm border border-dark-bg"
                        style={{ backgroundColor: resource.color || '#3b82f6' }}
                      >
                        {resource.current}
                      </div>
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-dark-card border border-dark-border rounded-lg text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
                      <div className="font-bold text-gray-200">{resource.name}: {resource.current}/{resource.max}</div>
                      <div className="text-gray-500 mt-1">{t('navbar.resourceHint')}</div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            </div>
          )}

          {viewMode !== 'hotbar' && totalAmmo > 0 && (
            <div 
              onClick={() => {
                window.dispatchEvent(new CustomEvent('open-character-modal', { 
                  detail: { type: 'ammunition' } 
                }));
              }}
              className="hidden lg:relative lg:group lg:cursor-pointer lg:flex"
            >
              <div className="w-12 h-12 bg-dark-bg/80 border border-dark-border/50 rounded-xl flex items-center justify-center hover:border-orange-500/50 hover:bg-dark-hover transition-all active:scale-95 shadow-lg">
                <Target className="w-6 h-6 text-orange-400" />
                <div className="absolute -bottom-1 -right-1 min-w-[20px] px-1 h-5 bg-orange-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm border border-dark-bg">
                  {totalAmmo}
                </div>
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-dark-card border border-dark-border rounded-lg text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
                <div className="font-bold text-gray-200">{t('navbar.ammo')}</div>
                <div className="text-gray-500 mt-1">{t('navbar.quickSpend')}</div>
              </div>
            </div>
          )}

          {viewMode !== 'hotbar' && (
            <div 
              onClick={() => {
                window.dispatchEvent(new CustomEvent('open-character-modal', { 
                  detail: { type: 'currency' } 
                }));
              }}
              className="hidden lg:relative lg:group lg:cursor-pointer lg:flex"
            >
              <div className="w-12 h-12 bg-dark-bg/80 border border-dark-border/50 rounded-xl flex items-center justify-center hover:border-yellow-500/50 hover:bg-dark-hover transition-all active:scale-95 shadow-lg">
                <Coins className="w-6 h-6 text-yellow-500" />
                <div className="absolute -bottom-1 -right-1 min-w-[20px] px-1 h-5 bg-yellow-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm border border-dark-bg">
                  {Math.floor(character.currency.gold + character.currency.silver / 10 + character.currency.copper / 100)}
                </div>
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-dark-card border border-dark-border rounded-lg text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
                <div className="font-bold text-gray-200">{t('navbar.currency')}: {(character.currency.gold + character.currency.silver / 10 + character.currency.copper / 100).toFixed(2)} {t('navbar.goldShort')}</div>
                <div className="text-gray-500 mt-1">{t('navbar.walletHint')}</div>
              </div>
            </div>
          )}

          <div className="relative ml-2">
            <button
              onClick={() => {
                setIsMenuOpen(!isMenuOpen);
                if (isHistoryOpen) setIsHistoryOpen(false);
              }}
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
                    className="fixed inset-0 z-[50]" 
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsHistoryOpen(false);
                      setIsResourcesOpen(false);
                    }}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-4 w-64 bg-[#1a1a1a] border border-[#333] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] py-2 z-[60] overflow-visible backdrop-blur-xl"
                  >
                    <div className="px-4 py-3 mb-1">
                      <div className="text-sm font-bold text-white mb-0.5 truncate">{character.name}</div>
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded-lg text-[9px] font-black text-blue-400 uppercase tracking-wider">
                        <Activity className="w-2.5 h-2.5" />
                        {character.class} • {character.level} {t('common.levelShort')}
                      </div>
                    </div>

                    <div className="h-[1px] bg-[#333] mx-2 mb-1" />

                    <div className="relative px-2">
                      <button
                        onMouseEnter={() => {
                          setIsResourcesOpen(true);
                          setIsHistoryOpen(false);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsResourcesOpen(!isResourcesOpen);
                          if (isHistoryOpen) setIsHistoryOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[#2a2a2a] transition-all text-sm group ${
                          isResourcesOpen ? 'bg-[#2a2a2a] text-white' : 'text-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Sparkles className={`w-4 h-4 transition-colors ${isResourcesOpen ? 'text-blue-400' : 'text-gray-400 group-hover:text-blue-400'}`} />
                          <span className="group-hover:text-white">{t('navbar.resources')}</span>
                        </div>
                        <ChevronLeft className={`w-4 h-4 transition-all ${isResourcesOpen ? 'text-blue-400 -translate-x-1' : 'text-gray-600'}`} />
                      </button>

                      <AnimatePresence>
                        {isResourcesOpen && (
                          <motion.div
                            initial={{ opacity: 0, x: 10, scale: 0.98 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 10, scale: 0.98 }}
                            className="absolute right-[calc(100%+12px)] top-[-40px] w-64 bg-[#1a1a1a] border border-[#333] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden z-[70] backdrop-blur-xl pointer-events-auto"
                          >
                            <div className="px-4 py-3 border-b border-[#333] bg-[#111]/50 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{t('navbar.resourceManagement')}</span>
                              </div>
                            </div>
                            <div className="p-1.5 max-h-[400px] overflow-y-auto custom-scrollbar">
                              {resourcesWithValues.length > 0 ? (
                                <div className="space-y-1">
                                  {resourcesWithValues.map(resource => (
                                    <button
                                      key={resource.id}
                                      onClick={() => updateResourceCount(resource.id, -1)}
                                      onContextMenu={(e) => {
                                        e.preventDefault();
                                        window.dispatchEvent(new CustomEvent('open-character-modal', { 
                                          detail: { type: 'resource', data: resource } 
                                        }));
                                        setIsMenuOpen(false);
                                      }}
                                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[#2a2a2a] text-gray-300 transition-all text-sm group"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div 
                                          className="w-8 h-8 rounded-lg flex items-center justify-center bg-black/20"
                                          style={{ color: resource.color || '#3b82f6' }}
                                        >
                                          {getLucideIcon(resource.iconName, { size: 16 })}
                                        </div>
                                        <div className="flex flex-col items-start">
                                          <span className="group-hover:text-white text-[13px] font-medium">{resource.name}</span>
                                        </div>
                                      </div>
                                      <div 
                                        className="text-xs font-black px-2 py-1 rounded-lg bg-black/40 border border-white/5"
                                        style={{ color: resource.color || '#3b82f6' }}
                                      >
                                        {resource.current}/{resource.max}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <div className="py-8 flex flex-col items-center justify-center text-gray-600 text-center">
                                  <Sparkles className="w-8 h-8 opacity-10 mb-2" />
                                  <p className="text-[9px] font-black uppercase tracking-widest opacity-40">{t('navbar.noResources')}</p>
                                </div>
                              )}
                            </div>
                            <div className="p-3 bg-[#111]/30 border-t border-[#333] flex flex-col gap-2">
                              {resourcesWithValues.length > 0 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm(t('navbar.restoreAllResourcesConfirm'))) {
                                      resetAllResources();
                                    }
                                  }}
                                  className="w-full py-2 bg-blue-600/20 border border-blue-500/30 rounded-lg text-[9px] font-black uppercase tracking-widest text-blue-400 hover:bg-blue-600/30 hover:text-blue-300 transition-all"
                                >
                                  {t('navbar.longRest')}
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsResourcesOpen(false);
                                }}
                                className="w-full py-2 bg-[#222] border border-[#333] rounded-lg text-[9px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
                              >
                                {t('common.collapse')}
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="relative px-2">
                      <button
                        onMouseEnter={() => {
                          setIsHistoryOpen(true);
                          setIsResourcesOpen(false);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsHistoryOpen(!isHistoryOpen);
                          if (isResourcesOpen) setIsResourcesOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[#2a2a2a] transition-all text-sm group ${
                          isHistoryOpen ? 'bg-[#2a2a2a] text-white' : 'text-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <HistoryLogIcon className={`w-4 h-4 transition-colors ${isHistoryOpen ? 'text-blue-400' : 'text-gray-400 group-hover:text-blue-400'}`} />
                          <span className="group-hover:text-white">{t('navbar.eventHistory')}</span>
                        </div>
                        <ChevronLeft className={`w-4 h-4 transition-all ${isHistoryOpen ? 'text-blue-400 -translate-x-1' : 'text-gray-600'}`} />
                      </button>

                      <AnimatePresence>
                        {isHistoryOpen && (
                          <motion.div
                            initial={{ opacity: 0, x: 10, scale: 0.98 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 10, scale: 0.98 }}
                            className="absolute right-[calc(100%+12px)] top-[-60px] w-80 bg-[#1a1a1a] border border-[#333] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden z-[70] backdrop-blur-xl pointer-events-auto"
                          >
                            <div className="px-4 py-3 border-b border-[#333] bg-[#111]/50 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-blue-400" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{t('navbar.sessionLog')}</span>
                              </div>
                              <div className="px-1.5 py-0.5 bg-blue-500/10 rounded text-[8px] font-black text-blue-500 border border-blue-500/20">LIVE</div>
                            </div>
                            <div className="p-1.5 max-h-[450px] overflow-y-auto custom-scrollbar">
                              {character.history && character.history.length > 0 ? (
                                <div className="space-y-0.5">
                                  {character.history.map((entry) => {
                                    const Icon = entry.type === 'health' ? Heart : 
                                                 entry.type === 'sanity' ? SanityIcon :
                                                 entry.type === 'resource' ? Sparkles :
                                                 entry.type === 'inventory' ? Package :
                                                 entry.type === 'exp' ? Star : MessageSquare;
                                    
                                    const colorClass = entry.type === 'health' ? 'text-red-400' : 
                                                     entry.type === 'sanity' ? 'text-purple-400' :
                                                     entry.type === 'resource' ? 'text-blue-400' :
                                                     entry.type === 'inventory' ? 'text-amber-400' :
                                                     entry.type === 'exp' ? 'text-green-400' : 'text-gray-400';
                                    
                                    const bgColor = entry.type === 'health' ? 'group-hover:bg-red-500/5' : 
                                                   entry.type === 'sanity' ? 'group-hover:bg-purple-500/5' :
                                                   entry.type === 'resource' ? 'group-hover:bg-blue-500/5' :
                                                   entry.type === 'inventory' ? 'group-hover:bg-amber-500/5' :
                                                   entry.type === 'exp' ? 'group-hover:bg-green-500/5' : 'group-hover:bg-gray-500/5';

                                    return (
                                      <div key={entry.id} className={`p-2.5 rounded-xl transition-all border border-transparent hover:border-[#333] group/item ${bgColor}`}>
                                        <div className="flex items-center justify-between mb-1">
                                          <div className={`flex items-center gap-2 text-[8px] font-black uppercase tracking-wider ${colorClass}`}>
                                            <Icon className="w-2.5 h-2.5" />
                                            <span>{entry.type}</span>
                                          </div>
                                          <span className="text-[8px] text-gray-600 font-bold">
                                            {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                          </span>
                                        </div>
                                        <div className="text-[11px] text-gray-400 leading-snug group-hover/item:text-gray-200 transition-colors">
                                          {entry.message}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="py-12 flex flex-col items-center justify-center text-gray-600 text-center">
                                  <HistoryLogIcon className="w-8 h-8 opacity-10 mb-2" />
                                  <p className="text-[9px] font-black uppercase tracking-widest opacity-40">{t('navbar.noEntries')}</p>
                                </div>
                              )}
                            </div>
                            <div className="p-3 bg-[#111]/30 border-t border-[#333] text-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsHistoryOpen(false);
                                }}
                                className="w-full py-2 bg-[#222] border border-[#333] rounded-lg text-[9px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
                              >
                                {t('common.collapse')}
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {isMobile && (
                      <>
                        <div className="px-4 py-1.5 text-[10px] text-gray-500 font-bold uppercase tracking-widest">{t('navbar.inventory')}</div>
                        {totalAmmo > 0 && (
                          <button
                            onClick={() => {
                              window.dispatchEvent(new CustomEvent('open-character-modal', { 
                                detail: { type: 'ammunition' } 
                              }));
                              setIsMenuOpen(false);
                            }}
                            className="w-full flex items-center justify-between px-4 py-2 hover:bg-[#2a2a2a] text-gray-300 transition-colors text-sm group"
                          >
                            <div className="flex items-center gap-3">
                              <Target className="w-4 h-4 text-orange-400 group-hover:text-orange-300" />
                              <span className="group-hover:text-white">{t('navbar.ammo')}</span>
                            </div>
                            <span className="text-xs font-bold text-orange-400">{totalAmmo}</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            window.dispatchEvent(new CustomEvent('open-character-modal', { 
                              detail: { type: 'currency' } 
                            }));
                            setIsMenuOpen(false);
                          }}
                          className="w-full flex items-center justify-between px-4 py-2 hover:bg-[#2a2a2a] text-gray-300 transition-colors text-sm group"
                        >
                          <div className="flex items-center gap-3">
                            <Coins className="w-4 h-4 text-yellow-500 group-hover:text-yellow-400" />
                            <span className="group-hover:text-white">{t('navbar.currency')}</span>
                          </div>
                          <span className="text-xs font-bold text-yellow-500">
                            {Math.floor(character.currency.gold + character.currency.silver / 10 + character.currency.copper / 100)}
                          </span>
                        </button>
                        <div className="h-[1px] bg-[#333] mx-2 my-1" />
                      </>
                    )}

                    <div className="px-2">
                      <button
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('open-app-settings'));
                          setIsMenuOpen(false);
                        }}
                        onMouseEnter={() => setIsHistoryOpen(false)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#2a2a2a] text-gray-300 hover:text-white transition-all text-sm group"
                      >
                        <Sliders className="w-4 h-4 text-gray-400 group-hover:text-purple-400" />
                        <span>{t('navbar.settings')}</span>
                      </button>
                    </div>

                    <div className="h-[1px] bg-[#333] mx-2 my-1" />

                    <div className="px-2 space-y-0.5">
                      <button
                        onClick={() => {
                          exportToJSON();
                          setIsMenuOpen(false);
                        }}
                        onMouseEnter={() => setIsHistoryOpen(false)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#2a2a2a] text-gray-300 hover:text-white transition-all text-sm group"
                      >
                        <FileJson className="w-4 h-4 text-gray-400 group-hover:text-amber-400" />
                        <span>{t('navbar.exportJson')}</span>
                      </button>

                      <button
                        onClick={() => {
                          exportToPDF(character);
                          setIsMenuOpen(false);
                        }}
                        onMouseEnter={() => setIsHistoryOpen(false)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#2a2a2a] text-gray-300 hover:text-white transition-all text-sm group"
                      >
                        <Download className="w-4 h-4 text-gray-400 group-hover:text-green-400" />
                        <span>{t('navbar.exportPdf')}</span>
                      </button>
                    </div>

                    <div className="h-[1px] bg-[#333] mx-2 my-1" />

                    <div className="px-2">
                      <button
                        onClick={goToCharacterList}
                        onMouseEnter={() => setIsHistoryOpen(false)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-red-400/80 hover:text-red-400 transition-all text-sm group"
                      >
                        <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        <span>{t('navbar.leaveCharacter')}</span>
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      </div>
    </nav>
  );
};
