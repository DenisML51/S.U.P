import React, { useMemo, useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useLobbyStore } from '../../store/useLobbyStore';

export const MasterMessagePanel: React.FC = () => {
  const { user } = useAuthStore();
  const { meRole, messages, sendMasterMessage, lobby } = useLobbyStore();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const visibleMessages = useMemo(
    () => messages.slice(-20),
    [messages]
  );

  if (!lobby) {
    return null;
  }

  const canSend = meRole === 'MASTER';

  const handleSend = async () => {
    if (!text.trim() || !canSend) {
      return;
    }
    setBusy(true);
    try {
      await sendMasterMessage(text.trim());
      setText('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">Сообщения мастера</div>
      <div className="max-h-36 space-y-2 overflow-auto pr-1">
        {visibleMessages.length ? (
          visibleMessages.map((message) => (
            <div key={message.id} className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-gray-200">
              <div className="mb-1 text-[10px] uppercase tracking-wider text-gray-500">
                {message.senderId === user?.id ? 'Вы' : 'Мастер'}
              </div>
              <div>{message.content}</div>
            </div>
          ))
        ) : (
          <div className="text-xs text-gray-500">Пока нет сообщений.</div>
        )}
      </div>

      {canSend && (
        <div className="mt-3 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Сообщение игрокам"
            className="flex-1 rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-xs text-white outline-none focus:border-blue-400/60"
          />
          <button
            onClick={handleSend}
            disabled={busy || !text.trim()}
            className="rounded-lg border border-blue-500/30 bg-blue-500/15 px-3 py-1.5 text-xs font-semibold text-blue-200 hover:bg-blue-500/25 disabled:opacity-50"
          >
            Отправить
          </button>
        </div>
      )}
    </div>
  );
};
