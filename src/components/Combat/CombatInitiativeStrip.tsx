import React from 'react';
import { motion } from 'framer-motion';
import { useLobbyStore } from '../../store/useLobbyStore';
import { useCharacterStore } from '../../store/useCharacterStore';

const avatarFallback = (name: string) =>
  (name || '?')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export const CombatInitiativeStrip: React.FC = () => {
  const { lobby, combatState, members, meRole } = useLobbyStore();
  const { charactersList } = useCharacterStore();
  if (!lobby || !combatState?.isInCombat) return null;

  const ordered = (combatState.turnOrder || []).map((id) => {
    const stateMember = combatState.membersCombat.find((member) => member.memberId === id);
    const lobbyMember = members.find((member) => member.id === id);
    return {
      id,
      name: stateMember?.name ?? lobbyMember?.userName ?? 'Игрок',
      avatar: stateMember?.avatar ?? lobbyMember?.avatar ?? null,
      characterId: stateMember?.characterId ?? lobbyMember?.characterId ?? null,
      initiative: stateMember?.initiative ?? null,
      kind: stateMember?.kind ?? 'lobby_member'
    };
  });
  const currentId = combatState.activeMemberId ?? ordered[0]?.id ?? null;
  const centeredOrder = (() => {
    if (!ordered.length || !currentId) {
      return ordered;
    }
    const currentIdx = ordered.findIndex((member) => member.id === currentId);
    if (currentIdx < 0) {
      return ordered;
    }
    const targetCenterIdx = Math.floor(ordered.length / 2);
    const shift = targetCenterIdx - currentIdx;
    return ordered.map((_, idx) => {
      const sourceIdx = ((idx - shift) % ordered.length + ordered.length) % ordered.length;
      return ordered[sourceIdx];
    });
  })();

  const getAvatar = (memberId: string, characterId: string | null) => {
    const fromOrder = ordered.find((member) => member.id === memberId)?.avatar;
    if (fromOrder) return fromOrder;
    if (!characterId) return null;
    const char = charactersList.find((item) => item.id === characterId);
    return char?.avatar ?? null;
  };

  return (
    <div className="fixed top-3 left-1/2 z-[47] -translate-x-1/2">
      <div className="flex items-end gap-3.5">
        {centeredOrder.map((member, index) => {
          const isActive = member.id === currentId;
          const avatar = getAvatar(member.id, member.characterId);
          const isHiddenNpcInitiative = member.kind === 'master_custom' && meRole !== 'MASTER';
          const initiativeLabel = isHiddenNpcInitiative
            ? 'Иниц. ?'
            : typeof member.initiative === 'number'
              ? `Иниц. ${member.initiative}`
              : `Иниц. #${index + 1}`;
          return (
            <motion.div
              key={member.id}
              layout
              transition={{ type: 'spring', stiffness: 360, damping: 30, mass: 0.7 }}
              className="flex flex-col items-center gap-1.5"
            >
              {avatar ? (
                <img
                  src={avatar}
                  title={member.name}
                  className={`object-cover transition-all ${
                    isActive ? 'h-20 w-20 rounded-lg opacity-100' : 'h-16 w-16 rounded-lg opacity-80'
                  }`}
                />
              ) : (
                <div
                  title={member.name}
                  className={`flex items-center justify-center bg-white/10 font-black text-white transition-all ${
                    isActive ? 'h-20 w-20 rounded-lg text-[14px] opacity-100' : 'h-16 w-16 rounded-lg text-[12px] opacity-80'
                  }`}
                >
                  {avatarFallback(member.name)}
                </div>
              )}
              <div className={`text-[10px] ${isActive ? 'text-white' : 'text-gray-400'}`}>{initiativeLabel}</div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
