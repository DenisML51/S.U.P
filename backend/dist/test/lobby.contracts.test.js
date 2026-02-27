import { describe, expect, it } from 'vitest';
import { combatEventSchema, lobbyJoinSchema, masterMessageSchema, wsClientMessageSchema } from '../src/lobby/contracts.js';
describe('lobby contracts', () => {
    it('normalizes lobby key to uppercase', () => {
        const parsed = lobbyJoinSchema.parse({ key: 'ab12cd' });
        expect(parsed.key).toBe('AB12CD');
    });
    it('validates websocket message envelope', () => {
        const parsed = wsClientMessageSchema.parse({
            type: 'combat.event',
            clientEventId: 'evt_1',
            payload: { eventType: 'combat.start' }
        });
        expect(parsed.type).toBe('combat.event');
    });
    it('rejects empty master messages', () => {
        const parsed = masterMessageSchema.safeParse({ text: '   ' });
        expect(parsed.success).toBe(false);
    });
    it('accepts known combat events only', () => {
        expect(combatEventSchema.safeParse({
            eventType: 'combat.hpChanged',
            payload: { memberId: 'm1', currentHP: 9, maxHP: 20 }
        }).success).toBe(true);
        expect(combatEventSchema.safeParse({
            eventType: 'combat.unknown',
            payload: {}
        }).success).toBe(false);
    });
});
