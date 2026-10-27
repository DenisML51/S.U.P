import type { CharacterRecordDto, PartyDto, SyncResponse, WsServerMessage } from '@itd/schema';
import { describe, expect, it } from 'vitest';
import type WebSocket from 'ws';
import { makeCharacter, registerUser, useTestApp } from './helpers';

/**
 * Races: many requests at once against the real database. Every outcome must be one of the answers
 * the API documents (never a 500), and the stored state must be what one serial order would give.
 */
const ctx = useTestApp();

type App = Awaited<ReturnType<typeof ctx.app>>;
type User = Awaited<ReturnType<typeof registerUser>>;

const call = (app: App, user: User, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, payload?: object) =>
  app.inject({ method, url: `/api${url}`, headers: user.auth, payload });

const statuses = (responses: { statusCode: number }[]) => responses.map((r) => r.statusCode).sort();
const count = (codes: number[], code: number) => codes.filter((c) => c === code).length;

async function openTable(app: App) {
  const master = await registerUser(app, 'Мастер');
  const created = await call(app, master, 'POST', '/parties', { name: 'Гонка', setting: 'elden-ring' });
  const partyId = created.json<{ id: string }>().id;
  await call(app, master, 'POST', `/parties/${partyId}/session`);
  const party = (await call(app, master, 'GET', `/parties/${partyId}`)).json<PartyDto>();
  return { master, partyId, code: party.inviteCode! };
}

async function seatWithHero(app: App, partyId: string, code: string, name: string) {
  const player = await registerUser(app, name);
  expect((await call(app, player, 'POST', `/invites/${code}/accept`)).statusCode).toBe(200);
  const hero = makeCharacter({ name });
  await call(app, player, 'PUT', `/characters/${hero.id}`, { baseRevision: null, data: hero });
  const added = await call(app, player, 'POST', `/parties/${partyId}/heroes`, { characterId: hero.id });
  expect(added.statusCode).toBe(201);
  return { player, hero, heroId: added.json<{ id: string }>().id };
}

describe('character writes under contention', () => {
  it('accepts exactly one of many writes based on the same revision', async () => {
    const app = await ctx.app();
    const user = await registerUser(app);
    const hero = makeCharacter();
    await call(app, user, 'PUT', `/characters/${hero.id}`, { baseRevision: null, data: hero });

    const responses = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        call(app, user, 'PUT', `/characters/${hero.id}`, { baseRevision: 1, data: { ...hero, name: `v${i}` } }),
      ),
    );
    const codes = statuses(responses);
    expect(count(codes, 200)).toBe(1);
    expect(count(codes, 409)).toBe(19);
    const stored = (await call(app, user, 'GET', `/characters/${hero.id}`)).json<CharacterRecordDto>();
    expect(stored.revision).toBe(2);
  });

  it('creates a new id once when several devices create it at the same moment', async () => {
    const app = await ctx.app();
    const user = await registerUser(app);
    const hero = makeCharacter();
    const responses = await Promise.all(
      Array.from({ length: 10 }, () => call(app, user, 'PUT', `/characters/${hero.id}`, { baseRevision: null, data: hero })),
    );
    const codes = statuses(responses);
    expect(count(codes, 200)).toBe(1);
    expect(count(codes, 409)).toBe(9);
  });

  it('never lets a pull cursor skip a change committed while it was reading', async () => {
    const app = await ctx.app();
    const user = await registerUser(app);
    const heroes = Array.from({ length: 30 }, () => makeCharacter());

    // Writers and a puller race; the puller follows cursors exactly like the client does.
    const seen = new Map<string, number>();
    let cursor = '0';
    let writing = true;
    const pull = async () => {
      const page = (await call(app, user, 'GET', `/characters?since=${cursor}`)).json<SyncResponse>();
      for (const item of page.items) seen.set(item.id, Math.max(seen.get(item.id) ?? 0, item.revision));
      cursor = page.cursor;
    };
    const puller = (async () => {
      while (writing) await pull();
    })();
    await Promise.all(
      heroes.map(async (hero) => {
        await call(app, user, 'PUT', `/characters/${hero.id}`, { baseRevision: null, data: hero });
        await call(app, user, 'PUT', `/characters/${hero.id}`, { baseRevision: 1, data: { ...hero, level: 2 } });
      }),
    );
    writing = false;
    await puller;
    await pull();

    expect(seen.size).toBe(heroes.length);
    for (const hero of heroes) expect(seen.get(hero.id)).toBe(2);
  });

  it('resolves an edit racing a deletion to one consistent record', async () => {
    const app = await ctx.app();
    const user = await registerUser(app);
    const hero = makeCharacter();
    await call(app, user, 'PUT', `/characters/${hero.id}`, { baseRevision: null, data: hero });
    const [edit, removal] = await Promise.all([
      call(app, user, 'PUT', `/characters/${hero.id}`, { baseRevision: 1, data: { ...hero, level: 3 } }),
      call(app, user, 'DELETE', `/characters/${hero.id}?baseRevision=1`),
    ]);
    expect(statuses([edit, removal])).toEqual([200, 409]);
    const stored = (await call(app, user, 'GET', `/characters/${hero.id}`)).json<CharacterRecordDto>();
    expect(stored.revision).toBe(2);
  });
});

