import React from 'react';
import { useLobbyStore } from '../../store/useLobbyStore';
import { useCharacterStore } from '../../store/useCharacterStore';
import { useAuthStore } from '../../store/useAuthStore';

const formatAction = (value: string | null): string => {
  if (!value) {
    return 'Ожидание';
  }
  return value;
};

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

  const renderActionDots = (total: number, spent: number, color: string) =>
    Array.from({ length: total }).map((_, idx) => (
      <span
        key={`${color}-${idx}`}
        className={`h-2.5 w-2.5 rounded-full border ${idx < spent ? 'opacity-35' : 'opacity-100'}`}
        style={{
          backgroundColor: color,
          borderColor: color
        }}
      />
    ));

  return (
    <aside className="fixed left-3 top-[130px] z-[46] w-[270px] rounded-2xl border border-white/10 bg-dark-bg/85 p-3 shadow-2xl backdrop-blur-xl">
      <div className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-gray-400">Бой в лобби</div>
      <div className="space-y-2">
        {!sourceMembers.length && (
          <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-gray-400">
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
          const actionLimits = member.actionLimits || { action: 1, bonus: 1, reaction: 1 };
          const spentActions = member.spentActions || { action: 0, bonus: 0, reaction: 0 };
          const hpPct = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;
          return (
            <div
              key={member.memberId ?? member.id}
              className={`rounded-lg border px-2 py-1.5 text-[11px] ${
                isActive ? 'border-blue-400/50 bg-blue-500/10' : 'border-white/10 bg-black/20'
              }`}
            >
              <div className="grid grid-cols-[auto_1fr] gap-2">
                <div className="flex items-center gap-2">
                  {avatar ? (
                    <img src={avatar} className="h-7 w-7 rounded-md object-cover border border-white/20" />
                  ) : (
                    <div className="h-7 w-7 rounded-md bg-white/10 border border-white/20" />
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{member.name ?? member.userName}</span>
                    <span className="text-[9px] uppercase text-gray-500">{member.role}</span>
                  </div>
                  {'characterName' in member && (
                    <div className="truncate text-gray-400">Перс: {member.characterName ?? 'не выбран'}</div>
                  )}
                  <div className="mt-0.5 text-gray-300">HP: {hp} / {maxHp}</div>
                  <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-black/40 border border-white/10">
                    <div className="h-full bg-red-500" style={{ width: `${hpPct}%` }} />
                  </div>
                </div>
              </div>
              <div className="mt-1 grid grid-cols-3 gap-1 text-[10px]">
                <div className="rounded border border-blue-500/30 bg-blue-500/10 px-1 py-0.5">
                  <div className="text-blue-300">Осн.</div>
                  <div className="flex gap-1">{renderActionDots(actionLimits.action, spentActions.action, '#60a5fa')}</div>
                </div>
                <div className="rounded border border-green-500/30 bg-green-500/10 px-1 py-0.5">
                  <div className="text-green-300">Бонус</div>
                  <div className="flex gap-1">{renderActionDots(actionLimits.bonus, spentActions.bonus, '#4ade80')}</div>
                </div>
                <div className="rounded border border-orange-500/30 bg-orange-500/10 px-1 py-0.5">
                  <div className="text-orange-300">Реакц.</div>
                  <div className="flex gap-1">{renderActionDots(actionLimits.reaction, spentActions.reaction, '#fb923c')}</div>
                </div>
              </div>
              <div className="mt-0.5 text-gray-400">Действие: {formatAction(member.currentAction)}</div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
