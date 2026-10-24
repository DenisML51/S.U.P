import type { PartyDto, PartyListItemDto, WsServerMessage } from '@itd/schema';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { characters } from '../src/db/schema';
import { nextTurn, turnOrder } from '../src/modules/parties/turnOrder';
import { makeCharacter, registerUser, useTestApp } from './helpers';

const ctx = useTestApp();

type App = Awaited<ReturnType<typeof ctx.app>>;
type User = Awaited<ReturnType<typeof registerUser>>;

const call = (app: App, user: User, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, payload?: object) =>
  app.inject({ method, url: `/api${url}`, headers: user.auth, payload });

async function saveHero(app: App, user: User, overrides: Parameters<typeof makeCharacter>[0] = {}, baseRevision: number | null = null) {
  const hero = makeCharacter(overrides);
  const response = await call(app, user, 'PUT', `/characters/${hero.id}`, { baseRevision, data: hero });
  expect(response.statusCode).toBe(200);
  return hero;
}

const view = async (app: App, user: User, partyId: string) => {
  const response = await call(app, user, 'GET', `/parties/${partyId}`);
  expect(response.statusCode).toBe(200);
  return response.json<PartyDto>();
};

/** A master's table with one player seated and one hero each. */
async function table(app: App) {
  const master = await registerUser(app, 'Мастер');
  const player = await registerUser(app, 'Игрок');
  const created = await call(app, master, 'POST', '/parties', { name: 'Тени Ульдуара', setting: 'dark-fantasy' });
  expect(created.statusCode).toBe(201);
  const partyId = created.json<{ id: string }>().id;
  const code = (await view(app, master, partyId)).inviteCode!;

  const lowered = `${code.slice(0, 4)}-${code.slice(4)}`.toLowerCase();
  const joined = await call(app, player, 'POST', `/invites/${lowered}/accept`);
  expect(joined.statusCode).toBe(200);

  const masterHero = await saveHero(app, master, { name: 'Страж', currentHP: 30, maxHP: 30 });
  const playerHero = await saveHero(app, player, { name: 'Охотник', currentHP: 18, maxHP: 22 });
  expect((await call(app, master, 'POST', `/parties/${partyId}/heroes`, { characterId: masterHero.id })).statusCode).toBe(201);
  expect((await call(app, player, 'POST', `/parties/${partyId}/heroes`, { characterId: playerHero.id })).statusCode).toBe(201);
  return { master, player, partyId, code, masterHero, playerHero };
}

describe('turn order', () => {
  const at = (n: number) => new Date(2026, 0, 1, 0, 0, n);
  const entries = [
    { id: 'a', initiative: 12, bonus: 1, joinedAt: at(1) },
    { id: 'b', initiative: null, bonus: 5, joinedAt: at(2) },
    { id: 'c', initiative: 12, bonus: 3, joinedAt: at(3) },
    { id: 'd', initiative: 20, bonus: 0, joinedAt: at(4) },
  ];

  it('puts the highest roll first, breaks ties by modifier and keeps the unrolled last', () => {
    expect(turnOrder(entries).map((e) => e.id)).toEqual(['d', 'c', 'a', 'b']);
  });

  it('passes the turn on, starting a new round after the last one', () => {
    expect(nextTurn(entries, 'c')).toMatchObject({ next: { id: 'a' }, wrapped: false });
    expect(nextTurn(entries, 'b')).toMatchObject({ next: { id: 'd' }, wrapped: true });
    expect(nextTurn(entries, 'c', new Set(['a', 'b']))).toMatchObject({ next: { id: 'd' }, wrapped: true });
    expect(nextTurn(entries, 'a', new Set(['a', 'b', 'c', 'd']))).toBeNull();
  });
});

