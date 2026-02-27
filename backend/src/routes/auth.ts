import type { FastifyPluginAsync } from 'fastify';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env, isProduction } from '../env.js';
import { prisma } from '../prisma.js';
import { generateNumericCode, hashValue, sha256, verifyHash } from '../utils/crypto.js';
import { sendVerificationCode } from '../utils/mail.js';

const registerRequestSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(8).max(128)
});

const registerVerifySchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  code: z.string().regex(/^\d{6}$/)
});

const loginSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(8).max(128)
});

const MAX_CODE_ATTEMPTS = 5;
const CODE_TTL_MINUTES = 10;

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60
};

export const authRoutes: FastifyPluginAsync = async (app) => {
  const issueSession = async (
    user: { id: string; email: string; name: string; emailVerifiedAt: Date | null },
    request: { headers: { [key: string]: string | string[] | undefined }; ip: string },
    reply: { setCookie: (name: string, value: string, options: unknown) => void }
  ) => {
    const payload = { sub: user.id, email: user.email };
    const accessToken = app.createAccessToken(payload);
    const rawRefreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: `${env.JWT_REFRESH_TTL_DAYS}d`
    });

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(rawRefreshToken),
        userAgent: request.headers['user-agent'] as string | undefined,
        ip: request.ip,
        expiresAt: new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000)
      }
    });

    reply.setCookie(env.REFRESH_COOKIE_NAME, rawRefreshToken, cookieOptions);

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null
      }
    };
  };

  app.post('/auth/register/request-code', { config: { rateLimit: { max: 5, timeWindow: '15 minutes' } } }, async (request, reply) => {
    const parsed = registerRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid payload' });
    }

    const { name, email, password } = parsed.data;
    const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existingUser) {
      return reply.code(409).send({ message: 'User with this email already exists' });
    }

    const passwordHash = await hashValue(password);
    if (!env.EMAIL_VERIFICATION_REQUIRED) {
      const createdUser = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          emailVerifiedAt: new Date()
        }
      });

      const session = await issueSession(createdUser, request as any, reply as any);
      return reply.send({
        requiresEmailVerification: false,
        ...session
      });
    }

    const code = generateNumericCode();
    const codeHash = await hashValue(code);
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

    await prisma.pendingRegistration.upsert({
      where: { email },
      update: {
        name,
        passwordHash,
        codeHash,
        expiresAt,
        attempts: 0,
        consumedAt: null
      },
      create: {
        name,
        email,
        passwordHash,
        codeHash,
        expiresAt
      }
    });

    try {
      await sendVerificationCode(email, code);
    } catch {
      return reply.code(500).send({ message: 'Unable to send code' });
    }

    return reply.send({
      requiresEmailVerification: true,
      message: 'If the email is valid, the code has been sent'
    });
  });

  app.post('/auth/register/verify-code', { config: { rateLimit: { max: 12, timeWindow: '15 minutes' } } }, async (request, reply) => {
    const parsed = registerVerifySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid payload' });
    }

    const { email, code } = parsed.data;
    const pending = await prisma.pendingRegistration.findUnique({ where: { email } });
    if (!pending || pending.consumedAt || pending.expiresAt < new Date() || pending.attempts >= MAX_CODE_ATTEMPTS) {
      return reply.code(400).send({ message: 'Invalid code or email' });
    }

    const isValid = await verifyHash(pending.codeHash, code);
    if (!isValid) {
      await prisma.pendingRegistration.update({
        where: { id: pending.id },
        data: { attempts: { increment: 1 } }
      });
      return reply.code(400).send({ message: 'Invalid code or email' });
    }

    const user = await prisma.$transaction(async (tx: any) => {
      const alreadyExists = await tx.user.findUnique({ where: { email }, select: { id: true } });
      if (alreadyExists) {
        return null;
      }

      const createdUser = await tx.user.create({
        data: {
          name: pending.name,
          email: pending.email,
          passwordHash: pending.passwordHash,
          emailVerifiedAt: new Date()
        }
      });

      await tx.pendingRegistration.update({
        where: { id: pending.id },
        data: { consumedAt: new Date() }
      });

      return createdUser;
    });
    if (!user) {
      return reply.code(409).send({ message: 'User with this email already exists' });
    }

    const session = await issueSession(user, request as any, reply as any);
    return reply.send(session);
  });

  app.post('/auth/login', { config: { rateLimit: { max: 20, timeWindow: '15 minutes' } } }, async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid payload' });
    }

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return reply.code(401).send({ message: 'Invalid credentials' });
    }

    const passwordOk = await verifyHash(user.passwordHash, password);
    if (!passwordOk) {
      return reply.code(401).send({ message: 'Invalid credentials' });
    }

    if (env.EMAIL_VERIFICATION_REQUIRED && !user.emailVerifiedAt) {
      return reply.code(403).send({ message: 'Email is not verified' });
    }

    const session = await issueSession(user, request as any, reply as any);
    return reply.send(session);
  });

  app.post('/auth/refresh', { config: { rateLimit: { max: 30, timeWindow: '15 minutes' } } }, async (request, reply) => {
    const rawRefreshToken = request.cookies[env.REFRESH_COOKIE_NAME];
    if (!rawRefreshToken) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    let tokenPayload: { sub: string; email: string };
    try {
      tokenPayload = jwt.verify(rawRefreshToken, env.JWT_REFRESH_SECRET) as { sub: string; email: string };
    } catch {
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
    const userId = (request.user as { sub: string }).sub;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, emailVerifiedAt: true }
    });
    if (!user) {
      return reply.code(404).send({ message: 'User not found' });
    }
    return reply.send({ user });
  });
};
