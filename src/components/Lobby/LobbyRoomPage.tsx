import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link2, LogOut, Sword, Users, Wifi, WifiOff } from 'lucide-react';
import { useLobbyStore } from '../../store/useLobbyStore';
import { useCharacterStore } from '../../store/useCharacterStore';
import { CombatInitiativeStrip } from '../Combat/CombatInitiativeStrip';
import { CombatLobbyChat } from '../Combat/CombatLobbyChat';
import { PlayersCombatSidebar } from '../Combat/PlayersCombatSidebar';

const statusLabel: Record<string, string> = {
  ONLINE: 'Онлайн',
  OFFLINE: 'Оффлайн',
  LEFT: 'Вышел'
};

const roleLabel: Record<string, string> = {
  MASTER: 'Мастер',
  PLAYER: 'Игрок'
};

const statusBadgeClass: Record<string, string> = {
  ONLINE: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300',
  OFFLINE: 'border-amber-400/30 bg-amber-500/15 text-amber-300',
  LEFT: 'border-gray-400/20 bg-white/5 text-gray-400'
};

const roleBadgeClass: Record<string, string> = {
  MASTER: 'border-blue-400/30 bg-blue-500/15 text-blue-300',
  PLAYER: 'border-purple-400/30 bg-purple-500/15 text-purple-300'
};

export const LobbyRoomPage: React.FC = () => {
  const { lobby, members, meRole, combatState, connectionStatus, isLobbyPageOpen, closeLobbyPage, leaveLobby, sendCombatEvent } = useLobbyStore();
  const { character } = useCharacterStore();
  const [isCombatWorkspaceOpen, setIsCombatWorkspaceOpen] = useState(false);
  const canRender = isLobbyPageOpen && Boolean(lobby);
  const safeLobby = lobby;

  const onlineMembers = members.filter((member) => member.status === 'ONLINE').length;
  const isCombat = safeLobby?.status === 'IN_COMBAT';
  const isCombatActive = Boolean(combatState?.isInCombat);

  useEffect(() => {
    if (isCombatActive) {
      setIsCombatWorkspaceOpen(true);
      return;
    }
    setIsCombatWorkspaceOpen(false);
  }, [isCombatActive]);

  return (
    <AnimatePresence>
      {canRender && safeLobby && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed inset-0 z-[110] bg-dark-bg p-4 md:p-6"
        >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.985 }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
        className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#111727]/90 to-[#0b0e16]/95 shadow-[0_30px_90px_rgba(0,0,0,0.55)]"
      >
        <div className="border-b border-white/10 p-5 md:p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.25em] text-gray-500">Lobby Room</div>
              <div className="mt-1 flex items-center gap-2 text-xl font-black text-white">
                {isCombat ? <Sword className="h-5 w-5 text-orange-300" /> : <Link2 className="h-5 w-5 text-blue-300" />}
                {isCombat ? 'Бой в лобби' : 'Комната лобби'}
              </div>
              <div className="mt-2 inline-flex items-center gap-2 rounded-xl border border-blue-400/25 bg-blue-500/10 px-3 py-2 text-sm text-blue-200">
                <Link2 className="h-4 w-4" />
                Код: <span className="font-black tracking-wider">{safeLobby.key}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-gray-300">
                {isCombat ? (
                  <span className="inline-flex items-center gap-1 text-orange-300">
                    <Sword className="h-3.5 w-3.5" /> IN COMBAT
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-blue-300">
                    <Users className="h-3.5 w-3.5" /> WAITING
                  </span>
                )}
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-gray-300">
                {connectionStatus === 'connected' ? (
                  <span className="inline-flex items-center gap-1 text-emerald-300">
                    <Wifi className="h-3.5 w-3.5" /> Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-300">
                    <WifiOff className="h-3.5 w-3.5" /> {connectionStatus}
                  </span>
                )}
              </div>
              <button
                onClick={closeLobbyPage}
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-gray-300 hover:text-white"
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
              {meRole === 'MASTER' && (
                <>
                  {!isCombatActive ? (
                    <button
                      onClick={() => sendCombatEvent('combat.start', {})}
                      className="rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-200"
                    >
                      Запустить бой
                    </button>
                  ) : (
                    <button
                      onClick={() => sendCombatEvent('combat.end', {})}
                      className="rounded-xl border border-orange-400/30 bg-orange-500/15 px-3 py-2 text-sm text-orange-200"
                    >
                      Завершить бой
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Участники</div>
              <div className="mt-1 text-lg font-black text-white">{members.length}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">В сети</div>
              <div className="mt-1 text-lg font-black text-emerald-300">{onlineMembers}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Статус комнаты</div>
              {connectionStatus === 'connected' ? (
                <span className={`mt-1 inline-flex items-center rounded-lg border px-2 py-1 text-xs font-black uppercase tracking-wider ${
                  isCombat ? 'border-orange-400/30 bg-orange-500/15 text-orange-300' : 'border-blue-400/30 bg-blue-500/15 text-blue-300'
                }`}>
                  {safeLobby.status}
                </span>
              ) : (
                <span className="mt-1 inline-flex items-center rounded-lg border border-white/10 bg-black/25 px-2 py-1 text-xs font-black uppercase tracking-wider text-gray-300">
                  {safeLobby.status}
                </span>
              )}
            </div>
          </div>
        </div>

        {!character ? (
          <div className="flex flex-1 flex-col gap-4 overflow-auto p-5 md:p-6">
            {isCombatActive && (
              <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                <CombatInitiativeStrip variant="embedded" />
              </div>
            )}
            {isCombatWorkspaceOpen ? (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_1fr]">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                    Участники боя
                  </div>
                  <PlayersCombatSidebar variant="embedded" />
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <CombatLobbyChat variant="embedded" />
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-gray-300">
                Бой завершен. Запустите бой, чтобы открыть инициативу, чат и боевые карточки.
              </div>
            )}
          </div>
        ) : (
          <div className="grid flex-1 grid-cols-1 gap-3 overflow-auto p-5 md:grid-cols-2 md:p-6">
            {members.map((member) => (
              <div key={member.id} className="rounded-2xl border border-white/10 bg-black/30 p-4 shadow-inner shadow-white/[0.03]">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-white/10">
                      {member.avatar ? (
                        <img src={member.avatar} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-sm font-black text-gray-300">{member.userName.slice(0, 1).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold text-white">{member.userName}</div>
                      <div className="truncate text-sm text-gray-400">
                        Персонаж: <span className="font-semibold text-gray-200">{member.characterName ?? 'не выбран'}</span>
                      </div>
                    </div>
                  </div>
                  <div className={`shrink-0 rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-wider ${roleBadgeClass[member.role] ?? 'border-white/15 text-gray-300'}`}>
                    {roleLabel[member.role] ?? member.role}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className={`rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-wider ${statusBadgeClass[member.status] ?? 'border-white/10 text-gray-300'}`}>
                    {statusLabel[member.status] ?? member.status}
                  </span>
                  <span className="text-[11px] text-gray-500">ID: {member.id.slice(-6).toUpperCase()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
        </motion.div>
      )}
      {canRender && safeLobby && !character && meRole === 'MASTER' && isCombatActive && (
        <button
          onClick={() => sendCombatEvent('combat.end', {})}
          className="fixed bottom-6 right-6 z-[140] rounded-full border border-red-500/35 bg-red-500/20 px-5 py-3 text-sm font-semibold text-red-100 shadow-2xl hover:bg-red-500/30"
        >
          Завершить бой
        </button>
      )}
    </AnimatePresence>
  );
};
