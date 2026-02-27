import { LobbyRole, LobbyStatus, MemberStatus, MessageVisibility, type Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';
import { decryptJson } from '../utils/crypto.js';
import type { CombatEventInput } from './contracts.js';

export type LobbyMemberView = {
  id: string;
  userId: string;
  userName: string;
  characterName: string | null;
  avatar: string | null;
  role: LobbyRole;
  status: MemberStatus;
  currentAction: string | null;
  currentHP: number | null;
  maxHP: number | null;
  characterId: string | null;
};

export type LobbyMessageView = {
  id: string;
  senderId: string;
  senderRole: LobbyRole;
  content: string;
  visibility: MessageVisibility;
  createdAt: string;
};

export type CombatMemberState = {
  memberId: string;
  userId: string;
  name: string;
  role: LobbyRole;
  kind: 'lobby_member' | 'master_custom';
  controlledByUserId: string | null;
  avatar: string | null;
  characterId: string | null;
  initiative: number | null;
  currentHP: number;
  maxHP: number;
  currentAction: string | null;
  actionLimits: { action: number; bonus: number; reaction: number };
  spentActions: { action: number; bonus: number; reaction: number };
};

export type CombatSnapshot = {
  isInCombat: boolean;
  round: number;
  activeMemberId: string | null;
  turnOrder: string[];
  serverSequence: number;
  membersCombat: CombatMemberState[];
};

type LobbyStateView = {
  lobby: {
    id: string;
    key: string;
    hostId: string;
    status: LobbyStatus;
    createdAt: string;
  };
  meRole: LobbyRole | null;
  members: LobbyMemberView[];
  messages: LobbyMessageView[];
  combatState: CombatSnapshot | null;
};

const parseCharacterHealth = (raw: {
  encryptedPayload: string;
  payloadIv: string;
  payloadTag: string;
}): { currentHP: number; maxHP: number; avatar: string | null } | null => {
  try {
    const data = decryptJson<Record<string, unknown>>(raw.encryptedPayload, raw.payloadIv, raw.payloadTag);
    const currentHP = Number(data.currentHP ?? 0);
    const maxHP = Number(data.maxHP ?? 0);
    return {
      currentHP: Number.isFinite(currentHP) ? currentHP : 0,
      maxHP: Number.isFinite(maxHP) ? maxHP : 0,
      avatar: typeof data.avatar === 'string' ? data.avatar : null
    };
  } catch {
    return null;
  }
};

export const resolveMemberHealth = async (
  userId: string,
  characterId?: string
): Promise<{ currentHP: number | null; maxHP: number | null; characterId: string | null }> => {
  if (!characterId) {
    return { currentHP: null, maxHP: null, characterId: null };
  }
  const character = await prisma.character.findFirst({
    where: { id: characterId, userId },
    select: { id: true, encryptedPayload: true, payloadIv: true, payloadTag: true }
  });
  if (!character) {
    return { currentHP: null, maxHP: null, characterId: null };
  }

  const parsed = parseCharacterHealth(character);
  return {
    currentHP: parsed?.currentHP ?? null,
    maxHP: parsed?.maxHP ?? null,
    characterId: character.id
  };
};

const asCombatSnapshot = (snapshot: Prisma.JsonValue | null): CombatSnapshot | null => {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    return null;
  }
  return snapshot as unknown as CombatSnapshot;
};

export const buildLobbyState = async (lobbyKey: string, viewerUserId: string): Promise<LobbyStateView | null> => {
  const lobby = await prisma.lobby.findUnique({
    where: { key: lobbyKey },
    include: {
      members: {
        where: { status: { not: MemberStatus.LEFT } },
        include: {
          user: { select: { id: true, name: true } },
          character: {
            select: { name: true, encryptedPayload: true, payloadIv: true, payloadTag: true }
          }
        },
        orderBy: { joinedAt: 'asc' }
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 50
      },
      combatState: true
    }
  });

  if (!lobby) {
    return null;
  }

  const me = lobby.members.find((member) => member.userId === viewerUserId) ?? null;
  const meRole = me?.role ?? null;

  const visibleMessages = lobby.messages
    .filter((message) => {
      if (message.visibility === MessageVisibility.ALL) {
        return true;
      }
      return meRole === LobbyRole.PLAYER;
    })
    .reverse()
    .map((message) => ({
      id: message.id,
      senderId: message.senderId,
      senderRole: message.senderRole,
      content: message.content,
      visibility: message.visibility,
      createdAt: message.createdAt.toISOString()
    }));

  return {
    lobby: {
      id: lobby.id,
      key: lobby.key,
      hostId: lobby.hostId,
      status: lobby.status,
      createdAt: lobby.createdAt.toISOString()
    },
    meRole,
    members: lobby.members.map((member) => {
      const parsed = member.character ? parseCharacterHealth(member.character as any) : null;
      return {
        id: member.id,
        userId: member.user.id,
        userName: member.user.name,
        characterName: member.character?.name ?? null,
        avatar: parsed?.avatar ?? null,
        role: member.role,
        status: member.status,
        currentAction: member.currentAction,
        currentHP: member.currentHP,
        maxHP: member.maxHP,
        characterId: member.characterId
      };
    }),
    messages: visibleMessages,
    combatState: asCombatSnapshot(lobby.combatState?.snapshot ?? null)
  };
};

