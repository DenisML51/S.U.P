import type { CharacterRecordDto, SyncResponse } from '@itd/schema';
import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { characterRevisions } from '../src/db/schema';
import { makeCharacter, registerUser, useTestApp } from './helpers';

const ctx = useTestApp();

type Player = Awaited<ReturnType<typeof registerUser>>;

async function setup() {
  const app = await ctx.app();
  const player = await registerUser(app);

  const put = (id: string, data: unknown, baseRevision: number | null, who: Player = player) =>
    app.inject({ method: 'PUT', url: `/api/characters/${id}`, headers: who.auth, payload: { baseRevision, data } });
  const get = (id: string, who: Player = player) =>
    app.inject({ method: 'GET', url: `/api/characters/${id}`, headers: who.auth });
  const pull = async (since = '0', who: Player = player) =>
    (await app.inject({ method: 'GET', url: `/api/characters?since=${since}`, headers: who.auth })).json<SyncResponse>();
  const remove = (id: string, baseRevision: number) =>
    app.inject({ method: 'DELETE', url: `/api/characters/${id}?baseRevision=${baseRevision}`, headers: player.auth });

  return { app, player, put, get, pull, remove };
}

describe('saving characters', () => {
  it('creates a character at revision 1 and reads it back', async () => {
    const { put, get } = await setup();
    const hero = makeCharacter();

    const created = await put(hero.id, hero, null);
    expect(created.statusCode).toBe(200);
    expect(created.json()).toMatchObject({ id: hero.id, revision: 1, deletedAt: null });

    const read = (await get(hero.id)).json<CharacterRecordDto>();
    expect(read.data).toEqual(hero);
  });

  it('stores the normalised document', async () => {
    const { put, get } = await setup();
    const hero = makeCharacter();

    await put(hero.id, { ...hero, currentHP: '7', meta: { source: 'homebrew' } }, null);

    const data = (await get(hero.id)).json<CharacterRecordDto>().data as Record<string, unknown>;
    expect(data.currentHP).toBe(7);
    expect(data.meta).toEqual({ source: 'homebrew' });
  });

  it('advances the revision on every update', async () => {
    const { put } = await setup();
    const hero = makeCharacter();
    await put(hero.id, hero, null);

    const updated = await put(hero.id, { ...hero, currentHP: 3 }, 1);

    expect(updated.json()).toMatchObject({ revision: 2, data: { currentHP: 3 } });
  });

  it('rejects a write based on a stale revision and returns the current record', async () => {
    const { put } = await setup();
    const hero = makeCharacter();
    await put(hero.id, hero, null);
    await put(hero.id, { ...hero, currentHP: 3 }, 1);

    const stale = await put(hero.id, { ...hero, currentHP: 9 }, 1);

    expect(stale.statusCode).toBe(409);
    expect(stale.json()).toMatchObject({ error: 'conflict', current: { revision: 2, data: { currentHP: 3 } } });
  });

  it('rejects "create" for an id that already exists', async () => {
    const { put } = await setup();
    const hero = makeCharacter();
    await put(hero.id, hero, null);

    expect((await put(hero.id, hero, null)).statusCode).toBe(409);
  });

  it('lets exactly one of several concurrent writers win', async () => {
    const { put } = await setup();
    const hero = makeCharacter();
    await put(hero.id, hero, null);

    const results = await Promise.all([1, 2, 3, 4, 5].map((hp) => put(hero.id, { ...hero, currentHP: hp }, 1)));

    expect(results.map((r) => r.statusCode).sort()).toEqual([200, 409, 409, 409, 409]);
  });

  it.each([
    ['an invalid document', (hero: ReturnType<typeof makeCharacter>) => ({ ...hero, level: 'max' })],
    ['an id that does not match the URL', (hero: ReturnType<typeof makeCharacter>) => ({ ...hero, id: 'other' })],
    ['an unsupported schema version', (hero: ReturnType<typeof makeCharacter>) => ({ ...hero, schemaVersion: 0 })],
  ])('refuses %s', async (_, mutate) => {
    const { put } = await setup();
    const hero = makeCharacter();

    const response = await put(hero.id, mutate(hero), null);

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe('validation_error');
  });

  it('refuses ids that are not URL-safe', async () => {
    const { put } = await setup();
    expect((await put('bad%20id', makeCharacter(), null)).statusCode).toBe(400);
  });

  it('refuses oversized payloads', async () => {
    const { put } = await setup();
    const hero = makeCharacter();
    expect((await put(hero.id, { ...hero, avatar: 'x'.repeat(7 * 1024 * 1024) }, null)).statusCode).toBe(413);
  });
});

describe('isolation between accounts', () => {
  it('keeps characters private and lets ids repeat across accounts', async () => {
    const { app, put, get, pull } = await setup();
    const stranger = await registerUser(app, 'Чужой');
    const hero = makeCharacter();
    await put(hero.id, hero, null);

    expect((await get(hero.id, stranger)).statusCode).toBe(404);
    expect((await pull('0', stranger)).items).toEqual([]);
    expect((await put(hero.id, { ...hero, name: 'Двойник' }, null, stranger)).statusCode).toBe(200);
    expect((await get(hero.id)).json().data.name).toBe('Эйзенхорн');
  });
});

