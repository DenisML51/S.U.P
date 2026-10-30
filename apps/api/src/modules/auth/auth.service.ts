import { randomUUID } from 'node:crypto';
import { ErrorCode, type UserDto } from '@itd/schema';
import { and, eq, isNull } from 'drizzle-orm';
import type { Database } from '../../db/client';
import { refreshTokens, users, type UserRow } from '../../db/schema';
import { AppError, unauthorized } from '../../lib/errors';
import { isUniqueViolation } from '../../lib/postgres';
import {
  type AccessTokenSigner,
  burnPasswordCheck,
  generateRefreshToken,
  hashPassword,
  hashToken,
  verifyPassword,
} from './crypto';

/**
 * Two tabs refreshing at the same moment both present the same refresh token. A token rotated less
 * than this long ago is treated as such a race rather than as theft.
 */
const ROTATION_GRACE_MS = 30_000;

export interface Session {
  user: UserDto;
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

export interface ClientInfo {
  userAgent?: string;
}

export interface AuthServiceOptions {
  refreshTokenTtlDays: number;
  registrationEnabled: boolean;
}

export const toUserDto = (row: UserRow): UserDto => ({
  id: row.id,
  email: row.email,
  displayName: row.displayName,
  createdAt: row.createdAt.toISOString(),
});

const invalidCredentials = () =>
  new AppError(401, ErrorCode.invalidCredentials, 'Неверный email или пароль');

export class AuthService {
  constructor(
    private readonly db: Database,
    private readonly signer: AccessTokenSigner,
    private readonly options: AuthServiceOptions,
  ) {}

  get registrationEnabled(): boolean {
    return this.options.registrationEnabled;
  }

  /** Creates an account. Self-service sign-up honours `registrationEnabled`; the CLI bypasses it. */
  async createUser(input: { email: string; password: string; displayName: string }): Promise<UserRow> {
    const passwordHash = await hashPassword(input.password);
    try {
      const [user] = await this.db
        .insert(users)
        .values({ email: input.email, passwordHash, displayName: input.displayName })
        .returning();
      return user!;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppError(409, ErrorCode.emailTaken, 'Пользователь с таким email уже зарегистрирован');
      }
      throw error;
    }
  }

  async register(
    input: { email: string; password: string; displayName: string },
    client: ClientInfo,
  ): Promise<Session> {
    if (!this.options.registrationEnabled) {
      throw new AppError(403, ErrorCode.forbidden, 'Регистрация закрыта. Обратитесь к администратору.');
    }
    const user = await this.createUser(input);
    return this.startSession(user, randomUUID(), client);
  }

  async login(input: { email: string; password: string }, client: ClientInfo): Promise<Session> {
    const [user] = await this.db.select().from(users).where(eq(users.email, input.email));
    if (!user) {
      await burnPasswordCheck(input.password);
      throw invalidCredentials();
    }
    if (!(await verifyPassword(user.passwordHash, input.password))) throw invalidCredentials();
    return this.startSession(user, randomUUID(), client);
  }

  /** Exchanges a refresh token for a new session, rotating the token. */
  async refresh(token: string, client: ClientInfo): Promise<Session> {
    const [stored] = await this.db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, hashToken(token)));
    if (!stored || stored.expiresAt.getTime() <= Date.now()) throw unauthorized('Сессия истекла, войдите снова');

    if (stored.revokedAt) {
      const concurrentRotation =
        stored.revokedReason === 'rotated' && Date.now() - stored.revokedAt.getTime() < ROTATION_GRACE_MS;
      if (!concurrentRotation) {
        // A rotated-away token came back: assume it leaked and end every session descended from it.
        await this.revokeFamily(stored.familyId, 'reuse');
        throw unauthorized('Сессия завершена, войдите снова');
      }
    } else {
      const rotated = await this.db
        .update(refreshTokens)
        .set({ revokedAt: new Date(), revokedReason: 'rotated' })
        .where(and(eq(refreshTokens.id, stored.id), isNull(refreshTokens.revokedAt)))
        .returning({ id: refreshTokens.id });
      // Lost a race with another rotation of the same token: that is the grace case above.
      if (rotated.length === 0) return this.refresh(token, client);
    }

    const [user] = await this.db.select().from(users).where(eq(users.id, stored.userId));
    if (!user) throw unauthorized();
    return this.startSession(user, stored.familyId, client);
  }

  async logout(token: string): Promise<void> {
    const [stored] = await this.db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, hashToken(token)));
    if (stored) await this.revokeFamily(stored.familyId, 'logout');
  }

  async getUser(userId: string): Promise<UserDto> {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId));
    if (!user) throw unauthorized();
    return toUserDto(user);
  }

  async updateProfile(userId: string, displayName: string): Promise<UserDto> {
    const [user] = await this.db
      .update(users)
      .set({ displayName, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    if (!user) throw unauthorized();
    return toUserDto(user);
  }

  /** Changes the password and signs out every other session. */
  async changePassword(
    userId: string,
    input: { currentPassword: string; newPassword: string },
    client: ClientInfo,
  ): Promise<Session> {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId));
    if (!user) throw unauthorized();
    if (!(await verifyPassword(user.passwordHash, input.currentPassword))) {
      throw new AppError(400, ErrorCode.invalidCredentials, 'Текущий пароль указан неверно');
    }

    const passwordHash = await hashPassword(input.newPassword);
    const updated = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .update(users)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();
      await tx
        .update(refreshTokens)
        .set({ revokedAt: new Date(), revokedReason: 'password_change' })
        .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
      return row!;
    });
    return this.startSession(updated, randomUUID(), client);
  }

  /**
   * Sets a new password without the old one — the server admin's answer to a forgotten password
   * (there is no mail to send a link by). Every session of the account ends.
   */
  async resetPassword(email: string, newPassword: string): Promise<UserRow> {
    const passwordHash = await hashPassword(newPassword);
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .update(users)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(users.email, email))
        .returning();
      if (!row) throw new AppError(404, ErrorCode.notFound, `Пользователь ${email} не найден`);
      await tx
        .update(refreshTokens)
        .set({ revokedAt: new Date(), revokedReason: 'password_change' })
        .where(and(eq(refreshTokens.userId, row.id), isNull(refreshTokens.revokedAt)));
      return row;
    });
  }

  /** Verifies an access token and returns the user id it was issued to. */
  async authenticate(accessToken: string): Promise<string | null> {
    const claims = await this.signer.verify(accessToken);
    return claims?.userId ?? null;
  }

  private async startSession(user: UserRow, familyId: string, client: ClientInfo): Promise<Session> {
    const refreshToken = generateRefreshToken();
    const refreshTokenExpiresAt = new Date(Date.now() + this.options.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
    await this.db.insert(refreshTokens).values({
      userId: user.id,
      familyId,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshTokenExpiresAt,
      userAgent: client.userAgent?.slice(0, 512),
    });
    const access = await this.signer.sign({ userId: user.id });
    return {
      user: toUserDto(user),
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt,
      refreshToken,
      refreshTokenExpiresAt,
    };
  }

  private async revokeFamily(familyId: string, reason: 'logout' | 'reuse'): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date(), revokedReason: reason })
      .where(and(eq(refreshTokens.familyId, familyId), isNull(refreshTokens.revokedAt)));
  }
}
