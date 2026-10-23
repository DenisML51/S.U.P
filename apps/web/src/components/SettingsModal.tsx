import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, Bell, Eye, EyeOff, Monitor, Cloud, CloudOff, RefreshCw, LogOut, AlertTriangle, UserCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useCharacterStore } from '../store/useCharacterStore';
import { useSessionStore } from '../store/useSessionStore';
import { applyFullscreen, type AppSettings } from '../data/settings';
import type { SyncStatus } from '../data/sync/syncEngine';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const syncLabel = (sync: SyncStatus, offline: boolean): { text: string; tone: string } => {
  if (offline || sync.state === 'offline') return { text: 'Нет связи — изменения сохраняются на устройстве', tone: 'text-orange-400' };
  if (sync.state === 'syncing') return { text: 'Синхронизация…', tone: 'text-blue-400' };
  if (sync.state === 'error') return { text: sync.lastError ?? 'Ошибка синхронизации', tone: 'text-red-400' };
  if (sync.state === 'unauthorized') return { text: 'Сессия истекла', tone: 'text-red-400' };
  if (sync.pending > 0) return { text: `Ожидают отправки: ${sync.pending}`, tone: 'text-orange-400' };
  return { text: 'Все изменения сохранены на сервере', tone: 'text-green-400' };
};

const formatTime = (timestamp: number | null) =>
  timestamp ? new Date(timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '—';

const Toggle: React.FC<{
  checked: boolean;
  onChange: (value: boolean) => void;
  icon: React.ReactNode;
  label: string;
  /** Full class names (Tailwind only generates classes it can see literally). */
  accent: { on: string; hover: string };
}> = ({ checked, onChange, icon, label, accent }) => (
  <label className={`p-4 bg-dark-bg/50 border border-dark-border rounded-2xl flex items-center justify-between cursor-pointer ${accent.hover} transition-all`}>
    <div className="flex items-center gap-3">
      {icon}
      <span className="text-xs font-bold text-gray-300">{label}</span>
    </div>
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="hidden" />
    <div className={`w-10 h-6 rounded-full relative transition-all ${checked ? accent.on : 'bg-gray-700'}`}>
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${checked ? 'left-5' : 'left-1'}`} />
    </div>
  </label>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const settings = useCharacterStore((s) => s.settings);
  const updateSettings = useCharacterStore((s) => s.updateSettings);
  const { user, sync, offline, syncNow, logout } = useSessionStore();
  const [signingOut, setSigningOut] = useState(false);

  const setSetting = (patch: Partial<AppSettings>) => {
    updateSettings(patch);
    if (patch.fullscreen !== undefined) void applyFullscreen(patch.fullscreen);
  };

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      const { unsynced } = await logout();
      if (unsynced > 0) {
        const confirmed = window.confirm(
          `${unsynced} изменений ещё не отправлены на сервер (нет связи). При выходе они будут потеряны. Всё равно выйти?`,
        );
        if (confirmed) await logout({ force: true });
        else return;
      }
      onClose();
    } finally {
      setSigningOut(false);
    }
  };

  const handleSync = async () => {
    await syncNow();
    const { sync: after } = useSessionStore.getState();
    if (after.state === 'idle' && after.pending === 0) toast.success('Синхронизировано');
  };

  const status = syncLabel(sync, offline);

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
            <div className="p-6 border-b border-dark-border flex justify-between items-center bg-dark-card/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white leading-none">Настройки приложения</h3>
                  <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-1">Конфигурация системы</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
              <section className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  {offline || sync.state === 'offline' ? (
                    <CloudOff className="w-4 h-4 text-orange-400" />
                  ) : (
                    <Cloud className="w-4 h-4 text-blue-400" />
                  )}
                  <h4 className="text-sm font-black uppercase tracking-widest text-gray-400">Аккаунт и синхронизация</h4>
                </div>

                <div className="p-6 bg-dark-bg/50 border border-dark-border rounded-2xl space-y-4 transition-all hover:border-blue-500/30">
                  <div className="flex items-center gap-3">
                    <UserCircle className="w-8 h-8 text-gray-500" />
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">{user?.displayName}</div>
                      <div className="text-[11px] text-gray-500 truncate">{user?.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className={`text-xs font-bold ${status.tone}`}>{status.text}</div>
                      <div className="text-[10px] text-gray-500 mt-1">Последняя синхронизация: {formatTime(sync.lastSyncedAt)}</div>
                    </div>
                    <button
                      onClick={handleSync}
                      disabled={sync.state === 'syncing'}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white rounded-xl font-bold text-xs transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${sync.state === 'syncing' ? 'animate-spin' : ''}`} />
                      Синхронизировать
                    </button>
                  </div>

                  {sync.rejected.length > 0 && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-red-400">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Сервер не принял изменения (сохранены только на устройстве):
                      </div>
                      {sync.rejected.map((r) => (
                        <div key={r.id} className="text-[11px] text-gray-400">
                          {r.name}: {r.reason}
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={handleLogout}
                    disabled={signingOut}
                    className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-60 text-red-400 rounded-xl font-bold text-xs transition-all border border-red-500/20 flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Выйти из аккаунта
                  </button>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <Monitor className="w-4 h-4 text-purple-400" />
                  <h4 className="text-sm font-black uppercase tracking-widest text-gray-400">Интерфейс</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Toggle
                    checked={settings.compactCards}
                    onChange={(compactCards) => setSetting({ compactCards })}
                    icon={settings.compactCards ? <EyeOff className="w-4 h-4 text-purple-400" /> : <Eye className="w-4 h-4 text-purple-400" />}
                    label="Компактные карточки"
                    accent={{ on: 'bg-purple-500', hover: 'hover:border-purple-500/30' }}
                  />
                  <Toggle
                    checked={settings.notifications}
                    onChange={(notifications) => setSetting({ notifications })}
                    icon={<Bell className="w-4 h-4 text-blue-400" />}
                    label="Уведомления"
                    accent={{ on: 'bg-blue-500', hover: 'hover:border-blue-500/30' }}
                  />
                  <Toggle
                    checked={settings.fullscreen}
                    onChange={(fullscreen) => setSetting({ fullscreen })}
                    icon={<Monitor className="w-4 h-4 text-orange-400" />}
                    label="Полноэкранный режим"
                    accent={{ on: 'bg-orange-500', hover: 'hover:border-orange-500/30' }}
                  />
                </div>
              </section>
            </div>

            <div className="p-6 bg-dark-card/50 border-t border-dark-border">
              <button
                onClick={onClose}
                className="w-full py-4 bg-dark-bg border border-dark-border rounded-2xl font-black uppercase tracking-widest text-gray-400 hover:text-white hover:border-gray-600 transition-all text-xs"
              >
                Закрыть настройки
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