const nextSequence = (snapshot: CombatSnapshot | null): number => (snapshot?.serverSequence ?? 0) + 1;
const resetActions = (member: CombatMemberState): CombatMemberState => ({
  ...member,
  currentAction: null,
  spentActions: { action: 0, bonus: 0, reaction: 0 }
});

const buildTurnOrder = (membersCombat: CombatMemberState[], previousOrder: string[] = []): string[] => {
  const prevIndex = new Map(previousOrder.map((id, idx) => [id, idx]));
  return [...membersCombat]
    .sort((a, b) => {
      const aInit = typeof a.initiative === 'number' && Number.isFinite(a.initiative) ? a.initiative : -999;
      const bInit = typeof b.initiative === 'number' && Number.isFinite(b.initiative) ? b.initiative : -999;
      if (bInit !== aInit) {
        return bInit - aInit;
      }
      const ai = prevIndex.get(a.memberId) ?? Number.MAX_SAFE_INTEGER;
      const bi = prevIndex.get(b.memberId) ?? Number.MAX_SAFE_INTEGER;
      return ai - bi;
    })
    .map((member) => member.memberId);
};
const createCustomCombatMemberId = (): string =>
  `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const toPersistedActiveMemberId = (snapshot: CombatSnapshot): string | null => {
  if (!snapshot.activeMemberId) {
    return null;
  }
  const active = snapshot.membersCombat.find((member) => member.memberId === snapshot.activeMemberId);
  return active?.kind === 'lobby_member' ? active.memberId : null;
};
const persistCombatSnapshot = async (lobbyId: string, snapshot: CombatSnapshot) => {
  const persistedActiveMemberId = toPersistedActiveMemberId(snapshot);
  await prisma.combatState.upsert({
    where: { lobbyId },
    create: {
      lobbyId,
      round: snapshot.round,
      activeMemberId: persistedActiveMemberId,
      isInCombat: snapshot.isInCombat,
      turnOrder: snapshot.turnOrder as unknown as Prisma.InputJsonValue,
      snapshot: snapshot as unknown as Prisma.InputJsonValue
    },
    update: {
      round: snapshot.round,
      activeMemberId: persistedActiveMemberId,
      isInCombat: snapshot.isInCombat,
      turnOrder: snapshot.turnOrder as unknown as Prisma.InputJsonValue,
      snapshot: snapshot as unknown as Prisma.InputJsonValue
    }
  });
};

export const promoteLeavingMemberToMasterNpc = async (lobbyId: string, leavingMemberId: string) => {
  const combatState = await prisma.combatState.findUnique({
    where: { lobbyId },
    select: { snapshot: true, isInCombat: true }
  });
  if (!combatState?.isInCombat) {
    return;
  }
  const snapshot = asCombatSnapshot(combatState.snapshot ?? null);
  if (!snapshot?.isInCombat) {
    return;
  }
  const leavingIndex = snapshot.membersCombat.findIndex(
    (member) => member.memberId === leavingMemberId && member.kind === 'lobby_member'
  );
  if (leavingIndex < 0) {
    return;
  }
  const master = await prisma.lobbyMember.findFirst({
    where: {
      lobbyId,
      role: LobbyRole.MASTER,
      status: { not: MemberStatus.LEFT }
    },
    select: { userId: true }
  });
  const leaving = snapshot.membersCombat[leavingIndex];
  const replacementId = createCustomCombatMemberId();
  const promoted: CombatMemberState = {
    ...leaving,
    memberId: replacementId,
    kind: 'master_custom',
    controlledByUserId: master?.userId ?? null,
    role: LobbyRole.MASTER
  };
  snapshot.membersCombat[leavingIndex] = promoted;
  snapshot.turnOrder = snapshot.turnOrder.map((id) => (id === leavingMemberId ? replacementId : id));
  if (snapshot.activeMemberId === leavingMemberId) {
    snapshot.activeMemberId = replacementId;
  }
  snapshot.serverSequence = nextSequence(snapshot);
  await persistCombatSnapshot(lobbyId, snapshot);
};

export const reclaimReturningMemberFromMasterNpc = async (
  lobbyId: string,
  returningMemberId: string,
  returningUserId: string
) => {
  const combatState = await prisma.combatState.findUnique({
    where: { lobbyId },
    select: { snapshot: true, isInCombat: true }
  });
  if (!combatState?.isInCombat) {
    return;
  }
  const snapshot = asCombatSnapshot(combatState.snapshot ?? null);
  if (!snapshot?.isInCombat) {
    return;
  }
  const reclaimIndex = snapshot.membersCombat.findIndex(
    (member) =>
      member.kind === 'master_custom' &&
      member.userId === returningUserId
  );
  if (reclaimIndex < 0) {
    return;
  }
  const reclaim = snapshot.membersCombat[reclaimIndex];
  const restored: CombatMemberState = {
    ...reclaim,
    memberId: returningMemberId,
    kind: 'lobby_member',
    controlledByUserId: null,
    role: LobbyRole.PLAYER
  };
  snapshot.membersCombat[reclaimIndex] = restored;
  snapshot.membersCombat = snapshot.membersCombat.filter(
    (member, idx) =>
      idx === reclaimIndex || member.memberId !== returningMemberId
  );
  snapshot.turnOrder = snapshot.turnOrder.map((id) =>
    id === reclaim.memberId ? returningMemberId : id
  );
  if (snapshot.activeMemberId === reclaim.memberId) {
    snapshot.activeMemberId = returningMemberId;
  }
  snapshot.serverSequence = nextSequence(snapshot);
  await persistCombatSnapshot(lobbyId, snapshot);
};

export const applyCombatEvent = async (
  lobbyId: string,
  event: CombatEventInput,
  actor?: { userId: string; role: LobbyRole }
): Promise<CombatSnapshot> => {
  const lobby = await prisma.lobby.findUnique({
    where: { id: lobbyId },
    include: {
      members: {
        where: { status: { not: MemberStatus.LEFT } },
        include: {
          user: { select: { id: true, name: true } },
          character: { select: { encryptedPayload: true, payloadIv: true, payloadTag: true } }
        },
        orderBy: { joinedAt: 'asc' }
      },
      combatState: true
    }
  });

  if (!lobby) {
    throw new Error('Lobby not found');
  }

  const current = asCombatSnapshot(lobby.combatState?.snapshot ?? null);
  const baseMembers: CombatMemberState[] = lobby.members.map((member) => ({
    memberId: member.id,
    userId: member.userId,
    name: member.user.name,
    role: member.role,
    kind: 'lobby_member',
    controlledByUserId: null,
    avatar: member.character ? parseCharacterHealth(member.character as any)?.avatar ?? null : null,
    characterId: member.characterId,
    initiative: null,
    currentHP: member.currentHP ?? 0,
    maxHP: member.maxHP ?? 0,
    currentAction: member.currentAction,
    actionLimits: { action: 1, bonus: 1, reaction: 1 },
    spentActions: { action: 0, bonus: 0, reaction: 0 }
  }));

  const snapshot: CombatSnapshot =
    current ?? {
      isInCombat: false,
      round: 1,
      activeMemberId: null,
      turnOrder: baseMembers.map((member) => member.memberId),
      serverSequence: 0,
      membersCombat: baseMembers
    };

  const existingById = new Map(snapshot.membersCombat.map((member) => [member.memberId, member]));
  const lobbyMemberIds = new Set(baseMembers.map((member) => member.memberId));
  const preservedCustomMembers = snapshot.membersCombat.filter(
    (member) => member.kind === 'master_custom' && !lobbyMemberIds.has(member.memberId)
  );
  snapshot.membersCombat = [
    ...baseMembers.map((member) => ({
    ...member,
    ...(existingById.get(member.memberId) ?? {})
    })),
    ...preservedCustomMembers
  ];
  snapshot.turnOrder = snapshot.turnOrder.filter((memberId) =>
    snapshot.membersCombat.some((member) => member.memberId === memberId)
  );

  switch (event.eventType) {
    case 'combat.start': {
      if (actor && actor.role !== LobbyRole.MASTER) {
        throw new Error('Only master can start combat');
      }
      snapshot.isInCombat = true;
      snapshot.round = 1;
      snapshot.membersCombat = snapshot.membersCombat.map(resetActions);
      snapshot.turnOrder = buildTurnOrder(snapshot.membersCombat, snapshot.turnOrder);
      snapshot.activeMemberId = snapshot.turnOrder[0] ?? null;
      await prisma.lobbyMember.updateMany({
        where: { lobbyId },
        data: { currentAction: null }
      });
      break;
    }
    case 'combat.nextTurn': {
      if (!actor) {
        throw new Error('Unauthorized');
      }
      if (!snapshot.turnOrder.length) {
        snapshot.turnOrder = buildTurnOrder(snapshot.membersCombat, snapshot.turnOrder);
      }
      if (!snapshot.turnOrder.length) {
        snapshot.activeMemberId = null;
        break;
      }
      const activeMember = snapshot.membersCombat.find((member) => member.memberId === snapshot.activeMemberId) ?? null;
      const canAdvanceTurn =
        actor.role === LobbyRole.MASTER || (activeMember ? activeMember.userId === actor.userId : false);
      if (!canAdvanceTurn) {
        throw new Error('It is not your turn');
      }
      const currentIdx = snapshot.activeMemberId
        ? snapshot.turnOrder.findIndex((memberId) => memberId === snapshot.activeMemberId)
        : -1;
      const nextIdx = currentIdx < 0 ? 0 : (currentIdx + 1) % snapshot.turnOrder.length;
      const wrapped = currentIdx >= 0 && nextIdx === 0;
      snapshot.activeMemberId = snapshot.turnOrder[nextIdx] ?? null;
      if (wrapped) {
        snapshot.round += 1;
        snapshot.membersCombat = snapshot.membersCombat.map(resetActions);
        await prisma.lobbyMember.updateMany({
          where: { lobbyId },
          data: { currentAction: null }
        });
      }
      break;
    }
    case 'combat.updateActor': {
      if (typeof event.payload.activeMemberId === 'string') {
        snapshot.activeMemberId = event.payload.activeMemberId;
      }
      if (typeof event.payload.round === 'number' && Number.isFinite(event.payload.round)) {
        snapshot.round = Math.max(1, Math.floor(event.payload.round));
      }
      break;
    }
    case 'combat.actionUsed': {
      const memberId = typeof event.payload.memberId === 'string' ? event.payload.memberId : null;
      const action = typeof event.payload.action === 'string' ? event.payload.action : null;
      const actionState =
        event.payload.actionState && typeof event.payload.actionState === 'object'
          ? (event.payload.actionState as {
              actionLimits?: { action?: number; bonus?: number; reaction?: number };
              spentActions?: { action?: number; bonus?: number; reaction?: number };
              initiative?: number;
            })
          : null;
      if (memberId && action) {
        snapshot.membersCombat = snapshot.membersCombat.map((member) =>
          member.memberId === memberId
            ? {
                ...member,
                currentAction: action,
                initiative:
                  typeof actionState?.initiative === 'number' && Number.isFinite(actionState.initiative)
                    ? actionState.initiative
                    : member.initiative,
                actionLimits: {
                  action: Number(actionState?.actionLimits?.action ?? member.actionLimits.action ?? 1),
                  bonus: Number(actionState?.actionLimits?.bonus ?? member.actionLimits.bonus ?? 1),
                  reaction: Number(actionState?.actionLimits?.reaction ?? member.actionLimits.reaction ?? 1)
                },
                spentActions: {
                  action: Number(actionState?.spentActions?.action ?? member.spentActions.action ?? 0),
                  bonus: Number(actionState?.spentActions?.bonus ?? member.spentActions.bonus ?? 0),
                  reaction: Number(actionState?.spentActions?.reaction ?? member.spentActions.reaction ?? 0)
                }
              }
            : member
        );
        await prisma.lobbyMember.updateMany({
          where: { lobbyId, id: memberId },
          data: { currentAction: action }
        });
        if (snapshot.isInCombat && typeof actionState?.initiative === 'number' && Number.isFinite(actionState.initiative)) {
          snapshot.turnOrder = buildTurnOrder(snapshot.membersCombat, snapshot.turnOrder);
          if (!snapshot.activeMemberId || !snapshot.turnOrder.includes(snapshot.activeMemberId)) {
            snapshot.activeMemberId = snapshot.turnOrder[0] ?? null;
          }
        }
      }
      break;
    }
    case 'combat.hpChanged': {
      const memberId = typeof event.payload.memberId === 'string' ? event.payload.memberId : null;
      if (memberId) {
        const hp = Number(event.payload.currentHP);
        const maxHp = Number(event.payload.maxHP);
        snapshot.membersCombat = snapshot.membersCombat.map((member) => {
          if (member.memberId !== memberId) {
            return member;
          }
          return {
            ...member,
            currentHP: Number.isFinite(hp) ? hp : member.currentHP,
            maxHP: Number.isFinite(maxHp) ? maxHp : member.maxHP
          };
        });
        const target = snapshot.membersCombat.find((member) => member.memberId === memberId);
        if (target?.kind === 'lobby_member') {
          await prisma.lobbyMember.updateMany({
            where: { lobbyId, id: memberId },
            data: {
              ...(Number.isFinite(hp) ? { currentHP: hp } : {}),
              ...(Number.isFinite(maxHp) ? { maxHP: maxHp } : {})
            }
          });
        }
      }
      break;
    }
    case 'combat.addCustomMember': {
      if (actor?.role !== LobbyRole.MASTER) {
        throw new Error('Only master can add combat members');
      }
      const nameRaw = typeof event.payload.name === 'string' ? event.payload.name.trim() : '';
      if (!nameRaw) {
        throw new Error('Combat member name is required');
      }
      const avatar =
        typeof event.payload.avatar === 'string' && event.payload.avatar.trim()
          ? event.payload.avatar.trim()
          : null;
      const hp = Number(event.payload.currentHP);
      const maxHp = Number(event.payload.maxHP);
      const initiativeValue = Number(event.payload.initiative);
      const currentHP = Number.isFinite(hp) ? Math.max(0, Math.floor(hp)) : 1;
      const safeMaxHp = Number.isFinite(maxHp) ? Math.max(1, Math.floor(maxHp)) : currentHP;
      const initiative = Number.isFinite(initiativeValue) ? Math.floor(initiativeValue) : null;
      const sourceCharacterId =
        typeof event.payload.characterId === 'string' && event.payload.characterId.trim()
          ? event.payload.characterId.trim()
          : null;

      snapshot.membersCombat.push({
        memberId: createCustomCombatMemberId(),
        userId: actor.userId,
        name: nameRaw,
        role: LobbyRole.MASTER,
        kind: 'master_custom',
        controlledByUserId: actor.userId,
        avatar,
        characterId: sourceCharacterId,
        initiative,
        currentHP: Math.min(currentHP, safeMaxHp),
        maxHP: safeMaxHp,
        currentAction: null,
        actionLimits: { action: 1, bonus: 1, reaction: 1 },
        spentActions: { action: 0, bonus: 0, reaction: 0 }
      });
      snapshot.turnOrder = buildTurnOrder(snapshot.membersCombat, snapshot.turnOrder);
      if (!snapshot.activeMemberId || !snapshot.turnOrder.includes(snapshot.activeMemberId)) {
        snapshot.activeMemberId = snapshot.turnOrder[0] ?? null;
      }
      break;
    }
    case 'combat.removeCustomMember': {
      if (actor?.role !== LobbyRole.MASTER) {
        throw new Error('Only master can remove combat members');
      }
      const memberId = typeof event.payload.memberId === 'string' ? event.payload.memberId : '';
      const target = snapshot.membersCombat.find((member) => member.memberId === memberId);
      if (!target || target.kind !== 'master_custom') {
        throw new Error('Custom combat member not found');
      }
      snapshot.membersCombat = snapshot.membersCombat.filter((member) => member.memberId !== memberId);
      snapshot.turnOrder = snapshot.turnOrder.filter((id) => id !== memberId);
      if (snapshot.activeMemberId === memberId) {
        snapshot.activeMemberId = snapshot.turnOrder[0] ?? null;
      }
      break;
    }
    case 'combat.end': {
      if (actor && actor.role !== LobbyRole.MASTER) {
        throw new Error('Only master can end combat');
      }
      snapshot.isInCombat = false;
      snapshot.activeMemberId = null;
      snapshot.membersCombat = snapshot.membersCombat.map((member) => ({
        ...member,
        currentAction: null,
        initiative: null,
        spentActions: { action: 0, bonus: 0, reaction: 0 }
      }));
      await prisma.lobbyMember.updateMany({
        where: { lobbyId },
        data: { currentAction: null }
      });
      break;
    }
  }

  snapshot.serverSequence = nextSequence(current);
  await persistCombatSnapshot(lobbyId, snapshot);

  await prisma.lobby.update({
    where: { id: lobbyId },
    data: { status: snapshot.isInCombat ? LobbyStatus.IN_COMBAT : LobbyStatus.WAITING }
  });

  return snapshot;
};
