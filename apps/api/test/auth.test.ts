import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { refreshTokens } from '../src/db/schema';
import { CLIENT_HEADERS, refreshCookie, registerUser, useTestApp } from './helpers';

const ctx = useTestApp();

describe('registration', () => {
  it('creates an account and starts a session', async () => {
    const app = await ctx.app();
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: '  Gregor@Example.com ', password: 'inquisition-42', displayName: 'Грегор' },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.user).toMatchObject({ email: 'gregor@example.com', displayName: 'Грегор' });
    expect(body.accessToken).toEqual(expect.any(String));

    const cookie = response.cookies.find((c) => c.name === 'itd_refresh')!;
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'Strict', path: '/api/auth' });
  });

  it('rejects a taken email regardless of case', async () => {
    const app = await ctx.app();
    const { email } = await registerUser(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: email.toUpperCase(), password: 'another-password', displayName: 'Двойник' },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error).toBe('email_taken');
  });

  it.each([
    ['a short password', { email: 'a@b.cd', password: 'short', displayName: 'X' }],
    ['a broken email', { email: 'not-an-email', password: 'long-enough-pass', displayName: 'X' }],
    ['an empty name', { email: 'a@b.cd', password: 'long-enough-pass', displayName: '   ' }],
  ])('validates %s', async (_, payload) => {
    const app = await ctx.app();
    const response = await app.inject({ method: 'POST', url: '/api/auth/register', payload });
    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe('validation_error');
  });
});

describe('login', () => {
  it('signs in with the right password', async () => {
    const app = await ctx.app();
    const { email, password } = await registerUser(app);

    const response = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email, password } });

    expect(response.statusCode).toBe(200);
    expect(refreshCookie(response)).toBeDefined();
  });

  it('gives the same answer for a wrong password and an unknown email', async () => {
    const app = await ctx.app();
    const { email } = await registerUser(app);

    const wrong = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email, password: 'nope-nope' } });
    const unknown = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'ghost@example.com', password: 'nope-nope' },
    });

    expect(wrong.statusCode).toBe(401);
    expect(unknown.statusCode).toBe(401);
    expect(wrong.json()).toEqual(unknown.json());
  });
});

describe('access tokens', () => {
  it('protects account routes', async () => {
    const app = await ctx.app();
    expect((await app.inject({ method: 'GET', url: '/api/me' })).statusCode).toBe(401);
    expect(
      (await app.inject({ method: 'GET', url: '/api/me', headers: { authorization: 'Bearer forged.token.value' } }))
        .statusCode,
    ).toBe(401);
  });

  it('returns and updates the profile', async () => {
    const app = await ctx.app();
    const { auth, email } = await registerUser(app);

    const me = await app.inject({ method: 'GET', url: '/api/me', headers: auth });
    expect(me.json()).toMatchObject({ email, displayName: 'Игрок' });

    const renamed = await app.inject({ method: 'PATCH', url: '/api/me', headers: auth, payload: { displayName: 'Мастер' } });
    expect(renamed.json().displayName).toBe('Мастер');
  });
});

describe('refresh tokens', () => {
  it('requires the client header', async () => {
    const app = await ctx.app();
    const { cookie } = await registerUser(app);
    const response = await app.inject({ method: 'POST', url: '/api/auth/refresh', headers: { cookie } });
    expect(response.statusCode).toBe(403);
  });

  it('rotates the refresh token', async () => {
    const app = await ctx.app();
    const { cookie } = await registerUser(app);

    const response = await app.inject({ method: 'POST', url: '/api/auth/refresh', headers: { cookie, ...CLIENT_HEADERS } });

    expect(response.statusCode).toBe(200);
    expect(response.json().accessToken).toEqual(expect.any(String));
    expect(refreshCookie(response)).not.toBe(cookie);
  });

  it('tolerates two tabs refreshing with the same token at once', async () => {
    const app = await ctx.app();
    const { cookie } = await registerUser(app);
    const refresh = () => app.inject({ method: 'POST', url: '/api/auth/refresh', headers: { cookie, ...CLIENT_HEADERS } });

    const [first, second] = await Promise.all([refresh(), refresh()]);

    expect([first.statusCode, second.statusCode]).toEqual([200, 200]);
  });

  it('treats a replayed old token as theft and ends the whole session family', async () => {
    const app = await ctx.app();
    const { cookie } = await registerUser(app);
    const rotated = await app.inject({ method: 'POST', url: '/api/auth/refresh', headers: { cookie, ...CLIENT_HEADERS } });
    const fresh = refreshCookie(rotated)!;
    // Move the rotation out of the concurrency grace window.
    await ctx.db.execute(sql`update ${refreshTokens} set revoked_at = now() - interval '1 hour' where revoked_at is not null`);

    const replay = await app.inject({ method: 'POST', url: '/api/auth/refresh', headers: { cookie, ...CLIENT_HEADERS } });
    const afterReplay = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: { cookie: fresh, ...CLIENT_HEADERS },
    });

    expect(replay.statusCode).toBe(401);
    expect(afterReplay.statusCode).toBe(401);
  });

  it('logout ends the session', async () => {
    const app = await ctx.app();
    const { cookie } = await registerUser(app);

    const logout = await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie, ...CLIENT_HEADERS } });
    const refresh = await app.inject({ method: 'POST', url: '/api/auth/refresh', headers: { cookie, ...CLIENT_HEADERS } });

    expect(logout.statusCode).toBe(204);
    expect(refresh.statusCode).toBe(401);
  });
});