describe('party tables under contention', () => {
  it('seats no more players than the table holds when many join at once', async () => {
    const app = await ctx.app();
    const { master, partyId, code } = await openTable(app);
    const players = await Promise.all(Array.from({ length: 10 }, (_, i) => registerUser(app, `p${i}`)));

    const responses = await Promise.all(players.map((player) => call(app, player, 'POST', `/invites/${code}/accept`)));
    const codes = statuses(responses);
    expect(count(codes, 200)).toBe(4);
    expect(count(codes, 409)).toBe(6);
    expect((await call(app, master, 'GET', `/parties/${partyId}`)).json<PartyDto>().members).toHaveLength(5);
  });

  it('seats one hero once even if it is brought to two tables at the same moment', async () => {
    const app = await ctx.app();
    const first = await openTable(app);
    const second = await openTable(app);
    const player = await registerUser(app);
    await call(app, player, 'POST', `/invites/${first.code}/accept`);
    await call(app, player, 'POST', `/invites/${second.code}/accept`);
    const hero = makeCharacter();
    await call(app, player, 'PUT', `/characters/${hero.id}`, { baseRevision: null, data: hero });

    const responses = await Promise.all(
      [first, second, first].map((table) =>
        call(app, player, 'POST', `/parties/${table.partyId}/heroes`, { characterId: hero.id }),
      ),
    );
    const codes = statuses(responses);
    expect(count(codes, 201)).toBe(1);
    expect(count(codes, 409)).toBe(2);
  });

  it('passes the turn once when the owner and the master click at the same time', async () => {
    const app = await ctx.app();
    const { master, partyId, code } = await openTable(app);
    const a = await seatWithHero(app, partyId, code, 'Альфа');
    const b = await seatWithHero(app, partyId, code, 'Бета');
    await call(app, master, 'POST', `/parties/${partyId}/combat`, { heroIds: [a.heroId, b.heroId], npcIds: [] });
    let party = (await call(app, master, 'GET', `/parties/${partyId}`)).json<PartyDto>();
    for (const [index, combatant] of party.combat!.combatants.entries()) {
      await call(app, master, 'PUT', `/parties/${partyId}/combat/combatants/${combatant.id}/initiative`, {
        value: 20 - index,
      });
    }
    await call(app, master, 'POST', `/parties/${partyId}/combat/begin`);
    party = (await call(app, master, 'GET', `/parties/${partyId}`)).json<PartyDto>();
    const from = party.combat!.currentCombatantId;
    const owner = party.combat!.combatants[0]!.refId === a.heroId ? a.player : b.player;

    const responses = await Promise.all([
      ...Array.from({ length: 5 }, () => call(app, owner, 'POST', `/parties/${partyId}/combat/next`, { from })),
      ...Array.from({ length: 5 }, () => call(app, master, 'POST', `/parties/${partyId}/combat/next`, { from })),
    ]);
    expect(new Set(statuses(responses))).toEqual(new Set([204]));
    party = (await call(app, master, 'GET', `/parties/${partyId}`)).json<PartyDto>();
    expect(party.combat!.round).toBe(1);
    expect(party.combat!.currentCombatantId).toBe(party.combat!.combatants[1]!.id);
  });

  it('keeps the fight consistent when a hero is deleted on its turn while turns are passed', async () => {
    const app = await ctx.app();
    const { master, partyId, code } = await openTable(app);
    const a = await seatWithHero(app, partyId, code, 'Альфа');
    const b = await seatWithHero(app, partyId, code, 'Бета');
    await call(app, master, 'POST', `/parties/${partyId}/combat`, { heroIds: [a.heroId, b.heroId], npcIds: [] });
    let party = (await call(app, master, 'GET', `/parties/${partyId}`)).json<PartyDto>();
    const combatantOf = (heroId: string) => party.combat!.combatants.find((c) => c.refId === heroId)!.id;
    await call(app, master, 'PUT', `/parties/${partyId}/combat/combatants/${combatantOf(a.heroId)}/initiative`, { value: 20 });
    await call(app, master, 'PUT', `/parties/${partyId}/combat/combatants/${combatantOf(b.heroId)}/initiative`, { value: 5 });
    await call(app, master, 'POST', `/parties/${partyId}/combat/begin`);
    const aTurn = combatantOf(a.heroId);

    const responses = await Promise.all([
      call(app, a.player, 'DELETE', `/characters/${a.hero.id}?baseRevision=1`),
      call(app, master, 'POST', `/parties/${partyId}/combat/next`, { from: aTurn }),
      call(app, master, 'GET', `/parties/${partyId}`),
    ]);
    expect(responses.every((r) => r.statusCode < 500)).toBe(true);

    // The deletion's party clean-up runs after its commit: wait for it.
    for (let i = 0; i < 50; i++) {
      party = (await call(app, master, 'GET', `/parties/${partyId}`)).json<PartyDto>();
      if (party.heroes.length === 1 && party.combat!.combatants.length === 1) break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    expect(party.heroes.map((h) => h.id)).toEqual([b.heroId]);
    expect(party.combat!.combatants.map((c) => c.refId)).toEqual([b.heroId]);
    expect(party.combat!.currentCombatantId).toBe(party.combat!.combatants[0]!.id);
  });

  it('answers every request with a documented status when the master closes the table mid-fight', async () => {
    const app = await ctx.app();
    const { master, partyId, code } = await openTable(app);
    const a = await seatWithHero(app, partyId, code, 'Альфа');
    await call(app, master, 'POST', `/parties/${partyId}/combat`, { heroIds: [a.heroId], npcIds: [] });
    const party = (await call(app, master, 'GET', `/parties/${partyId}`)).json<PartyDto>();
    const combatantId = party.combat!.combatants[0]!.id;

    const responses = await Promise.all([
      call(app, master, 'DELETE', `/parties/${partyId}/session`),
      call(app, a.player, 'PUT', `/parties/${partyId}/combat/combatants/${combatantId}/initiative`, { value: 12 }),
      call(app, master, 'POST', `/parties/${partyId}/combat/begin`),
      call(app, a.player, 'POST', `/parties/${partyId}/messages`, { body: 'в атаку', recipientId: null }),
      call(app, a.player, 'GET', `/parties/${partyId}`),
      call(app, master, 'DELETE', `/parties/${partyId}`),
      call(app, a.player, 'DELETE', `/parties/${partyId}/heroes/${a.heroId}`),
    ]);
    for (const response of responses) expect(response.statusCode, response.body).toBeLessThan(500);
  });
});

describe('sessions under contention', () => {
  it('lets tabs refresh with the same cookie at once without ending the session', async () => {
    const app = await ctx.app();
    const user = await registerUser(app);
    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        app.inject({ method: 'POST', url: '/api/auth/refresh', headers: { cookie: user.cookie, 'x-itd-client': 'web' } }),
      ),
    );
    expect(new Set(statuses(responses))).toEqual(new Set([200]));
  });

  it('does not keep a socket registered after it authenticated twice and closed', async () => {
    const app = await ctx.app();
    const user = await registerUser(app);
    const socket: WebSocket = await app.injectWS('/api/ws');
    const ready = new Promise<void>((resolve) =>
      socket.on('message', (raw) => (JSON.parse(raw.toString()) as WsServerMessage).type === 'ready' && resolve()),
    );
    const auth = JSON.stringify({ type: 'auth', token: user.accessToken });
    socket.send(auth);
    socket.send(auth);
    socket.send(auth);
    await ready;
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(ctx.services.hub.connectionCount).toBe(1);
    socket.terminate();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(ctx.services.hub.connectionCount).toBe(0);
  });

  it('does not register a socket that closed while its token was being checked', async () => {
    const app = await ctx.app();
    const user = await registerUser(app);
    const socket: WebSocket = await app.injectWS('/api/ws');
    socket.send(JSON.stringify({ type: 'auth', token: user.accessToken }));
    socket.terminate();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(ctx.services.hub.connectionCount).toBe(0);
  });
});

