import { describe, expect, it } from 'vitest';
import { reserveUniqueLobbyKey } from '../src/lobby/utils.js';
describe('lobby key utilities', () => {
    it('returns a unique key when candidate is available', async () => {
        const result = await reserveUniqueLobbyKey(async (key) => key === 'AAAAAA');
        expect(result).not.toBe('AAAAAA');
        expect(result).toMatch(/^[A-Z2-9]{6}$/);
    });
    it('throws if all attempts are exhausted', async () => {
        await expect(reserveUniqueLobbyKey(async () => true)).rejects.toThrow('Unable to allocate unique lobby key');
    });
});