describe('password change', () => {
  it('requires the current password and signs out other sessions', async () => {
    const app = await ctx.app();
    const { auth, email, cookie: otherDevice } = await registerUser(app);

    const wrong = await app.inject({
      method: 'POST',
      url: '/api/me/password',
      headers: auth,
      payload: { currentPassword: 'wrong-password', newPassword: 'brand-new-password' },
    });
    expect(wrong.statusCode).toBe(400);

    const changed = await app.inject({
      method: 'POST',
      url: '/api/me/password',
      headers: auth,
      payload: { currentPassword: 'correct horse battery', newPassword: 'brand-new-password' },
    });
    expect(changed.statusCode).toBe(200);
    expect(refreshCookie(changed)).toBeDefined();

    const stale = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: { cookie: otherDevice, ...CLIENT_HEADERS },
    });
    expect(stale.statusCode).toBe(401);

    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password: 'brand-new-password' },
    });
    expect(login.statusCode).toBe(200);
  });
});

describe('closed registration', () => {
  const closed = useTestApp({ REGISTRATION_ENABLED: 'false' });

  it('refuses self-service sign-up but allows accounts created by an administrator', async () => {
    const app = await closed.app();
    const config = await app.inject({ method: 'GET', url: '/api/auth/config' });
    expect(config.json()).toEqual({ registrationEnabled: false });

    const signup = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'new@example.com', password: 'long-enough-pass', displayName: 'Новичок' },
    });
    expect(signup.statusCode).toBe(403);

    await closed.services.auth.createUser({ email: 'new@example.com', password: 'long-enough-pass', displayName: 'Новичок' });
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'new@example.com', password: 'long-enough-pass' },
    });
    expect(login.statusCode).toBe(200);
  });
});

describe('rate limiting', () => {
  const limited = useTestApp({ RATE_LIMIT_ENABLED: 'true' });

  it('throttles repeated login attempts', async () => {
    const app = await limited.app();
    const attempt = () =>
      app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'x@example.com', password: 'whatever-1' } });

    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) statuses.push((await attempt()).statusCode);

    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});

describe('rate limiting behind the web proxy', () => {
  // nginx appends the address it sees to whatever X-Forwarded-For the client sent.
  const proxied = useTestApp({ RATE_LIMIT_ENABLED: 'true', TRUST_PROXY: '1' });

  it('keys on the address the proxy saw, not on one the client made up', async () => {
    const app = await proxied.app();
    const attempt = (i: number) =>
      app.inject({
        method: 'POST',
        url: '/api/auth/login',
        headers: { 'x-forwarded-for': `203.0.113.${i}, 198.51.100.7` },
        payload: { email: 'x@example.com', password: 'whatever-1' },
      });

    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) statuses.push((await attempt(i)).statusCode);

    expect(statuses[10]).toBe(429);
  });
});

describe('security headers', () => {
  const plain = useTestApp();

  it('forbid anything the API sends from running or being framed', async () => {
    const app = await plain.app();
    const response = await app.inject({ method: 'GET', url: '/api/health' });

    expect(response.headers['content-security-policy']).toBe("default-src 'none';frame-ancestors 'none'");
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });
});
