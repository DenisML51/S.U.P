import React from 'react';
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
  const { lobby, combatState, members } = useLobbyStore();
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
      initiative: stateMember?.initiative ?? null
    };
  });
  const currentId = combatState.activeMemberId ?? ordered[0]?.id ?? null;

  const getAvatar = (memberId: string, characterId: string | null) => {
    const fromOrder = ordered.find((member) => member.id === memberId)?.avatar;
    if (fromOrder) return fromOrder;
    if (!characterId) return null;
    const char = charactersList.find((item) => item.id === characterId);
    return char?.avatar ?? null;
  };

  return (
    <div className="fixed top-3 left-1/2 z-[47] -translate-x-1/2">
      <div className="flex items-end gap-3">
        {ordered.map((member, index) => {
          const isActive = member.id === currentId;
          const avatar = getAvatar(member.id, member.characterId);
          const initiativeLabel =
            typeof member.initiative === 'number' ? `Иниц. ${member.initiative}` : `Иниц. #${index + 1}`;
          return (
            <div key={member.id} className="flex flex-col items-center gap-1">
              {avatar ? (
                <img
                  src={avatar}
                  title={member.name}
                  className={`object-cover transition-all ${
                    isActive ? 'h-16 w-16 rounded-md opacity-100' : 'h-12 w-12 rounded-md opacity-80'
                  }`}
                />
              ) : (
                <div
                  title={member.name}
                  className={`flex items-center justify-center bg-white/10 font-black text-white transition-all ${
                    isActive ? 'h-16 w-16 rounded-md text-[12px] opacity-100' : 'h-12 w-12 rounded-md text-[10px] opacity-80'
                  }`}
                >
                  {avatarFallback(member.name)}
                </div>
              )}
              <div className={`text-[10px] ${isActive ? 'text-white' : 'text-gray-400'}`}>{initiativeLabel}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
