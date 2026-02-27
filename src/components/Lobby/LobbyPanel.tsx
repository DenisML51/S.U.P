import React, { useState } from 'react';
import { useLobbyStore } from '../../store/useLobbyStore';

export const LobbyPanel: React.FC = () => {
  const {
    lobby,
    connectionStatus,
    lobbyKeyInput,
    setLobbyKeyInput,
    createLobby,
    joinLobbyByKey,
    leaveLobby,
    members
  } = useLobbyStore();
  const [busy, setBusy] = useState(false);

  const handleCreate = async () => {
    setBusy(true);
    try {
      await createLobby();
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async () => {
    if (!lobbyKeyInput.trim()) return;
    setBusy(true);
    try {
      await joinLobbyByKey(lobbyKeyInput);
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async () => {
    setBusy(true);
    try {
      await leaveLobby();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-4 rounded-2xl border border-white/10 bg-black/20 p-3 backdrop-blur-xl">
      {!lobby ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCreate}
            disabled={busy}
            className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-300 hover:bg-blue-500/20 disabled:opacity-50"
          >
            Создать лобби
          </button>
          <input
            value={lobbyKeyInput}
            onChange={(e) => setLobbyKeyInput(e.target.value)}
            placeholder="Ключ лобби"
            className="w-36 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-xs uppercase text-white outline-none focus:border-blue-400/60"
          />
          <button
            onClick={handleJoin}
            disabled={busy || !lobbyKeyInput.trim()}
            className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs font-semibold text-green-300 hover:bg-green-500/20 disabled:opacity-50"
          >
            Войти
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300">
          <span className="rounded-md border border-white/15 px-2 py-1">
            Лобби: <span className="font-bold text-white">{lobby.key}</span>
          </span>
          <span className="rounded-md border border-white/15 px-2 py-1">
            Участников: <span className="font-bold text-white">{members.length}</span>
          </span>
          <span className="rounded-md border border-white/15 px-2 py-1">
            Сокет: <span className="font-bold text-white">{connectionStatus}</span>
          </span>
          <button
            onClick={handleLeave}
            disabled={busy}
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-50"
          >
            Покинуть
          </button>
        </div>
      )}
    </div>
  );
};
