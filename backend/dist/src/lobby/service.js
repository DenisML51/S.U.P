import { LobbyRole, LobbyStatus, MemberStatus, MessageVisibility } from '@prisma/client';
import { prisma } from '../prisma.js';
import { decryptJson } from '../utils/crypto.js';
const parseCharacterHealth = (raw) => {
    try {
        const data = decryptJson(raw.encryptedPayload, raw.payloadIv, raw.payloadTag);
        const currentHP = Number(data.currentHP ?? 0);
        const maxHP = Number(data.maxHP ?? 0);
        return {
            currentHP: Number.isFinite(currentHP) ? currentHP : 0,
            maxHP: Number.isFinite(maxHP) ? maxHP : 0,
            avatar: typeof data.avatar === 'string' ? data.avatar : null
        };
    }
    catch {
        return null;
    }
};
export const resolveMemberHealth = async (userId, characterId) => {
    if (characterId) {
        const character = await prisma.character.findFirst({
            where: { id: characterId, userId },
            select: { id: true, encryptedPayload: true, payloadIv: true, payloadTag: true }
        });
        if (character) {
            const parsed = parseCharacterHealth(character);
            if (parsed) {
                return { currentHP: parsed.currentHP, maxHP: parsed.maxHP, characterId: character.id };
            }
            return { currentHP: null, maxHP: null, characterId: character.id };
        }
    }
    const latestCharacter = await prisma.character.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, encryptedPayload: true, payloadIv: true, payloadTag: true }
    });
    if (!latestCharacter) {
        return { currentHP: null, maxHP: null, characterId: null };
    }
    const parsed = parseCharacterHealth(latestCharacter);
    return {
        currentHP: parsed?.currentHP ?? null,
        maxHP: parsed?.maxHP ?? null,
        characterId: latestCharacter.id
    };
};
const asCombatSnapshot = (snapshot) => {
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
        return null;
    }
    return snapshot;
};
export const buildLobbyState = async (lobbyKey, viewerUserId) => {
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
            const parsed = member.character ? parseCharacterHealth(member.character) : null;
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
const nextSequence = (snapshot) => (snapshot?.serverSequence ?? 0) + 1;
const resetActions = (member) => ({
    ...member,
    currentAction: null,
    spentActions: { action: 0, bonus: 0, reaction: 0 }
});
const buildTurnOrder = (membersCombat, previousOrder = []) => {
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
export const applyCombatEvent = async (lobbyId, event, actor) => {
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
    const baseMembers = lobby.members.map((member) => ({
        memberId: member.id,
        userId: member.userId,
        name: member.user.name,
        role: member.role,
        avatar: member.character ? parseCharacterHealth(member.character)?.avatar ?? null : null,
        characterId: member.characterId,
        initiative: null,
        currentHP: member.currentHP ?? 0,
        maxHP: member.maxHP ?? 0,
        currentAction: member.currentAction,
        actionLimits: { action: 1, bonus: 1, reaction: 1 },
        spentActions: { action: 0, bonus: 0, reaction: 0 }
    }));
    const snapshot = current ?? {
        isInCombat: false,
        round: 1,
        activeMemberId: null,
        turnOrder: baseMembers.map((member) => member.memberId),
        serverSequence: 0,
        membersCombat: baseMembers
    };
    const existingById = new Map(snapshot.membersCombat.map((member) => [member.memberId, member]));
    snapshot.membersCombat = baseMembers.map((member) => ({
        ...member,
        ...(existingById.get(member.memberId) ?? {})
    }));
    snapshot.turnOrder = snapshot.turnOrder.filter((memberId) => snapshot.membersCombat.some((member) => member.memberId === memberId));
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
            const canAdvanceTurn = actor.role === LobbyRole.MASTER || (activeMember ? activeMember.userId === actor.userId : false);
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
            const actionState = event.payload.actionState && typeof event.payload.actionState === 'object'
                ? event.payload.actionState
                : null;
            if (memberId && action) {
                snapshot.membersCombat = snapshot.membersCombat.map((member) => member.memberId === memberId
                    ? {
                        ...member,
                        currentAction: action,
                        initiative: typeof actionState?.initiative === 'number' && Number.isFinite(actionState.initiative)
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
                    : member);
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
                await prisma.lobbyMember.updateMany({
                    where: { lobbyId, id: memberId },
                    data: {
                        ...(Number.isFinite(hp) ? { currentHP: hp } : {}),
                        ...(Number.isFinite(maxHp) ? { maxHP: maxHp } : {})
                    }
                });
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
                currentAction: null
            }));
            await prisma.lobbyMember.updateMany({
                where: { lobbyId },
                data: { currentAction: null }
            });
            break;
        }
    }
    snapshot.serverSequence = nextSequence(current);
    await prisma.combatState.upsert({
        where: { lobbyId },
        create: {
            lobbyId,
            round: snapshot.round,
            activeMemberId: snapshot.activeMemberId,
            isInCombat: snapshot.isInCombat,
            turnOrder: snapshot.turnOrder,
            snapshot: snapshot
        },
        update: {
            round: snapshot.round,
            activeMemberId: snapshot.activeMemberId,
            isInCombat: snapshot.isInCombat,
            turnOrder: snapshot.turnOrder,
            snapshot: snapshot
        }
    });
    await prisma.lobby.update({
        where: { id: lobbyId },
        data: { status: snapshot.isInCombat ? LobbyStatus.IN_COMBAT : LobbyStatus.WAITING }
    });
    return snapshot;
};
