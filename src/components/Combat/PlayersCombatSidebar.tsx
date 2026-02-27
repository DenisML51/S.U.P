import React from 'react';
import { useLobbyStore } from '../../store/useLobbyStore';
import { useCharacterStore } from '../../store/useCharacterStore';
import { useAuthStore } from '../../store/useAuthStore';

export const PlayersCombatSidebar: React.FC = () => {
  const { lobby, combatState, members } = useLobbyStore();
  const { charactersList } = useCharacterStore();
  const { user } = useAuthStore();
  if (!lobby) {
    return null;
  }

  const combatMembers = combatState?.membersCombat ?? [];
  const combatMembersById = new Map(combatMembers.map((member) => [member.memberId, member]));
  const mergedMembers = (members || []).map((member) => {
    const combatMember = combatMembersById.get(member.id);
    if (!combatMember) {
      return member;
    }
    return {
      ...member,
      ...combatMember
    };
  });
  const sourceMembers = (combatMembers.length ? mergedMembers : members)
    .filter((member: any) => member.userId !== user?.id) as any[];

  return (
    <aside className="fixed left-3 top-[130px] z-[46] w-[270px]">
      <div className="space-y-2">
        {!sourceMembers.length && (
          <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-gray-400">
            Другие участники пока не подключены
          </div>
        )}
        {sourceMembers.map((member: any) => {
          const isActive = combatState?.activeMemberId === member.memberId || combatState?.activeMemberId === member.id;
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
              key={member.memberId ?? member.id}
              className={`rounded-xl border px-2.5 py-2 text-[11px] shadow-lg backdrop-blur-xl ${
                isActive ? 'border-blue-400/55 bg-[#112239]/88' : 'border-white/10 bg-black/55'
              }`}
            >
              <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
                <div className="flex items-center gap-2">
                  {avatar ? (
                    <img src={avatar} className="h-8 w-8 rounded-lg object-cover border border-white/20" />
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-white/10 border border-white/20" />
                  )}
                </div>
                <div>
                  <div className="truncate font-semibold text-white">
                    {'characterName' in member ? member.characterName ?? 'Персонаж не выбран' : member.name ?? 'Персонаж не выбран'}
                  </div>
                </div>
                <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-black uppercase ${
                  isActive ? 'border-blue-400/40 bg-blue-500/20 text-blue-200' : 'border-white/15 text-gray-400'
                }`}>
                  {isActive ? 'Ход' : member.role}
                </span>
              </div>

              <div className="mt-1.5">
                <div className="mb-1 flex items-center justify-between text-[10px] text-gray-300">
                  <span>HP</span>
                  <span>{hp} / {maxHp}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/45 border border-white/10">
                  <div
                    className={`h-full ${hpPct <= 25 ? 'bg-red-500' : hpPct <= 55 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                    style={{ width: `${hpPct}%` }}
                  />
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </aside>
  );
};
