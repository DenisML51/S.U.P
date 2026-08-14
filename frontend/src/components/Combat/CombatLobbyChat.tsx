import React, { useMemo, useState } from 'react';
import { useLobbyStore } from '../../store/useLobbyStore';
import { useAuthStore } from '../../store/useAuthStore';

type CombatLobbyChatProps = {
  variant?: 'overlay' | 'embedded';
};

export const CombatLobbyChat: React.FC<CombatLobbyChatProps> = ({ variant = 'overlay' }) => {
  const { user } = useAuthStore();
  const { lobby, meRole, messages, sendMasterMessage, sendMasterNotification } = useLobbyStore();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => messages.slice(-80), [messages]);

  if (!lobby) return null;

  const canSend = true;
  const canNotify = meRole === 'MASTER';
  const onSend = async () => {
    if (!canSend || !text.trim()) return;
    setBusy(true);
    try {
      await sendMasterMessage(text.trim());
      setText('');
    } finally {
      setBusy(false);
    }
  };

  const onNotify = async () => {
    if (!canSend || !text.trim()) return;
    setBusy(true);
    try {
      await sendMasterNotification(text.trim());
      setText('');
    } finally {
      setBusy(false);
    }
  };

  const asideClass =
    variant === 'embedded'
      ? 'w-full rounded-2xl border border-white/10 bg-dark-bg/70 p-3 shadow-xl backdrop-blur-xl'
      : 'fixed right-3 top-[130px] z-[130] w-[320px] rounded-2xl border border-white/10 bg-dark-bg/85 p-3 shadow-2xl backdrop-blur-xl';

  return (
    <aside className={asideClass}>
      <div className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-gray-400">Боевой чат</div>
      <div className={`${variant === 'embedded' ? 'h-[420px]' : 'h-[360px]'} space-y-2 overflow-y-auto pr-1`}>
        {rows.map((row) => (
          <div key={row.id} className="rounded-xl border border-white/10 bg-black/20 px-2 py-1.5">
            <div className="mb-0.5 text-[10px] uppercase tracking-wider text-gray-500">
              {row.senderId === user?.id ? 'Вы' : row.senderRole === 'MASTER' ? 'Мастер' : 'Игрок'}
            </div>
            <div className="text-xs text-gray-200">{row.content}</div>
          </div>
        ))}
        {rows.length === 0 && <div className="text-xs text-gray-500">Нет сообщений</div>}
      </div>
      {canSend && (
        <div className="mt-2 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Сообщение в лобби"
            className="flex-1 rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-xs text-white outline-none"
          />
          <button
            onClick={onSend}
            disabled={busy || !text.trim()}
            className="rounded-lg border border-blue-500/30 bg-blue-500/15 px-3 py-1.5 text-xs font-semibold text-blue-200 disabled:opacity-50"
          >
            Отпр.
          </button>
          {canNotify && (
            <button
              onClick={onNotify}
              disabled={busy || !text.trim()}
              className="rounded-lg border border-amber-500/30 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-200 disabled:opacity-50"
              title="Отправить через системные уведомления"
            >
              Увед.
            </button>
          )}
        </div>
      )}
    </aside>
  );
};