describe('parties', () => {
  it('seats a player by invite code and shows each member only what they may see', async () => {
    const app = await ctx.app();
    const { master, player, partyId, masterHero, playerHero } = await table(app);

    const asMaster = await view(app, master, partyId);
    expect(asMaster.role).toBe('master');
    expect(asMaster.members.map((m) => [m.displayName, m.role])).toEqual([
      ['Мастер', 'master'],
      ['Игрок', 'player'],
    ]);
    expect(asMaster.heroes.every((hero) => hero.vitals !== null)).toBe(true);
    expect(asMaster.heroes.find((h) => h.characterId === playerHero.id)?.vitals).toMatchObject({ currentHP: 18, maxHP: 22 });

    const asPlayer = await view(app, player, partyId);
    expect(asPlayer.role).toBe('player');
    expect(asPlayer.inviteCode).toBeNull();
    expect(asPlayer.npcs).toBeNull();
    expect(asPlayer.heroes.find((h) => h.characterId === masterHero.id)?.vitals).toBeNull();
    expect(asPlayer.heroes.find((h) => h.characterId === playerHero.id)?.vitals).not.toBeNull();

    const list = (await call(app, player, 'GET', '/parties')).json<PartyListItemDto[]>();
    expect(list).toMatchObject([{ id: partyId, role: 'player', masterName: 'Мастер', memberCount: 2, heroCount: 2 }]);
    expect(list[0]!.myCharacterIds).toEqual([playerHero.id]);
  });

  it('hides a party from strangers and stale codes', async () => {
    const app = await ctx.app();
    const { master, partyId, code } = await table(app);
    const stranger = await registerUser(app, 'Чужак');

    expect((await call(app, stranger, 'GET', `/parties/${partyId}`)).statusCode).toBe(404);
    expect((await call(app, stranger, 'GET', `/invites/${code}`)).json()).toMatchObject({ name: 'Тени Ульдуара', member: false });

    expect((await call(app, master, 'POST', `/parties/${partyId}/invite`)).statusCode).toBe(204);
    expect((await call(app, stranger, 'POST', `/invites/${code}/accept`)).statusCode).toBe(404);
    expect((await call(app, stranger, 'GET', '/invites/not-a-code')).statusCode).toBe(400);
  });

  it('lets a player bring one hero, and a hero sit at one table', async () => {
    const app = await ctx.app();
    const { master, player, partyId, playerHero } = await table(app);

    const second = await saveHero(app, player, { name: 'Второй' });
    const tooMany = await call(app, player, 'POST', `/parties/${partyId}/heroes`, { characterId: second.id });
    expect(tooMany.statusCode).toBe(409);

    const other = (await call(app, player, 'POST', '/parties', { name: 'Своя', setting: 'sci-fi' })).json<{ id: string }>();
    const taken = await call(app, player, 'POST', `/parties/${other.id}/heroes`, { characterId: playerHero.id });
    expect(taken.statusCode).toBe(409);

    // Nobody brings someone else's character.
    expect((await call(app, master, 'POST', `/parties/${partyId}/heroes`, { characterId: playerHero.id })).statusCode).toBe(404);
  });

  it('keeps NPCs to the master', async () => {
    const app = await ctx.app();
    const { master, player, partyId } = await table(app);

    const npc = { name: 'Гуль', maxHP: 22, armorClass: 13, initiativeBonus: 2 };
    expect((await call(app, player, 'POST', `/parties/${partyId}/npcs`, npc)).statusCode).toBe(403);
    const created = await call(app, master, 'POST', `/parties/${partyId}/npcs`, npc);
    expect(created.statusCode).toBe(201);
    const npcId = created.json<{ id: string }>().id;

    expect((await call(app, master, 'PATCH', `/parties/${partyId}/npcs/${npcId}`, { currentHP: 9 })).statusCode).toBe(204);
    expect((await view(app, master, partyId)).npcs).toMatchObject([{ name: 'Гуль', currentHP: 9, maxHP: 22, armorClass: 13 }]);
  });

  it('runs a fight: initiative, turn order, turns passed once', async () => {
    const app = await ctx.app();
    const { master, player, partyId } = await table(app);
    const npcId = (
      await call(app, master, 'POST', `/parties/${partyId}/npcs`, { name: 'Гуль', maxHP: 22, armorClass: 13, initiativeBonus: 2 })
    ).json<{ id: string }>().id;
    const heroIds = (await view(app, master, partyId)).heroes.map((hero) => hero.id);

    expect((await call(app, player, 'POST', `/parties/${partyId}/combat`, { heroIds, npcIds: [npcId] })).statusCode).toBe(403);
    expect((await call(app, master, 'POST', `/parties/${partyId}/combat`, { heroIds, npcIds: [npcId] })).statusCode).toBe(204);
    expect((await call(app, master, 'POST', `/parties/${partyId}/combat`, { heroIds })).statusCode).toBe(409);

    const fight = (await view(app, player, partyId)).combat!;
    expect(fight.phase).toBe('initiative');
    const mine = fight.combatants.find((c) => c.controlled)!;
    const npc = fight.combatants.find((c) => c.kind === 'npc')!;
    const masters = fight.combatants.find((c) => c.kind === 'hero' && !c.controlled)!;
    expect(npc.vitals).toBeNull();

    const roll = (user: User, id: string, value: number) =>
      call(app, user, 'PUT', `/parties/${partyId}/combat/combatants/${id}/initiative`, { value });
    expect((await roll(player, npc.id, 20)).statusCode).toBe(403);
    expect((await roll(player, mine.id, 15)).statusCode).toBe(204);
    expect((await roll(master, masters.id, 4)).statusCode).toBe(204);
    expect((await call(app, master, 'POST', `/parties/${partyId}/combat/roll-npcs`)).statusCode).toBe(204);

    expect((await call(app, master, 'POST', `/parties/${partyId}/combat/begin`)).statusCode).toBe(204);
    const started = (await view(app, master, partyId)).combat!;
    const order = started.combatants.map((c) => c.id);
    expect(started).toMatchObject({ phase: 'active', round: 1, currentCombatantId: order[0] });
    expect(started.combatants.map((c) => c.initiative)).toEqual([...started.combatants.map((c) => c.initiative)].sort((a, b) => b! - a!));

    // Pass every turn of the round; the one whose turn it is (or the master) passes it.
    for (const [index, id] of order.entries()) {
      const actor = id === mine.id ? player : master;
      if (id !== mine.id) expect((await call(app, player, 'POST', `/parties/${partyId}/combat/next`, { from: id })).statusCode).toBe(403);
      expect((await call(app, actor, 'POST', `/parties/${partyId}/combat/next`, { from: id })).statusCode).toBe(204);
      // A second click with the same turn changes nothing.
      expect((await call(app, master, 'POST', `/parties/${partyId}/combat/next`, { from: id })).statusCode).toBe(204);
      const now = (await view(app, master, partyId)).combat!;
      expect(now.currentCombatantId).toBe(order[(index + 1) % order.length]);
      expect(now.round).toBe(index === order.length - 1 ? 2 : 1);
    }

    expect((await call(app, master, 'DELETE', `/parties/${partyId}/combat`)).statusCode).toBe(204);
    expect((await view(app, player, partyId)).combat).toBeNull();
  });

  it('follows the heroes: saved hit points reach the table, a deleted hero leaves it and its turn passes', async () => {
    const app = await ctx.app();
    const { master, player, partyId, playerHero } = await table(app);
    const heroIds = (await view(app, master, partyId)).heroes.map((hero) => hero.id);
    await call(app, master, 'POST', `/parties/${partyId}/combat`, { heroIds });
    const fight = (await view(app, master, partyId)).combat!;
    const playerCombatant = fight.combatants.find((c) => c.name === 'Охотник')!;
    await call(app, master, 'PUT', `/parties/${partyId}/combat/combatants/${playerCombatant.id}/initiative`, { value: 25 });
    await call(app, master, 'POST', `/parties/${partyId}/combat/begin`);
    expect((await view(app, master, partyId)).combat!.currentCombatantId).toBe(playerCombatant.id);

    const socket = await app.injectWS('/api/ws');
    const messages: WsServerMessage[] = [];
    socket.on('message', (raw) => messages.push(JSON.parse(raw.toString()) as WsServerMessage));
    socket.send(JSON.stringify({ type: 'auth', token: master.accessToken }));
    await expect.poll(() => messages.some((m) => m.type === 'ready')).toBe(true);

    await saveHero(app, player, { ...playerHero, currentHP: 5 }, 1);
    await expect.poll(() => messages.some((m) => m.type === 'party.changed' && m.partyId === partyId)).toBe(true);
    await expect
      .poll(async () => (await view(app, master, partyId)).heroes.find((h) => h.characterId === playerHero.id)?.vitals?.currentHP)
      .toBe(5);

    expect((await call(app, player, 'DELETE', `/characters/${playerHero.id}?baseRevision=2`)).statusCode).toBe(200);
    const remaining = fight.combatants.find((c) => c.id !== playerCombatant.id)!.id;
    await expect.poll(async () => (await view(app, master, partyId)).combat!.currentCombatantId).toBe(remaining);
    const after = await view(app, master, partyId);
    expect(after.heroes).toHaveLength(1);
    expect(after.combat!.combatants.map((c) => c.id)).toEqual([remaining]);
    socket.terminate();
  });

  it('lets players leave, the master remove them, and nobody remove the master', async () => {
    const app = await ctx.app();
    const { master, player, partyId } = await table(app);

    expect((await call(app, player, 'DELETE', `/parties/${partyId}/members/${master.user.id}`)).statusCode).toBe(403);
    expect((await call(app, master, 'DELETE', `/parties/${partyId}/members/${master.user.id}`)).statusCode).toBe(403);
    expect((await call(app, player, 'DELETE', `/parties/${partyId}/members/${player.user.id}`)).statusCode).toBe(204);

    const party = await view(app, master, partyId);
    expect(party.members).toHaveLength(1);
    expect(party.heroes).toHaveLength(1);
    expect((await call(app, player, 'GET', `/parties/${partyId}`)).statusCode).toBe(404);

    expect((await call(app, player, 'DELETE', `/parties/${partyId}`)).statusCode).toBe(404);
    expect((await call(app, master, 'DELETE', `/parties/${partyId}`)).statusCode).toBe(204);
    expect((await call(app, master, 'GET', '/parties')).json()).toEqual([]);
  });
});

describe('character summaries', () => {
  it('are filled for sheets saved before they existed', async () => {
    const app = await ctx.app();
    const player = await registerUser(app);
    const hero = await saveHero(app, player, { currentHP: 7, maxHP: 12 });
    await ctx.db.update(characters).set({ summary: null });

    expect(await ctx.services.characters.backfillSummaries()).toBe(1);
    const [row] = await ctx.db.select({ summary: characters.summary }).from(characters).where(eq(characters.id, hero.id));
    expect(row!.summary).toMatchObject({ currentHP: 7, maxHP: 12 });
    expect(await ctx.services.characters.backfillSummaries()).toBe(0);
  });
});
