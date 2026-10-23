import type { WsServerMessage } from '@itd/schema';
import { describe, expect, it } from 'vitest';
import type WebSocket from 'ws';
import { createServices } from '../src/app';
import { connectDatabase } from '../src/db/client';
import { TEST_DATABASE_URL } from './env';
import { makeCharacter, registerUser, testConfig, useTestApp } from './helpers';

const ctx = useTestApp();

/** Collects server messages and lets a test wait for the next one matching a predicate. */
function listen(socket: WebSocket) {
  const received: WsServerMessage[] = [];
  const waiters: { match: (m: WsServerMessage) => boolean; resolve: (m: WsServerMessage) => void }[] = [];
  socket.on('message', (raw) => {
    const message = JSON.parse(raw.toString()) as WsServerMessage;
    received.push(message);
    for (const waiter of [...waiters]) {
      if (waiter.match(message)) {
        waiters.splice(waiters.indexOf(waiter), 1);
        waiter.resolve(message);
      }
    }
  });
  const next = (match: (m: WsServerMessage) => boolean) =>
    new Promise<WsServerMessage>((resolve, reject) => {
      const found = received.find(match);
      if (found) return resolve(found);
      waiters.push({ match, resolve });
      setTimeout(() => reject(new Error('timed out waiting for a message')), 3_000);
    });
  const closed = new Promise<number>((resolve) => socket.on('close', (code) => resolve(code)));
  return { next, closed, received };
}

describe('realtime notifications', () => {
  it('authenticates with the first message and announces changes to the owner only', async () => {
    const app = await ctx.app();
    const owner = await registerUser(app);
    const stranger = await registerUser(app, 'Чужой');

    const ownerSocket = await app.injectWS('/api/ws');
    const strangerSocket = await app.injectWS('/api/ws');
    const ownerMessages = listen(ownerSocket);
    const strangerMessages = listen(strangerSocket);
    ownerSocket.send(JSON.stringify({ type: 'auth', token: owner.accessToken }));
    strangerSocket.send(JSON.stringify({ type: 'auth', token: stranger.accessToken }));
    await ownerMessages.next((m) => m.type === 'ready');
    await strangerMessages.next((m) => m.type === 'ready');

    const hero = makeCharacter();
    await app.inject({
      method: 'PUT',
      url: `/api/characters/${hero.id}`,
      headers: { ...owner.auth, 'x-client-session': 'tab-1' },
      payload: { baseRevision: null, data: hero },
    });

    const change = await ownerMessages.next((m) => m.type === 'characters.changed');
    expect(change).toEqual({ type: 'characters.changed', cursor: '1', originSessionId: 'tab-1' });
    expect(strangerMessages.received.some((m) => m.type === 'characters.changed')).toBe(false);

    ownerSocket.terminate();
    strangerSocket.terminate();
  });

  it('delivers changes written by another process, such as the CLI', async () => {
    const app = await ctx.app();
    const player = await registerUser(app);
    const socket = await app.injectWS('/api/ws');
    const messages = listen(socket);
    socket.send(JSON.stringify({ type: 'auth', token: player.accessToken }));
    await messages.next((m) => m.type === 'ready');

    const otherProcess = connectDatabase(TEST_DATABASE_URL, 1);
    try {
      const { characters } = createServices(testConfig(), otherProcess);
      const hero = makeCharacter();
      await characters.put(player.user.id, hero.id, { baseRevision: null, data: hero }, null);

      expect(await messages.next((m) => m.type === 'characters.changed')).toMatchObject({ originSessionId: null });
    } finally {
      await otherProcess.close();
      socket.terminate();
    }
  });

  it('answers pings', async () => {
    const app = await ctx.app();
    const socket = await app.injectWS('/api/ws');
    const messages = listen(socket);

    socket.send(JSON.stringify({ type: 'ping' }));

    expect(await messages.next((m) => m.type === 'pong')).toEqual({ type: 'pong' });
    socket.terminate();
  });

  it('closes the socket for an invalid token', async () => {
    const app = await ctx.app();
    const socket = await app.injectWS('/api/ws');
    const messages = listen(socket);

    socket.send(JSON.stringify({ type: 'auth', token: 'forged' }));

    expect(await messages.closed).toBe(4001);
  });

  it('disconnects devices after a password change', async () => {
    const app = await ctx.app();
    const player = await registerUser(app);
    const socket = await app.injectWS('/api/ws');
    const messages = listen(socket);
    socket.send(JSON.stringify({ type: 'auth', token: player.accessToken }));
    await messages.next((m) => m.type === 'ready');

    await app.inject({
      method: 'POST',
      url: '/api/me/password',
      headers: player.auth,
      payload: { currentPassword: player.password, newPassword: 'a-whole-new-password' },
    });

    expect(await messages.closed).toBe(4001);
  });
});
