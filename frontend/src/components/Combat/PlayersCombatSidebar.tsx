import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLobbyStore } from '../../store/useLobbyStore';
import { useCharacterStore } from '../../store/useCharacterStore';
import { useAuthStore } from '../../store/useAuthStore';
import { listCharactersApi } from '../../api/characters';
import type { CombatMemberState } from '../../types/lobby';

type MasterCharacterOption = {
  id: string;
  name: string;
  currentHP: number;
  maxHP: number;
  avatar?: string;
};

type PlayersCombatSidebarProps = {
  variant?: 'overlay' | 'embedded';
};

export const PlayersCombatSidebar: React.FC<PlayersCombatSidebarProps> = ({ variant = 'overlay' }) => {
  const { lobby, combatState, members, meRole, sendCombatEvent } = useLobbyStore();
  const { charactersList } = useCharacterStore();
  const authUser = useAuthStore((state) => state.user);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<'manual' | 'character'>('manual');
  const [masterCharacters, setMasterCharacters] = useState<MasterCharacterOption[]>([]);
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState('');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [currentHP, setCurrentHP] = useState('10');
  const [maxHP, setMaxHP] = useState('10');
  const [initiative, setInitiative] = useState('');
  const [selectedCombatantId, setSelectedCombatantId] = useState<string | null>(null);
  const [hpDelta, setHpDelta] = useState('1');
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);
  if (!lobby) {
    return null;
  }

  const combatMembers = combatState?.membersCombat ?? [];
  const sourceMembers = useMemo(() => {
    if (combatMembers.length) {
      return combatMembers.filter((member) => member.kind === 'master_custom' || member.userId !== authUser?.id);
    }
    return members
      .filter((member) => member.userId !== authUser?.id)
      .map((member) => ({
        memberId: member.id,
        userId: member.userId,
        name: member.characterName ?? member.userName ?? 'Персонаж не выбран',
        role: member.role,
        kind: 'lobby_member' as const,
        controlledByUserId: null,
        avatar: member.avatar,
        characterId: member.characterId,
        initiative: null,
        currentHP: member.currentHP ?? 0,
        maxHP: member.maxHP ?? 0,
        currentAction: member.currentAction,
        actionLimits: { action: 1, bonus: 1, reaction: 1 },
        spentActions: { action: 0, bonus: 0, reaction: 0 }
      }));
  }, [authUser?.id, combatMembers, members]);
  useEffect(() => {
    if (!isAddOpen || meRole !== 'MASTER') {
      return;
    }
    setIsLoadingCharacters(true);
    void listCharactersApi()
      .then((response) => {
        setMasterCharacters(response.characters);
      })
      .finally(() => {
        setIsLoadingCharacters(false);
      });
  }, [isAddOpen, meRole]);
  const handleAddCombatant = () => {
    if (meRole !== 'MASTER') {
      return;
    }
    if (addMode === 'character') {
      const selected = masterCharacters.find((item) => item.id === selectedCharacterId);
      if (!selected) {
        return;
      }
      const parsedInitiative = Number(initiative);
      sendCombatEvent('combat.addCustomMember', {
        name: selected.name,
        avatar: selected.avatar ?? '',
        currentHP: selected.currentHP,
        maxHP: selected.maxHP,
        initiative: Number.isFinite(parsedInitiative) ? parsedInitiative : undefined,
        characterId: selected.id
      });
      return;
    }
    const safeName = name.trim();
    if (!safeName) {
      return;
    }
    const hp = Math.max(1, Math.floor(Number(currentHP) || 1));
    const max = Math.max(hp, Math.floor(Number(maxHP) || hp));
    const parsedInitiative = Number(initiative);
    sendCombatEvent('combat.addCustomMember', {
      name: safeName,
      avatar: avatar.trim(),
      currentHP: hp,
      maxHP: max,
      initiative: Number.isFinite(parsedInitiative) ? parsedInitiative : undefined
    });
  };
  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (result) {
        setAvatar(result);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };
  const handleCardHpEdit = (member: CombatMemberState) => {
    if (meRole !== 'MASTER') {
      return;
    }
    if (selectedCombatantId === member.memberId) {
      setSelectedCombatantId(null);
      return;
    }
    setSelectedCombatantId(member.memberId);
  };
  const applyHpDelta = (member: CombatMemberState, mode: 'damage' | 'heal') => {
    const amount = Math.max(1, Math.floor(Number(hpDelta) || 1));
    if (!Number.isFinite(amount)) {
      return;
    }
    const current = Math.max(0, Math.floor(member.currentHP ?? 0));
    const max = Math.max(1, Math.floor(member.maxHP ?? 1));
    const nextCurrent = mode === 'damage'
      ? Math.max(0, current - amount)
      : Math.min(max, current + amount);
    sendCombatEvent('combat.hpChanged', {
      memberId: member.memberId,
      currentHP: nextCurrent,
      maxHP: max
    });
  };

  const isEmbedded = variant === 'embedded';
  const asideClass =
    variant === 'embedded'
      ? 'w-full pointer-events-auto'
      : 'fixed left-3 top-[130px] z-[130] w-[270px] pointer-events-auto';

  return (
    <aside className={asideClass}>
      <div className="space-y-2">
        {meRole === 'MASTER' && (
          <div className="rounded-xl border border-white/10 bg-black/40 p-2">
            <button
              onClick={() => setIsAddOpen((prev) => !prev)}
              className="w-full rounded-lg border border-blue-500/25 bg-blue-500/10 px-2 py-1.5 text-xs font-semibold text-blue-200 hover:bg-blue-500/20"
            >
              {isAddOpen ? 'Скрыть добавление' : 'Добавить бойца'}
            </button>
            {isAddOpen && (
              <div className="mt-2 space-y-2">
                <div className="grid grid-cols-2 gap-1">
                  <button
                    onClick={() => setAddMode('manual')}
                    className={`rounded-md border px-2 py-1 text-[10px] font-semibold ${
                      addMode === 'manual'
                        ? 'border-blue-400/40 bg-blue-500/20 text-blue-100'
                        : 'border-white/15 text-gray-300'
                    }`}
                  >
                    Вручную
                  </button>
                  <button
                    onClick={() => setAddMode('character')}
                    className={`rounded-md border px-2 py-1 text-[10px] font-semibold ${
                      addMode === 'character'
                        ? 'border-blue-400/40 bg-blue-500/20 text-blue-100'
                        : 'border-white/15 text-gray-300'
                    }`}
                  >
                    Из персонажа
                  </button>
                </div>
                {addMode === 'character' ? (
                  <>
                    <select
                      value={selectedCharacterId}
                      onChange={(e) => setSelectedCharacterId(e.target.value)}
                      className="w-full rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-xs text-white outline-none"
                    >
                      <option value="">{isLoadingCharacters ? 'Загрузка...' : 'Выберите персонажа'}</option>
                      {masterCharacters.map((character) => (
                        <option key={character.id} value={character.id}>
                          {character.name} ({character.currentHP}/{character.maxHP})
                        </option>
                      ))}
                    </select>
                    <input
                      value={initiative}
                      onChange={(e) => setInitiative(e.target.value)}
                      type="number"
                      placeholder="Инициатива (опц.)"
                      className="w-full rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-xs text-white outline-none"
                    />
                  </>
                ) : (
                  <>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Имя бойца"
                      className="w-full rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-xs text-white outline-none"
                    />
                    <input
                      value={avatar}
                      onChange={(e) => setAvatar(e.target.value)}
                      placeholder="URL аватара (опц.)"
                      className="w-full rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-xs text-white outline-none"
                    />
                    <input
                      ref={avatarFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarFileChange}
                    />
                    <button
                      onClick={() => avatarFileInputRef.current?.click()}
                      className="w-full rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-xs text-gray-200 hover:bg-white/10"
                    >
                      Загрузить аватар файлом
                    </button>
                    <div className="grid grid-cols-2 gap-1">
                      <input
                        value={currentHP}
                        onChange={(e) => setCurrentHP(e.target.value)}
                        type="number"
                        placeholder="Текущее HP"
                        className="w-full rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-xs text-white outline-none"
                      />
                      <input
                        value={maxHP}
                        onChange={(e) => setMaxHP(e.target.value)}
                        type="number"
                        placeholder="Макс HP"
                        className="w-full rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-xs text-white outline-none"
                      />
                    </div>
                    <input
                      value={initiative}
                      onChange={(e) => setInitiative(e.target.value)}
                      type="number"
                      placeholder="Инициатива (опц.)"
                      className="w-full rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-xs text-white outline-none"
                    />
                  </>
                )}
                <button
                  onClick={handleAddCombatant}
                  className="w-full rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/20"
                >
                  Добавить в бой
                </button>
              </div>
            )}
          </div>
        )}
        {!sourceMembers.length && (
          <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-gray-400">
            Другие участники пока не подключены
          </div>
        )}
        {sourceMembers.map((member: CombatMemberState) => {
          const isActive = combatState?.activeMemberId === member.memberId;
          const lobbyMember = member.kind === 'lobby_member'
            ? members.find((item) => item.id === member.memberId)
            : null;
          const displayName =
            member.kind === 'lobby_member'
              ? lobbyMember?.characterName ?? member.name ?? 'Персонаж не выбран'
              : member.name ?? 'Персонаж не выбран';
          const hp = member.currentHP ?? 0;
          const maxHp = member.maxHP ?? 0;
          const avatar =
            member.avatar ??
            ('characterId' in member && member.characterId
              ? charactersList.find((item) => item.id === member.characterId)?.avatar
              : null);
          const hpPct = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;
          return (
            <div
              key={member.memberId}
              onClick={() => handleCardHpEdit(member)}
              className={`relative rounded-xl border px-2.5 py-2 text-[11px] shadow-lg backdrop-blur-xl ${
                isActive ? 'border-blue-400/55 bg-[#112239]/88' : 'border-white/10 bg-black/55'
              } ${meRole === 'MASTER' ? 'cursor-pointer hover:border-blue-300/40' : ''}`}
            >
              <div className="flex items-center gap-2">
                {avatar ? (
                  <img src={avatar} className="h-8 w-8 rounded-lg object-cover border border-white/20" />
                ) : (
                  <div className="h-8 w-8 rounded-lg bg-white/10 border border-white/20" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-white">{displayName}</div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/45 border border-white/10">
                    <div
                      className={`h-full ${hpPct <= 25 ? 'bg-red-500' : hpPct <= 55 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                      style={{ width: `${hpPct}%` }}
                    />
                  </div>
                </div>
                {meRole === 'MASTER' && member.kind === 'master_custom' && (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      sendCombatEvent('combat.removeCustomMember', { memberId: member.memberId });
                    }}
                    className="rounded-md border border-red-500/25 bg-red-500/10 px-2 py-1 text-[10px] font-semibold text-red-200 hover:bg-red-500/20"
                  >
                    Удалить
                  </button>
                )}
              </div>
              <AnimatePresence>
                {meRole === 'MASTER' && selectedCombatantId === member.memberId && (
                  <motion.div
                    onClick={(event) => event.stopPropagation()}
                    initial={isEmbedded ? { opacity: 0, y: -6, scale: 0.98 } : { opacity: 0, x: -8, y: '-50%', scale: 0.96 }}
                    animate={isEmbedded ? { opacity: 1, y: 0, scale: 1 } : { opacity: 1, x: 0, y: '-50%', scale: 1 }}
                    exit={isEmbedded ? { opacity: 0, y: -6, scale: 0.98 } : { opacity: 0, x: -8, y: '-50%', scale: 0.96 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className={
                      isEmbedded
                        ? 'mt-2 rounded-xl border border-white/15 bg-[#0f1422]/95 p-2 shadow-xl'
                        : 'absolute left-[calc(100%+8px)] top-1/2 z-[60] w-44 rounded-xl border border-white/15 bg-[#0f1422]/95 p-2 shadow-2xl'
                    }
                  >
                    <div className="mb-1 text-[10px] font-black uppercase tracking-wider text-gray-400">
                      HP управление
                    </div>
                    <input
                      value={hpDelta}
                      onChange={(event) => setHpDelta(event.target.value)}
                      type="number"
                      min={1}
                      className="mb-2 w-full rounded-md border border-white/15 bg-black/30 px-2 py-1 text-xs text-white outline-none"
                      placeholder="Значение"
                    />
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        onClick={() => applyHpDelta(member, 'damage')}
                        className="rounded-md border border-red-500/30 bg-red-500/15 px-2 py-1 text-xs font-semibold text-red-200 hover:bg-red-500/25"
                      >
                        Урон
                      </button>
                      <button
                        onClick={() => applyHpDelta(member, 'heal')}
                        className="rounded-md border border-emerald-500/30 bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25"
                      >
                        Лечение
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
