import React from 'react';
import { Link2, LogOut, Wifi, WifiOff } from 'lucide-react';
import { useLobbyStore } from '../../store/useLobbyStore';

const statusLabel: Record<string, string> = {
  ONLINE: 'Онлайн',
  OFFLINE: 'Оффлайн',
  LEFT: 'Вышел'
};

export const LobbyRoomPage: React.FC = () => {
  const { lobby, members, connectionStatus, isLobbyPageOpen, closeLobbyPage, leaveLobby } = useLobbyStore();

  if (!isLobbyPageOpen || !lobby) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[110] bg-dark-bg p-6">
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col rounded-3xl border border-white/10 bg-black/20 p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.25em] text-gray-400">Lobby Room</div>
            <div className="mt-1 flex items-center gap-2 text-lg font-bold text-white">
              <Link2 className="h-4 w-4 text-blue-400" />
              Код: {lobby.key}
            </div>
            <div className="mt-1 text-sm text-gray-400">Участников: {members.length}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-xl border border-white/10 px-3 py-2 text-xs text-gray-300">
              {connectionStatus === 'connected' ? (
                <span className="inline-flex items-center gap-1 text-green-400">
                  <Wifi className="h-3.5 w-3.5" /> Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-400">
                  <WifiOff className="h-3.5 w-3.5" /> {connectionStatus}
                </span>
              )}
            </div>
            <button
              onClick={closeLobbyPage}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-gray-300 hover:text-white"
            >
              Свернуть
            </button>
            <button
              onClick={() => void leaveLobby()}
              className="rounded-xl border border-red-400/30 bg-red-500/15 px-3 py-2 text-sm text-red-200"
            >
              <span className="inline-flex items-center gap-1">
                <LogOut className="h-4 w-4" /> Выйти
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 overflow-auto md:grid-cols-2">
          {members.map((member) => (
            <div key={member.id} className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="mb-1 flex items-center justify-between">
                <div className="text-base font-semibold text-white">{member.userName}</div>
                <div className="text-[10px] font-black uppercase tracking-wider text-gray-400">{member.role}</div>
              </div>
              <div className="text-sm text-gray-300">
                Персонаж: <span className="font-semibold text-white">{member.characterName ?? 'не выбран'}</span>
              </div>
              <div className="mt-1 text-sm text-gray-400">Статус: {statusLabel[member.status] ?? member.status}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
