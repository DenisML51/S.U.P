import React, { useMemo, useState } from 'react';
import { X, Users } from 'lucide-react';
import { useLobbyStore } from '../../store/useLobbyStore';
import { useCharacterStore } from '../../store/useCharacterStore';
import { User } from 'lucide-react';

export const LobbyEntryModal: React.FC = () => {
  const {
    isLobbyModalOpen,
    closeLobbyModal,
    createLobby,
    joinLobbyByKey,
    changeLobbyCharacter,
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
    const current = character
      ? [
          {
            id: character.id ?? '',
            name: character.name,
            class: character.class,
            level: character.level
          }
        ]
      : [];
    const merged = [...current, ...charactersList].filter((item, idx, arr) => item.id && arr.findIndex((it) => it.id === item.id) === idx);
    return merged;
  }, [character, charactersList]);

  if (!isLobbyModalOpen) {
    return null;
  }

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

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={closeLobbyModal} />
      <div className="relative w-full max-w-xl rounded-3xl border border-white/15 bg-[#111319] p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-400" />
            <h3 className="text-lg font-bold text-white">Лобби</h3>
          </div>
          <button onClick={closeLobbyModal} className="rounded-lg border border-white/10 p-2 text-gray-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!lobby && (
          <div className="mb-4 grid grid-cols-2 gap-2">
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
          <div className="mb-3">
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-gray-400">Ключ лобби</label>
            <input
              value={lobbyKeyInput}
              onChange={(e) => setLobbyKeyInput(e.target.value.toUpperCase())}
              placeholder="Например: A8C3KQ"
              className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm uppercase text-white outline-none focus:border-blue-400/60"
            />
          </div>
        )}

        <div className="mb-5">
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
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                      <User className="h-4 w-4 text-blue-300" />
                    </div>
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

        <div className="flex justify-end gap-2">
          <button
            onClick={closeLobbyModal}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-gray-300 hover:text-white"
          >
            Отмена
          </button>
          {lobby ? (
            <button
              disabled={busy || !selectedCharacterId}
              onClick={onChangeCharacter}
              className="rounded-xl border border-blue-400/40 bg-blue-500/20 px-4 py-2 text-sm font-semibold text-blue-200 disabled:opacity-50"
            >
              Сменить персонажа
            </button>
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
