import React from 'react';
import { useSessionStore } from '../store/useSessionStore';

/**
 * Compact online/sync indicator for the in-play screens (sheet, combat, party): a coloured dot and a
 * short word — green when everything has reached the server, amber without a network, red when a save
 * failed. The full sentence stays in the tooltip and for screen readers. Unlike the account badge on
 * the home and select screens, this carries no name: during play the point is the connection, not who.
 */
export const SyncStatus: React.FC<{ className?: string }> = ({ className }) => {
  const offline = useSessionStore((s) => s.offline);
  const sync = useSessionStore((s) => s.sync);

  const state =
    offline || sync.state === 'offline'
      ? { tone: 'warning', label: 'Без сети', text: 'Без сети — изменения сохраняются на устройстве' }
      : sync.state === 'error' || sync.state === 'unauthorized' || sync.rejected.length > 0
        ? { tone: 'danger', label: 'Не сохранено', text: 'Не всё сохранено на сервере — подробности в настройках' }
        : sync.pending > 0 || sync.state === 'syncing'
          ? { tone: 'ink-muted', label: 'Сохранение…', text: 'Изменения сохраняются на сервере…' }
          : { tone: 'success', label: 'В сети', text: 'Всё сохранено на сервере' };

  return (
    <span
      className={`inline-flex select-none items-center gap-2 text-xs text-ink-muted${className ? ` ${className}` : ''}`}
      title={state.text}
      role="status"
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: `rgb(var(--c-${state.tone}))` }} aria-hidden />
      <span>{state.label}</span>
      <span className="sr-only">{state.text}</span>
    </span>
  );
};
