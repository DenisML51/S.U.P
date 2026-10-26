import React from 'react';
import { useSessionStore } from '../../store/useSessionStore';

/** Who is signed in and whether their changes have reached the server. Quiet unless something is off. */
export const SyncBadge: React.FC = () => {
  const user = useSessionStore((s) => s.user);
  const offline = useSessionStore((s) => s.offline);
  const sync = useSessionStore((s) => s.sync);

  const state =
    offline || sync.state === 'offline'
      ? { tone: 'warning', text: 'Без сети — изменения сохраняются на устройстве' }
      : sync.state === 'error' || sync.state === 'unauthorized' || sync.rejected.length > 0
        ? { tone: 'danger', text: 'Не всё сохранено на сервере — подробности в настройках' }
        : sync.pending > 0 || sync.state === 'syncing'
          ? { tone: 'ink-muted', text: 'Сохранение…' }
          : { tone: 'success', text: 'Всё сохранено' };

  return (
    <div className="flex items-center gap-2.5 text-sm text-ink-muted" title={state.text}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: `rgb(var(--c-${state.tone}))` }} aria-hidden />
      <span className="max-sm:hidden">{user?.displayName}</span>
      <span className="sr-only">{state.text}</span>
    </div>
  );
};
