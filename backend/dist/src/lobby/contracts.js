import { z } from 'zod';
export const wsClientMessageSchema = z.object({
    type: z.string().min(1),
    clientEventId: z.string().optional(),
    payload: z.unknown().optional()
});
export const lobbyJoinSchema = z.object({
    key: z.string().trim().min(4).max(16).transform((value) => value.toUpperCase()),
    characterId: z.string().trim().min(1).max(64).optional()
});
export const lobbyCreateSchema = z.object({
    settings: z.record(z.unknown()).optional(),
    characterId: z.string().trim().min(1).max(64).optional()
});
export const lobbyLeaveSchema = z.object({
    key: z.string().trim().min(4).max(16).transform((value) => value.toUpperCase())
});
export const masterMessageSchema = z.object({
    text: z.string().trim().min(1).max(2000)
});
export const masterNotificationSchema = z.object({
    title: z.string().trim().min(1).max(120).optional(),
    text: z.string().trim().min(1).max(2000)
});
export const combatEventSchema = z.object({
    eventType: z.enum([
        'combat.start',
        'combat.nextTurn',
        'combat.updateActor',
        'combat.actionUsed',
        'combat.hpChanged',
        'combat.addCustomMember',
        'combat.removeCustomMember',
        'combat.end'
    ]),
    payload: z.record(z.unknown()).default({})
});