describe('presence at the table', () => {
  const online = async (app: App, viewer: User, partyId: string) =>
    Object.fromEntries(
      (await call(app, viewer, 'GET', `/parties/${partyId}`)).json<PartyDto>().members.map((m) => [m.displayName, m.online]),
    );
  const until = async (check: () => Promise<boolean>) => {
    for (let i = 0; i < 400; i++) {
      if (await check()) return;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error('condition not reached');
  };

  it('shows a member online while a socket of theirs is open, telling the table both ways', { timeout: 20_000 }, async () => {
    const app = await ctx.app();
    const { master, partyId, code } = await openTable(app);
    const player = await registerUser(app, 'Гость');
    await call(app, player, 'POST', `/invites/${code}/accept`);
    expect(await online(app, master, partyId)).toEqual({ Мастер: false, Гость: false });

    const masterSocket: WebSocket = await app.injectWS('/api/ws');
    const masterHeard: WsServerMessage[] = [];
    masterSocket.on('message', (raw) => masterHeard.push(JSON.parse(raw.toString()) as WsServerMessage));
    masterSocket.send(JSON.stringify({ type: 'auth', token: master.accessToken }));

    // Two tabs of the player: online with the first, still online until the last one closes.
    const tabs: WebSocket[] = [await app.injectWS('/api/ws'), await app.injectWS('/api/ws')];
    for (const tab of tabs) tab.send(JSON.stringify({ type: 'auth', token: player.accessToken }));
    await until(async () => (await online(app, master, partyId)).Гость === true);
    expect(masterHeard.some((m) => m.type === 'party.changed' && m.partyId === partyId)).toBe(true);

    tabs[0]!.terminate();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect((await online(app, master, partyId)).Гость).toBe(true);

    // A reload: gone and back within the grace period, the table sees nothing.
    tabs[1]!.terminate();
    await new Promise((resolve) => setTimeout(resolve, 100));
    masterHeard.length = 0;
    const again: WebSocket = await app.injectWS('/api/ws');
    again.send(JSON.stringify({ type: 'auth', token: player.accessToken }));
    await new Promise((resolve) => setTimeout(resolve, 6_000));
    expect((await online(app, master, partyId)).Гость).toBe(true);
    expect(masterHeard.some((m) => m.type === 'party.changed')).toBe(false);

    again.terminate();
    await until(async () => (await online(app, master, partyId)).Гость === false);
    await until(async () => masterHeard.some((m) => m.type === 'party.changed'));
    masterSocket.terminate();
  });
});
