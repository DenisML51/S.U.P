import { createHash, randomBytes } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import { SignJWT, jwtVerify } from 'jose';

// OWASP-recommended argon2id parameters (19 MiB, 2 iterations).
const ARGON2_OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 };

export const hashPassword = (password: string): Promise<string> => hash(password, ARGON2_OPTIONS);

export const verifyPassword = (passwordHash: string, password: string): Promise<boolean> =>
  verify(passwordHash, password).catch(() => false);

/**
 * Verifying against a throw-away hash keeps a login for an unknown email as slow as a login with a
 * wrong password, so response time does not reveal which emails are registered.
 */
let dummyHash: Promise<string> | undefined;
export const burnPasswordCheck = async (password: string): Promise<void> => {
  dummyHash ??= hashPassword(randomBytes(16).toString('hex'));
  await verifyPassword(await dummyHash, password);
};

/** Refresh tokens are opaque random strings; only their SHA-256 is stored. */
export const generateRefreshToken = (): string => randomBytes(32).toString('base64url');
export const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

const ISSUER = 'itd-api';
const AUDIENCE = 'itd-web';

export interface AccessTokenClaims {
  userId: string;
}

export class AccessTokenSigner {
  private readonly key: Uint8Array;

  constructor(
    secret: string,
    private readonly ttlSeconds: number,
  ) {
    this.key = new TextEncoder().encode(secret);
  }

  async sign(claims: AccessTokenClaims, now = new Date()): Promise<{ token: string; expiresAt: Date }> {
    const expiresAt = new Date(now.getTime() + this.ttlSeconds * 1000);
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(claims.userId)
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt(Math.floor(now.getTime() / 1000))
      .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
      .sign(this.key);
    return { token, expiresAt };
  }

  /** Returns the claims of a valid token, or `null` for anything expired, forged or malformed. */
  async verify(token: string): Promise<AccessTokenClaims | null> {
    try {
      const { payload } = await jwtVerify(token, this.key, {
        issuer: ISSUER,
        audience: AUDIENCE,
        algorithms: ['HS256'],
      });
      return payload.sub ? { userId: payload.sub } : null;
    } catch {
      return null;
    }
  }
}