describe('sync', () => {
  it('pulls every change after a cursor, in order', async () => {
    const { put, pull } = await setup();
    const a = makeCharacter({ name: 'Первый' });
    const b = makeCharacter({ name: 'Второй' });
    await put(a.id, a, null);

    const first = await pull();
    expect(first.items.map((i) => i.id)).toEqual([a.id]);
    expect(first.hasMore).toBe(false);

    await put(b.id, b, null);
    await put(a.id, { ...a, currentHP: 1 }, 1);

    const second = await pull(first.cursor);
    expect(second.items.map((i) => [i.id, i.revision])).toEqual([
      [b.id, 1],
      [a.id, 2],
    ]);

    expect((await pull(second.cursor)).items).toEqual([]);
    expect((await pull(second.cursor)).cursor).toBe(second.cursor);
  });

  it('reports deletions as tombstones without data', async () => {
    const { put, pull, remove } = await setup();
    const hero = makeCharacter();
    await put(hero.id, hero, null);
    const { cursor } = await pull();

    await remove(hero.id, 1);

    const changes = await pull(cursor);
    expect(changes.items).toEqual([expect.objectContaining({ id: hero.id, revision: 2, data: null, deletedAt: expect.any(String) })]);
  });

  it('rejects a malformed cursor', async () => {
    const { app, player } = await setup();
    const response = await app.inject({ method: 'GET', url: '/api/characters?since=abc', headers: player.auth });
    expect(response.statusCode).toBe(400);
  });
});

describe('trash', () => {
  it('deletes with optimistic concurrency, idempotently', async () => {
    const { put, remove } = await setup();
    const hero = makeCharacter();
    await put(hero.id, hero, null);
    await put(hero.id, { ...hero, currentHP: 2 }, 1);

    expect((await remove(hero.id, 1)).statusCode).toBe(409);
    expect((await remove(hero.id, 2)).json()).toMatchObject({ revision: 3, data: null });
    expect((await remove(hero.id, 2)).json()).toMatchObject({ revision: 3 });
  });

  it('lists deleted characters and restores them', async () => {
    const { app, player, put, remove, get } = await setup();
    const hero = makeCharacter({ name: 'Лиара', level: 18 });
    await put(hero.id, hero, null);
    await remove(hero.id, 1);

    const trash = await app.inject({ method: 'GET', url: '/api/characters/deleted', headers: player.auth });
    expect(trash.json()).toEqual([expect.objectContaining({ id: hero.id, name: 'Лиара', level: 18, revision: 2 })]);

    const restored = await app.inject({ method: 'POST', url: `/api/characters/${hero.id}/restore`, headers: player.auth });
    expect(restored.json()).toMatchObject({ revision: 3, deletedAt: null, data: { name: 'Лиара' } });
    expect((await get(hero.id)).json().deletedAt).toBeNull();
  });

  it('an edit made elsewhere brings a deleted character back', async () => {
    const { put, remove } = await setup();
    const hero = makeCharacter();
    await put(hero.id, hero, null);
    await remove(hero.id, 1);

    const edited = await put(hero.id, { ...hero, currentHP: 4 }, 2);

    expect(edited.json()).toMatchObject({ revision: 3, deletedAt: null, data: { currentHP: 4 } });
  });

  it('returns 404 for unknown characters', async () => {
    const { remove, get } = await setup();
    expect((await get('nobody')).statusCode).toBe(404);
    expect((await remove('nobody', 1)).statusCode).toBe(404);
  });
});

describe('revisions', () => {
  it('keeps restore points and serves old versions', async () => {
    const { app, player, put } = await setup();
    const hero = makeCharacter();
    await put(hero.id, hero, null);
    // Age the first snapshot so the next write takes a new one.
    await ctx.db.execute(sql`update ${characterRevisions} set saved_at = now() - interval '1 hour'`);
    await put(hero.id, { ...hero, name: 'Эйзенхорн, Инквизитор', level: 7 }, 1);
    await put(hero.id, { ...hero, name: 'Сразу же снова' }, 2);

    const list = await app.inject({ method: 'GET', url: `/api/characters/${hero.id}/revisions`, headers: player.auth });
    expect(list.json()).toEqual([
      expect.objectContaining({ revision: 2, name: 'Эйзенхорн, Инквизитор', level: 7 }),
      expect.objectContaining({ revision: 1, name: 'Эйзенхорн', level: 1 }),
    ]);

    const old = await app.inject({ method: 'GET', url: `/api/characters/${hero.id}/revisions/1`, headers: player.auth });
    expect(old.json()).toMatchObject({ revision: 1, data: hero });

    const missing = await app.inject({ method: 'GET', url: `/api/characters/${hero.id}/revisions/99`, headers: player.auth });
    expect(missing.statusCode).toBe(404);
  });
});
