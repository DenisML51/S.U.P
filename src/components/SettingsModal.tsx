import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, FolderOpen, Save, Trash2, Bell, Eye, EyeOff, Monitor, LogOut } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useI18n } from '../i18n/I18nProvider';
import { LanguageSwitcher } from './LanguageSwitcher';

interface AppSettings {
  storagePath: string | null;
  autoSave: boolean;
  compactCards: boolean;
  showNotifications: boolean;
  fullscreen: boolean;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  variant?: 'floating' | 'dock';
  userName?: string;
  userEmail?: string;
  onLogout?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  variant = 'floating',
  userName,
  userEmail,
  onLogout
}) => {
  const { t } = useI18n();
  const [settings, setSettings] = useState<AppSettings>({
    storagePath: localStorage.getItem('trpg_storage_path'),
    autoSave: localStorage.getItem('trpg_auto_save') !== 'false',
    compactCards: localStorage.getItem('trpg_compact_cards') === 'true',
    showNotifications: localStorage.getItem('trpg_notifications') !== 'false',
    fullscreen: localStorage.getItem('trpg_fullscreen') === 'true',
  });

  const handleSelectPath = async () => {
    try {
      if (window.electronAPI) {
        const path = await window.electronAPI.selectDirectory();
        if (path) {
          updateSettings({ storagePath: path });
          if (settings.showNotifications) {
            toast.success(`${t('settings.pathChanged')}: ${path}`);
          }
        }
      } else {
        toast.error(t('settings.electronOnly'));
      }
    } catch (error) {
      console.error('Failed to select directory:', error);
      toast.error(t('settings.selectFolderError'));
    }
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    
    if (updated.storagePath) localStorage.setItem('trpg_storage_path', updated.storagePath);
    else localStorage.removeItem('trpg_storage_path');
    
    localStorage.setItem('trpg_auto_save', String(updated.autoSave));
    localStorage.setItem('trpg_compact_cards', String(updated.compactCards));
    localStorage.setItem('trpg_notifications', String(updated.showNotifications));
    localStorage.setItem('trpg_fullscreen', String(updated.fullscreen));

    if (newSettings.hasOwnProperty('fullscreen') && window.electronAPI) {
      window.electronAPI.setFullScreen(updated.fullscreen);
    }

    window.dispatchEvent(new CustomEvent('app-settings-updated', {
      detail: updated
    }));
  };

  if (variant === 'floating' && !isOpen) {
    return null;
  }

  const content = (
    <>
      <div className="p-6 border-b border-white/10 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Settings className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white leading-none">{t('settings.appSettings')}</h3>
            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-1">{t('settings.systemConfig')}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
        {(userName || userEmail || onLogout) && (
          <section className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-dark-bg/50 border border-dark-border rounded-2xl">
              <div>
                <div className="text-sm font-bold text-white">{userName ?? 'User'}</div>
                {userEmail && <div className="text-xs text-gray-400">{userEmail}</div>}
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Выйти</span>
                </button>
              )}
            </div>
          </section>
        )}

        <section className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <FolderOpen className="w-4 h-4 text-blue-400" />
            <h4 className="text-sm font-black uppercase tracking-widest text-gray-400">{t('settings.storage')}</h4>
          </div>
          
          <div className="p-6 bg-dark-bg/50 border border-dark-border rounded-2xl space-y-4 transition-all hover:border-blue-500/30">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('settings.charactersPath')}</label>
              <div className="flex gap-2">
                <div className="flex-1 bg-dark-bg border border-dark-border rounded-xl px-4 py-2 text-sm text-gray-300 truncate flex items-center">
                  {settings.storagePath || t('settings.defaultLocalStorage')}
                </div>
                <button
                  onClick={handleSelectPath}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-xs transition-all shadow-lg shadow-blue-500/20"
                >
                  {t('common.select')}
                </button>
                {settings.storagePath && (
                  <button
                    onClick={() => updateSettings({ storagePath: null })}
                    className="p-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl hover:bg-red-500/20 transition-all"
                    title={t('common.reset')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-[10px] text-gray-500 mt-2 italic">
                {t('settings.storageHint')}
              </p>
            </div>

            <label className="flex items-center justify-between cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${settings.autoSave ? 'bg-green-500/20 border-green-500/30' : 'bg-dark-bg border-dark-border'}`}>
                  <Save className={`w-4 h-4 ${settings.autoSave ? 'text-green-400' : 'text-gray-600'}`} />
                </div>
                <div>
                  <span className={`text-sm font-bold ${settings.autoSave ? 'text-green-400' : 'text-gray-400'}`}>{t('settings.autoSave')}</span>
                  <p className="text-[10px] text-gray-500">{t('settings.autoSaveHint')}</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.autoSave}
                onChange={(e) => updateSettings({ autoSave: e.target.checked })}
                className="hidden"
              />
              <div className={`w-10 h-6 rounded-full relative transition-all ${settings.autoSave ? 'bg-green-500' : 'bg-gray-700'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.autoSave ? 'left-5' : 'left-1'}`} />
              </div>
            </label>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <Monitor className="w-4 h-4 text-purple-400" />
            <h4 className="text-sm font-black uppercase tracking-widest text-gray-400">{t('settings.interface')}</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-dark-bg/50 border border-dark-border rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Monitor className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-gray-300">{t('settings.language')}</span>
              </div>
              <LanguageSwitcher />
            </div>

            <label className="p-4 bg-dark-bg/50 border border-dark-border rounded-2xl flex items-center justify-between cursor-pointer hover:border-purple-500/30 transition-all">
              <div className="flex items-center gap-3">
                {settings.compactCards ? <EyeOff className="w-4 h-4 text-purple-400" /> : <Eye className="w-4 h-4 text-purple-400" />}
                <span className="text-xs font-bold text-gray-300">{t('settings.compactCards')}</span>
              </div>
              <input
                type="checkbox"
                checked={settings.compactCards}
                onChange={(e) => updateSettings({ compactCards: e.target.checked })}
                className="hidden"
              />
              <div className={`w-10 h-6 rounded-full relative transition-all ${settings.compactCards ? 'bg-purple-500' : 'bg-gray-700'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.compactCards ? 'left-5' : 'left-1'}`} />
              </div>
            </label>

            <label className="p-4 bg-dark-bg/50 border border-dark-border rounded-2xl flex items-center justify-between cursor-pointer hover:border-blue-500/30 transition-all">
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-gray-300">{t('settings.notifications')}</span>
              </div>
              <input
                type="checkbox"
                checked={settings.showNotifications}
                onChange={(e) => updateSettings({ showNotifications: e.target.checked })}
                className="hidden"
              />
              <div className={`w-10 h-6 rounded-full relative transition-all ${settings.showNotifications ? 'bg-blue-500' : 'bg-gray-700'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.showNotifications ? 'left-5' : 'left-1'}`} />
              </div>
            </label>

            <label className="p-4 bg-dark-bg/50 border border-dark-border rounded-2xl flex items-center justify-between cursor-pointer hover:border-orange-500/30 transition-all">
              <div className="flex items-center gap-3">
                <Monitor className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-bold text-gray-300">{t('settings.fullscreen')}</span>
              </div>
              <input
                type="checkbox"
                checked={settings.fullscreen}
                onChange={(e) => updateSettings({ fullscreen: e.target.checked })}
                className="hidden"
              />
              <div className={`w-10 h-6 rounded-full relative transition-all ${settings.fullscreen ? 'bg-orange-500' : 'bg-gray-700'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.fullscreen ? 'left-5' : 'left-1'}`} />
              </div>
            </label>
          </div>
        </section>

        {window.electronAPI && (
          <section className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <Trash2 className="w-4 h-4 text-red-400" />
              <h4 className="text-sm font-black uppercase tracking-widest text-gray-400">{t('settings.system')}</h4>
            </div>
            <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl">
              <button
                onClick={() => {
                  if (confirm(t('settings.closeAppConfirm'))) {
                    window.electronAPI.closeApp();
                  }
                }}
                className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-bold text-xs transition-all border border-red-500/20"
              >
                {t('settings.closeApp')}
              </button>
            </div>
          </section>
        )}
      </div>

    </>
  );

  if (variant === 'dock') {
    return (
      <div className="w-full max-h-[70vh] overflow-y-auto rounded-3xl border border-white/10 bg-black/40 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
        {content}
      </div>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-dark-card border border-dark-border rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col"
          >
            {content}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

