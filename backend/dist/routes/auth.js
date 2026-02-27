import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env, isProduction } from '../env.js';
import { prisma } from '../prisma.js';
import { generateNumericCode, hashValue, sha256, verifyHash } from '../utils/crypto.js';
import { sendVerificationCode } from '../utils/mail.js';
const requestCodeSchema = z.object({
    email: z.string().email().trim().toLowerCase()
});
const verifyCodeSchema = z.object({
    email: z.string().email().trim().toLowerCase(),
    code: z.string().regex(/^\d{6}$/)
});
const MAX_CODE_ATTEMPTS = 5;
const CODE_TTL_MINUTES = 10;
const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60
};
export const authRoutes = async (app) => {
    app.post('/auth/request-code', { config: { rateLimit: { max: 5, timeWindow: '15 minutes' } } }, async (request, reply) => {
        const parsed = requestCodeSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.code(400).send({ message: 'Invalid payload' });
        }
        const { email } = parsed.data;
        const user = await prisma.user.upsert({
            where: { email },
            update: {},
            create: { email }
        });
        const code = generateNumericCode();
        const codeHash = await hashValue(code);
        const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);
        await prisma.emailVerificationCode.create({
            data: {
                userId: user.id,
                codeHash,
                expiresAt
            }
        });
        try {
            await sendVerificationCode(email, code);
        }
        catch {
            return reply.code(500).send({ message: 'Unable to send code' });
        }
        return reply.send({ message: 'If the email is valid, the code has been sent' });
    });
    app.post('/auth/verify-code', { config: { rateLimit: { max: 12, timeWindow: '15 minutes' } } }, async (request, reply) => {
        const parsed = verifyCodeSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.code(400).send({ message: 'Invalid payload' });
        }
        const { email, code } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return reply.code(400).send({ message: 'Invalid code or email' });
        }
        const latestCode = await prisma.emailVerificationCode.findFirst({
            where: { userId: user.id, consumedAt: null },
            orderBy: { createdAt: 'desc' }
        });
        if (!latestCode || latestCode.expiresAt < new Date() || latestCode.attempts >= MAX_CODE_ATTEMPTS) {
            return reply.code(400).send({ message: 'Invalid code or email' });
        }
        const isValid = await verifyHash(latestCode.codeHash, code);
        if (!isValid) {
            await prisma.emailVerificationCode.update({
                where: { id: latestCode.id },
                data: { attempts: { increment: 1 } }
            });
            return reply.code(400).send({ message: 'Invalid code or email' });
        }
        const payload = { sub: user.id, email: user.email };
        const accessToken = app.createAccessToken(payload);
        const rawRefreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
            expiresIn: `${env.JWT_REFRESH_TTL_DAYS}d`
        });
        await prisma.$transaction([
            prisma.user.update({
                where: { id: user.id },
                data: { emailVerifiedAt: user.emailVerifiedAt ?? new Date() }
            }),
            prisma.emailVerificationCode.update({
                where: { id: latestCode.id },
                data: { consumedAt: new Date() }
            }),
            prisma.refreshToken.create({
                data: {
                    userId: user.id,
                    tokenHash: sha256(rawRefreshToken),
                    userAgent: request.headers['user-agent'],
                    ip: request.ip,
                    expiresAt: new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000)
                }
            })
        ]);
        reply.setCookie(env.REFRESH_COOKIE_NAME, rawRefreshToken, cookieOptions);
        return reply.send({
            accessToken,
            user: { id: user.id, email: user.email, emailVerifiedAt: new Date().toISOString() }
        });
    });
    app.post('/auth/refresh', { config: { rateLimit: { max: 30, timeWindow: '15 minutes' } } }, async (request, reply) => {
        const rawRefreshToken = request.cookies[env.REFRESH_COOKIE_NAME];
        if (!rawRefreshToken) {
            return reply.code(401).send({ message: 'Unauthorized' });
        }
        let tokenPayload;
        try {
            tokenPayload = jwt.verify(rawRefreshToken, env.JWT_REFRESH_SECRET);
        }
        catch {
            return reply.code(401).send({ message: 'Unauthorized' });
        }
        const stored = await prisma.refreshToken.findFirst({
            where: {
                userId: tokenPayload.sub,
                tokenHash: sha256(rawRefreshToken),
                revokedAt: null,
                expiresAt: { gt: new Date() }
            }
        });
        if (!stored) {
            return reply.code(401).send({ message: 'Unauthorized' });
        }
        const newAccess = app.createAccessToken(tokenPayload);
        const newRefresh = jwt.sign(tokenPayload, env.JWT_REFRESH_SECRET, {
            expiresIn: `${env.JWT_REFRESH_TTL_DAYS}d`
        });
        await prisma.$transaction([
            prisma.refreshToken.update({
                where: { id: stored.id },
                data: { revokedAt: new Date() }
            }),
            prisma.refreshToken.create({
                data: {
                    userId: tokenPayload.sub,
                    tokenHash: sha256(newRefresh),
                    userAgent: request.headers['user-agent'],
                    ip: request.ip,
                    expiresAt: new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000)
                }
            })
        ]);
        reply.setCookie(env.REFRESH_COOKIE_NAME, newRefresh, cookieOptions);
        return reply.send({ accessToken: newAccess });
    });
    app.post('/auth/logout', async (request, reply) => {
        const rawRefreshToken = request.cookies[env.REFRESH_COOKIE_NAME];
        if (rawRefreshToken) {
            await prisma.refreshToken.updateMany({
                where: { tokenHash: sha256(rawRefreshToken), revokedAt: null },
                data: { revokedAt: new Date() }
            });
        }
        reply.clearCookie(env.REFRESH_COOKIE_NAME, { path: '/' });
        return reply.send({ ok: true });
    });
    app.get('/auth/me', { preHandler: [app.authenticate] }, async (request, reply) => {
        const userId = request.user.sub;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, emailVerifiedAt: true }
        });
        if (!user) {
            return reply.code(404).send({ message: 'User not found' });
        }
        return reply.send({ user });
    });
};
