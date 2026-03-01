import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  Copy,
  Link2,
  LogOut,
  Sword,
  Users,
  Wifi,
  WifiOff
} from 'lucide-react';
import { toast } from 'react-hot-toast';
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
  const {
    lobby,
    members,
    meRole,
    combatState,
    connectionStatus,
    isLobbyPageOpen,
    closeLobbyPage,
    leaveLobby,
    sendCombatEvent
  } = useLobbyStore();
  const { character } = useCharacterStore();
  const [isCombatWorkspaceOpen, setIsCombatWorkspaceOpen] = useState(false);
  const [isCodeCopied, setIsCodeCopied] = useState(false);
  const canRender = isLobbyPageOpen && Boolean(lobby);
  const safeLobby = lobby;

  const onlineMembers = members.filter((member) => member.status === 'ONLINE').length;
  const isCombat = safeLobby?.status === 'IN_COMBAT';
  const isCombatActive = Boolean(combatState?.isInCombat);
  const sortedMembers = useMemo(
    () =>
      [...members].sort((a, b) => {
        const roleWeight = a.role === 'MASTER' ? -1 : 1;
        const roleWeightB = b.role === 'MASTER' ? -1 : 1;
        if (roleWeight !== roleWeightB) return roleWeight - roleWeightB;
        const statusWeight =
          a.status === 'ONLINE' ? 0 : a.status === 'OFFLINE' ? 1 : 2;
        const statusWeightB =
          b.status === 'ONLINE' ? 0 : b.status === 'OFFLINE' ? 1 : 2;
        if (statusWeight !== statusWeightB) return statusWeight - statusWeightB;
        return a.userName.localeCompare(b.userName);
      }),
    [members]
  );

  useEffect(() => {
    if (isCombatActive) {
      setIsCombatWorkspaceOpen(true);
      return;
    }
    setIsCombatWorkspaceOpen(false);
  }, [isCombatActive]);

  const copyLobbyCode = async () => {
    if (!safeLobby?.key) return;
    try {
      await navigator.clipboard.writeText(safeLobby.key);
      setIsCodeCopied(true);
      toast.success('Код лобби скопирован');
      window.setTimeout(() => setIsCodeCopied(false), 1200);
    } catch {
      toast.error('Не удалось скопировать код');
    }
  };

  return (
    <AnimatePresence>
      {canRender && safeLobby && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed inset-0 z-[110] bg-dark-bg/95 p-3 md:p-5"
        >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.985 }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
        className="mx-auto flex h-full w-full max-w-[1420px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#111727]/95 via-[#0f1524]/95 to-[#0a0d17]/95 shadow-[0_30px_90px_rgba(0,0,0,0.6)]"
      >
        <div className="border-b border-white/10 p-4 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Lobby Room</div>
              <div className="flex items-center gap-2 text-xl font-black text-white">
                {isCombat ? (
                  <Sword className="h-5 w-5 text-orange-300" />
                ) : (
                  <Link2 className="h-5 w-5 text-blue-300" />
                )}
                {isCombat ? 'Бой в лобби' : 'Комната лобби'}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={copyLobbyCode}
                className="inline-flex items-center gap-1 rounded-xl border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-sm font-semibold text-blue-200 hover:bg-blue-500/20"
              >
                {isCodeCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {safeLobby.key}
              </button>
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
        </div>

        <div className="grid flex-1 min-h-0 grid-cols-1 gap-4 overflow-hidden p-4 md:grid-cols-[320px_minmax(0,1fr)] md:p-5">
          <motion.aside
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            className="flex min-h-0 flex-col gap-3"
          >
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-500">Участники</div>
                <div className="mt-1 text-xl font-black text-white">{members.length}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-500">Онлайн</div>
                <div className="mt-1 text-xl font-black text-emerald-300">{onlineMembers}</div>
              </div>
            </div>
            <button
              onClick={copyLobbyCode}
              className="rounded-2xl border border-blue-400/25 bg-blue-500/10 px-3 py-2 text-left hover:bg-blue-500/15"
            >
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-200/70">Код комнаты</div>
              <div className="mt-1 inline-flex items-center gap-2 text-lg font-black tracking-[0.08em] text-blue-100">
                {safeLobby.key}
                {isCodeCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </div>
            </button>
            <div className="min-h-0 rounded-2xl border border-white/10 bg-black/20 p-3">
              <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Участники лобби</div>
              <div className="max-h-full space-y-2 overflow-y-auto pr-1">
                {sortedMembers.map((member) => (
                  <div key={member.id} className="rounded-xl border border-white/10 bg-black/30 p-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 overflow-hidden rounded-lg border border-white/20 bg-white/10">
                        {member.avatar ? (
                          <img src={member.avatar} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs font-black text-gray-300">
                            {member.userName.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-white">{member.userName}</div>
                        <div className="truncate text-[11px] text-gray-400">
                          {member.characterName ?? 'Без персонажа'}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-1">
                      <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${roleBadgeClass[member.role] ?? 'border-white/15 text-gray-300'}`}>
                        {roleLabel[member.role] ?? member.role}
                      </span>
                      <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${statusBadgeClass[member.status] ?? 'border-white/10 text-gray-300'}`}>
                        {statusLabel[member.status] ?? member.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.aside>

          <motion.section
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.24, ease: 'easeOut', delay: 0.04 }}
            className="flex min-h-0 flex-col gap-3 overflow-hidden"
          >
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Статус комнаты</div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center rounded-lg border px-2 py-1 text-xs font-black uppercase tracking-wider ${
                  isCombat ? 'border-orange-400/30 bg-orange-500/15 text-orange-300' : 'border-blue-400/30 bg-blue-500/15 text-blue-300'
                }`}>
                  {safeLobby.status}
                </span>
                <span className="text-xs text-gray-400">
                  {isCombatActive ? `Раунд: ${combatState?.round ?? 1}` : 'Ожидание старта боя'}
                </span>
              </div>
            </div>

            {isCombatActive && (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <CombatInitiativeStrip variant="embedded" />
              </div>
            )}

            {isCombatWorkspaceOpen ? (
              <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[300px_minmax(0,1fr)]">
                <div className="min-h-0 rounded-2xl border border-white/10 bg-black/20 p-3">
                  <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Участники боя</div>
                  <PlayersCombatSidebar variant="embedded" />
                </div>
                <div className="min-h-0 rounded-2xl border border-white/10 bg-black/20 p-3">
                  <CombatLobbyChat variant="embedded" />
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-gray-300">
                Бой завершен. Запустите бой, чтобы открыть инициативу, чат и боевые карточки.
              </div>
            )}
          </motion.section>
        </div>
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
