import { sql } from 'drizzle-orm';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { assets } from '../src/db/schema';
import { makeCharacter, registerUser, useTestApp } from './helpers';

const ctx = useTestApp();

const png = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: { r: 120, g: 40, b: 30 } } }).png().toBuffer();

async function upload(app: Awaited<ReturnType<typeof ctx.app>>, auth: Record<string, string>, body: Buffer, type = 'image/png') {
  return app.inject({ method: 'POST', url: '/api/assets', headers: { ...auth, 'content-type': type }, payload: body });
}

describe('assets', () => {
  it('stores an upload as WebP, shrinking it to the size limit', async () => {
    const app = await ctx.app();
    const { auth } = await registerUser(app);

    const response = await upload(app, auth, await png(3000, 1500));

    expect(response.statusCode).toBe(201);
    const asset = response.json();
    expect(asset).toMatchObject({ width: 2048, height: 1024, url: `/api/assets/${asset.id}` });

    const served = await app.inject({ method: 'GET', url: asset.url });
    expect(served.statusCode).toBe(200);
    expect(served.headers['content-type']).toBe('image/webp');
    expect(served.headers['cache-control']).toContain('immutable');
    expect((await sharp(served.rawPayload).metadata()).format).toBe('webp');
  });

  it('keeps small images at their size', async () => {
    const app = await ctx.app();
    const { auth } = await registerUser(app);
    expect((await upload(app, auth, await png(300, 400))).json()).toMatchObject({ width: 300, height: 400 });
  });

  it('refuses files that are not images', async () => {
    const app = await ctx.app();
    const { auth } = await registerUser(app);
    const response = await upload(app, auth, Buffer.from('definitely not a png'));
    expect(response.statusCode).toBe(400);
  });

  it('refuses unsupported content types and anonymous uploads', async () => {
    const app = await ctx.app();
    const { auth } = await registerUser(app);
    const image = await png(10, 10);

    expect((await upload(app, auth, image, 'application/pdf')).statusCode).toBe(415);
    expect((await upload(app, {}, image)).statusCode).toBe(401);
  });

  it('returns 404 for unknown and malformed ids', async () => {
    const app = await ctx.app();
    expect((await app.inject({ method: 'GET', url: '/api/assets/7a1d0bb2-5f0b-4c55-9d1c-6c5f8e2a2f11' })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: '/api/assets/nope' })).statusCode).toBe(400);
  });

  it('collects old uploads no character refers to', async () => {
    const app = await ctx.app();
    const player = await registerUser(app);
    const used = (await upload(app, player.auth, await png(20, 20))).json().id;
    const orphan = (await upload(app, player.auth, await png(20, 20))).json().id;
    const fresh = (await upload(app, player.auth, await png(20, 20))).json().id;

    const hero = makeCharacter({ images: { portrait: used } });
    await app.inject({
      method: 'PUT',
      url: `/api/characters/${hero.id}`,
      headers: player.auth,
      payload: { baseRevision: null, data: hero },
    });
    await ctx.db.execute(sql`update ${assets} set created_at = now() - interval '2 days' where id <> ${fresh}`);

    expect(await ctx.services.assets.collectGarbage()).toBe(1);
    const left = await ctx.db.select({ id: assets.id }).from(assets);
    expect(left.map((a) => a.id).sort()).toEqual([used, fresh].sort());
    expect(left.some((a) => a.id === orphan)).toBe(false);
  });
});
