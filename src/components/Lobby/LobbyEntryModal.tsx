import React, { useMemo, useState } from 'react';
import { X, Users, DoorOpen, LogOut } from 'lucide-react';
import { useLobbyStore } from '../../store/useLobbyStore';
import { useCharacterStore } from '../../store/useCharacterStore';
import { User } from 'lucide-react';

type LobbyEntryModalProps = {
  variant?: 'dock' | 'floating';
};

export const LobbyEntryModal: React.FC<LobbyEntryModalProps> = ({ variant = 'floating' }) => {
  const {
    isLobbyModalOpen,
    closeLobbyModal,
    createLobby,
    joinLobbyByKey,
    changeLobbyCharacter,
    openLobbyPage,
    leaveLobby,
    lobby,
    lobbyKeyInput,
    setLobbyKeyInput,
    selectedCharacterId,
    setSelectedCharacterId
  } = useLobbyStore();
  const { charactersList, character } = useCharacterStore();
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'join' | 'create'>('join');

  const allCharacters = useMemo(() => {
    const current = character?.id
      ? [
          {
            id: character.id,
            name: character.name,
            class: character.class,
            level: character.level,
            avatar: character.avatar
          }
        ]
      : [];
    const merged = new Map<string, { id: string; name: string; class: string; level: number; avatar?: string }>();
    [...current, ...charactersList].forEach((item) => {
      if (!item.id) {
        return;
      }
      const existing = merged.get(item.id);
      if (!existing) {
        merged.set(item.id, {
          id: item.id,
          name: item.name,
          class: item.class,
          level: item.level,
          avatar: item.avatar
        });
        return;
      }
      if (!existing.avatar && item.avatar) {
        merged.set(item.id, {
          ...existing,
          avatar: item.avatar
        });
      }
    });
    return Array.from(merged.values());
  }, [character, charactersList]);

  const onCreate = async () => {
    setBusy(true);
    try {
      await createLobby();
    } finally {
      setBusy(false);
    }
  };

  const onJoin = async () => {
    if (!lobbyKeyInput.trim()) return;
    setBusy(true);
    try {
      await joinLobbyByKey(lobbyKeyInput, selectedCharacterId || undefined);
    } finally {
      setBusy(false);
    }
  };

  const onChangeCharacter = async () => {
    if (!selectedCharacterId) return;
    setBusy(true);
    try {
      await changeLobbyCharacter(selectedCharacterId);
      closeLobbyModal();
    } finally {
      setBusy(false);
    }
  };

  const onLeave = async () => {
    setBusy(true);
    try {
      await leaveLobby();
      closeLobbyModal();
    } finally {
      setBusy(false);
    }
  };

  if (variant === 'floating' && !isLobbyModalOpen) {
    return null;
  }

  const containerClass =
    variant === 'dock'
      ? 'w-full max-h-[70vh] overflow-hidden rounded-3xl border border-white/10 bg-black/40 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl'
      : 'fixed bottom-24 left-1/2 z-[120] w-[min(740px,calc(100vw-32px))] max-h-[72vh] -translate-x-1/2 overflow-y-auto rounded-3xl border border-white/10 bg-black/40 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl';

  return (
    <div className={`${containerClass} flex min-h-[520px] flex-col`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-400" />
          <h3 className="text-lg font-bold text-white">Лобби</h3>
        </div>
        <button onClick={closeLobbyModal} className="rounded-lg border border-white/10 p-2 text-gray-400 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {!lobby && (
          <div className="mb-5 grid grid-cols-2 gap-2">
            <button
              onClick={() => setMode('join')}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                mode === 'join' ? 'bg-blue-500/20 text-blue-300 border border-blue-400/40' : 'bg-black/30 border border-white/10 text-gray-300'
              }`}
            >
              Войти по ключу
            </button>
            <button
              onClick={() => setMode('create')}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                mode === 'create' ? 'bg-blue-500/20 text-blue-300 border border-blue-400/40' : 'bg-black/30 border border-white/10 text-gray-300'
              }`}
            >
              Создать лобби
            </button>
          </div>
        )}

        {mode === 'join' && !lobby && (
          <div className="mb-5">
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-gray-400">Ключ лобби</label>
            <input
              value={lobbyKeyInput}
              onChange={(e) => setLobbyKeyInput(e.target.value.toUpperCase())}
              placeholder="Например: A8C3KQ"
              className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm uppercase text-white outline-none focus:border-blue-400/60"
            />
          </div>
        )}

        <div className="mb-4">
          <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-gray-400">
            {lobby ? 'Смена персонажа' : mode === 'join' ? 'Выбор персонажа (обязательно)' : 'Персонаж (необязательно для мастера)'}
          </label>
          <div className="grid max-h-[260px] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {allCharacters.map((item) => {
              const selected = selectedCharacterId === item.id;
              return (
              <button
                  key={item.id}
                  onClick={() => setSelectedCharacterId(item.id)}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    selected
                      ? 'border-blue-400/60 bg-blue-500/20'
                      : 'border-white/10 bg-black/20 hover:border-white/20'
                  }`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    {item.avatar ? (
                      <img src={item.avatar} className="h-9 w-9 rounded-lg border border-white/20 object-cover" />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                        <User className="h-4 w-4 text-blue-300" />
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-semibold text-white">{item.name}</div>
                      <div className="text-[11px] text-gray-400">
                        {item.class} • {item.level}
                      </div>
                    </div>
                  </div>
                  {selected && (
                    <div className="text-[10px] font-black uppercase tracking-wider text-blue-200">Выбран</div>
                  )}
                </button>
              );
            })}
          </div>
          {mode === 'create' && !lobby && (
            <button
              onClick={() => setSelectedCharacterId('')}
              className="mt-2 text-xs text-gray-400 underline underline-offset-2 hover:text-white"
            >
              Создать лобби без персонажа
            </button>
          )}
        </div>
      </div>

      <div className="-mx-5 mt-6 border-t border-white/10 bg-black/40 px-5 pb-1 pt-4 backdrop-blur-2xl">
        <div className="flex flex-wrap justify-end gap-2">
          {lobby && (
            <button
              onClick={openLobbyPage}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-gray-200 hover:bg-white/5"
            >
              <span className="inline-flex items-center gap-1">
                <DoorOpen className="h-4 w-4" /> Страница лобби
              </span>
            </button>
          )}
          <button
            onClick={closeLobbyModal}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-gray-300 hover:text-white"
          >
            Свернуть
          </button>
          {lobby ? (
            <>
              <button
                disabled={busy || !selectedCharacterId}
                onClick={onChangeCharacter}
                className="rounded-xl border border-blue-400/40 bg-blue-500/20 px-4 py-2 text-sm font-semibold text-blue-200 disabled:opacity-50"
              >
                Сменить персонажа
              </button>
              <button
                disabled={busy}
                onClick={() => void onLeave()}
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200 disabled:opacity-50"
              >
                <span className="inline-flex items-center gap-1">
                  <LogOut className="h-4 w-4" /> Выйти
                </span>
              </button>
            </>
          ) : mode === 'create' ? (
            <button
              disabled={busy}
              onClick={onCreate}
              className="rounded-xl border border-blue-400/40 bg-blue-500/20 px-4 py-2 text-sm font-semibold text-blue-200 disabled:opacity-50"
            >
              Создать
            </button>
          ) : (
            <button
              disabled={busy || !lobbyKeyInput.trim() || !selectedCharacterId}
              onClick={onJoin}
              className="rounded-xl border border-blue-400/40 bg-blue-500/20 px-4 py-2 text-sm font-semibold text-blue-200 disabled:opacity-50"
            >
              Войти
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
