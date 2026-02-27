import { describe, expect, it, beforeAll, afterAll } from 'vitest';
process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5432/intothedark?schema=public';
process.env.APP_ORIGIN ??= 'http://localhost:5173';
process.env.JWT_ACCESS_SECRET ??= 'test_access_secret_1234567890123456789012';
process.env.JWT_REFRESH_SECRET ??= 'test_refresh_secret_123456789012345678901';
process.env.RESEND_API_KEY ??= 'test_key';
process.env.RESEND_FROM ??= 'noreply@example.com';
process.env.CHARACTER_DATA_KEY ??= 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
let app;
let decryptJson;
let encryptJson;
describe('security baseline', () => {
    beforeAll(async () => {
        const appModule = await import('../src/app.js');
        const cryptoModule = await import('../src/utils/crypto.js');
        app = appModule.buildApp();
        decryptJson = cryptoModule.decryptJson;
        encryptJson = cryptoModule.encryptJson;
        await app.ready();
    });
    afterAll(async () => {
        await app.close();
    });
    it('blocks /auth/me without access token', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/auth/me'
        });
        expect(response.statusCode).toBe(401);
    });
    it('blocks /characters without access token', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/characters'
        });
        expect(response.statusCode).toBe(401);
    });
    it('encrypts and decrypts payload deterministically by content', () => {
        const payload = { name: 'Hero', notes: 'private', hp: 10 };
        const encrypted = encryptJson(payload);
        const decrypted = decryptJson(encrypted.encryptedPayload, encrypted.payloadIv, encrypted.payloadTag);
        expect(decrypted).toEqual(payload);
    });
});
