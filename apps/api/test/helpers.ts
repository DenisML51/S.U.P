import { CharacterSchema, type AuthResponse, type Character } from '@itd/schema';
import { sql } from 'drizzle-orm';
import type { LightMyRequestResponse } from 'fastify';
import { afterAll, beforeEach } from 'vitest';
import { buildApp, createServices } from '../src/app';
import { loadConfig } from '../src/config';
import { connectDatabase } from '../src/db/client';
import { TEST_DATABASE_URL } from './env';

export const CLIENT_HEADERS = { 'x-itd-client': 'web' };

export const testConfig = (overrides: Record<string, string> = {}) =>
  loadConfig({
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    RATE_LIMIT_ENABLED: 'false',
    DATABASE_URL: TEST_DATABASE_URL,
    JWT_SECRET: 'test-secret-test-secret-test-secret-test-secret',
    ...overrides,
  });

/**
 * Boots the app against the test database once per file and wipes all tables before each test.
 */
export function useTestApp(overrides: Record<string, string> = {}) {
  const connection = connectDatabase(TEST_DATABASE_URL, 4);
  const config = testConfig(overrides);
  const services = createServices(config, connection);
  const appPromise = buildApp(config, connection, services);

  beforeEach(async () => {
    await connection.db.execute(sql`truncate table users, refresh_tokens, characters, character_revisions, assets, parties cascade`);
  });

  afterAll(async () => {
    await (await appPromise).close();
    await connection.close();
  });

  return {
    app: () => appPromise,
    db: connection.db,
    services,
  };
}

/** Value of the refresh cookie set by a response, as `name=value` for a Cookie header. */
export const refreshCookie = (response: LightMyRequestResponse): string | undefined => {
  const cookie = response.cookies.find((c) => c.name === 'itd_refresh');
  return cookie && cookie.value ? `itd_refresh=${cookie.value}` : undefined;
};

let userCounter = 0;

export async function registerUser(app: Awaited<ReturnType<ReturnType<typeof useTestApp>['app']>>, name = 'Игрок') {
  const email = `player${++userCounter}@example.com`;
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password: 'correct horse battery', displayName: name },
  });
  if (response.statusCode !== 201) throw new Error(`register failed: ${response.body}`);
  const body = response.json<AuthResponse>();
  return {
    email,
    password: 'correct horse battery',
    user: body.user,
    accessToken: body.accessToken,
    cookie: refreshCookie(response)!,
    auth: { authorization: `Bearer ${body.accessToken}` },
  };
}

let characterCounter = 0;

export const makeCharacter = (overrides: Partial<Character> = {}): Character =>
  CharacterSchema.parse({
    schemaVersion: 1,
    id: `hero_${++characterCounter}`,
    name: 'Эйзенхорн',
    attributes: { strength: 10, dexterity: 12, constitution: 14, intelligence: 16, wisdom: 15, charisma: 13 },
    ...overrides,
  });
