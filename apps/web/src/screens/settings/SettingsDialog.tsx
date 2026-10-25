import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { applyFullscreen, type AppSettings } from '../../data/settings';
import type { SyncStatus } from '../../data/sync/syncEngine';
import { useCharacterStore } from '../../store/useCharacterStore';
import { useSessionStore } from '../../store/useSessionStore';
import { ConfirmDialog, Dialog } from '../../ui/Dialog';
import { Switch } from '../../ui/forms';
import { Button, cx } from '../../ui/primitives';
import { IconExit, IconSync } from '../../ui/icons';

const syncLine = (sync: SyncStatus, offline: boolean): { text: string; tone: string } => {
  if (offline || sync.state === 'offline') return { text: 'Нет связи: изменения сохраняются на устройстве', tone: 'text-warning' };
  if (sync.state === 'syncing') return { text: 'Синхронизация…', tone: 'text-ink-muted' };
  if (sync.state === 'error') return { text: sync.lastError ?? 'Ошибка синхронизации', tone: 'text-danger' };
  if (sync.state === 'unauthorized') return { text: 'Сессия истекла, войдите снова', tone: 'text-danger' };
  if (sync.pending > 0) return { text: `Ожидают отправки: ${sync.pending}`, tone: 'text-warning' };
  return { text: 'Всё сохранено на сервере', tone: 'text-success' };
};

const time = (timestamp: number | null) =>
  timestamp ? new Date(timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '—';

/** Account, sync and the few preferences of this device. */
export const SettingsDialog: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const settings = useCharacterStore((s) => s.settings);
  const updateSettings = useCharacterStore((s) => s.updateSettings);
  const { user, sync, offline, syncNow, logout } = useSessionStore();
  const [busy, setBusy] = useState(false);
  const [unsynced, setUnsynced] = useState(0);
  const line = syncLine(sync, offline);

  const set = (patch: Partial<AppSettings>) => {
    updateSettings(patch);
    if (patch.fullscreen !== undefined) void applyFullscreen(patch.fullscreen);
  };

  const signOut = async (force = false) => {
    setBusy(true);
    try {
      const result = await logout(force ? { force: true } : undefined);
      if (!force && result.unsynced > 0) setUnsynced(result.unsynced);
      else onClose();
    } finally {
      setBusy(false);
    }
  };

  const syncAgain = async () => {
    await syncNow();
    const after = useSessionStore.getState().sync;
    if (after.state === 'idle' && after.pending === 0) toast.success('Синхронизировано');
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        setting="service"
        title="Настройки"
        width="md"
        footer={
          <Button variant="primary" onClick={onClose}>
            Готово
          </Button>
        }
      >
        <section>
          <h3 className="ui-label">Аккаунт</h3>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="truncate text-ink">{user?.displayName}</div>
              <div className="truncate text-sm text-ink-faint">{user?.email}</div>
            </div>
            <Button variant="ghost" size="sm" icon={<IconExit width={16} height={16} />} onClick={() => void signOut()} disabled={busy}>
              Выйти
            </Button>
          </div>
        </section>

        <section className="mt-6">
          <h3 className="ui-label">Синхронизация</h3>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className={cx('text-sm', line.tone)}>{line.text}</div>
              <div className="text-xs text-ink-faint">последняя: {time(sync.lastSyncedAt)}</div>
            </div>
            <Button
              size="sm"
              icon={<IconSync width={16} height={16} className={sync.state === 'syncing' ? 'animate-spin' : undefined} />}
              onClick={() => void syncAgain()}
              disabled={sync.state === 'syncing'}
            >
              Синхронизировать
            </Button>
          </div>
          {sync.rejected.length > 0 && (
            <div className="mt-3 border-l-2 border-danger/70 pl-3 text-sm">
              <div className="text-danger">Сервер не принял изменения, они есть только на этом устройстве:</div>
              {sync.rejected.map((r) => (
                <div key={r.id} className="text-ink-muted">
                  {r.name}: {r.reason}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-6 space-y-4">
          <h3 className="ui-label">Это устройство</h3>
          <Switch
            checked={settings.notifications}
            onChange={(notifications) => set({ notifications })}
            label="Уведомления"
            hint="Сообщения об изменениях с кнопкой «Отменить», о тратах ресурсов и импорте героев"
          />
          <Switch
            checked={settings.fullscreen}
            onChange={(fullscreen) => set({ fullscreen })}
            label="Полный экран"
            hint="Лист рассчитан на весь экран без прокрутки"
          />
        </section>

      </Dialog>

      <ConfirmDialog
        open={unsynced > 0}
        title="Выйти без синхронизации?"
        message={`${unsynced} изменений ещё не отправлены на сервер. После выхода они пропадут с этого устройства.`}
        confirmLabel="Выйти"
        danger
        setting="service"
        onCancel={() => setUnsynced(0)}
        onConfirm={() => {
          setUnsynced(0);
          void signOut(true);
        }}
      />
    </>
  );
};
