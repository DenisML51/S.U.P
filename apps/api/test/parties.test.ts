import type {
  PartyDto,
  PartyListItemDto,
  PartyMessagesDto,
  TableRollsDto,
  WsServerMessage,
} from '@itd/schema';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { characters, partyCombats } from '../src/db/schema';
import { nextTurn, previousTurn, turnOrder } from '../src/modules/parties/turnOrder';
import { makeCharacter, registerUser, useTestApp } from './helpers';

const ctx = useTestApp();

type App = Awaited<ReturnType<typeof ctx.app>>;
type User = Awaited<ReturnType<typeof registerUser>>;

const call = (
  app: App,
  user: User,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  payload?: object,
) => app.inject({ method, url: `/api${url}`, headers: user.auth, payload });

async function saveHero(
  app: App,
  user: User,
  overrides: Parameters<typeof makeCharacter>[0] = {},
  baseRevision: number | null = null,
) {
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
  const created = await call(app, master, 'POST', '/parties', {
    name: 'Тени Ульдуара',
    setting: 'dark-fantasy',
  });
  expect(created.statusCode).toBe(201);
  const partyId = created.json<{ id: string }>().id;
  const code = (await view(app, master, partyId)).inviteCode!;
  expect((await call(app, master, 'POST', `/parties/${partyId}/session`)).statusCode).toBe(204);

  const lowered = `${code.slice(0, 4)}-${code.slice(4)}`.toLowerCase();
  const joined = await call(app, player, 'POST', `/invites/${lowered}/accept`);
  expect(joined.statusCode).toBe(200);

  const masterHero = await saveHero(app, master, { name: 'Страж', currentHP: 30, maxHP: 30 });
  const playerHero = await saveHero(app, player, { name: 'Охотник', currentHP: 18, maxHP: 22 });
  expect(
    (await call(app, master, 'POST', `/parties/${partyId}/heroes`, { characterId: masterHero.id }))
      .statusCode,
  ).toBe(201);
  expect(
    (await call(app, player, 'POST', `/parties/${partyId}/heroes`, { characterId: playerHero.id }))
      .statusCode,
  ).toBe(201);
  return { master, player, partyId, code, masterHero, playerHero };
}

/** A Call of Cthulhu investigator with the DEX and fighting skill given. */
const investigator = (name: string, dex: number, brawl = 25) =>
  ({
    name,
    currentHP: 11,
    maxHP: 11,
    build: {
      ruleset: 'coc7',
      variant: 'classic',
      era: '1920s',
      occupation: 'professor',
      talents: [],
      age: 40,
    },
    coc: { characteristics: { dex, pow: 50 }, skills: [{ id: 'fighting:brawl', value: brawl }] },
  }) as unknown as Parameters<typeof makeCharacter>[0];

/** A table (by the rules given) with one player seated and an investigator each. */
async function cocTable(app: App, rules: 'coc7' | null) {
  const master = await registerUser(app, 'Хранитель');
  const player = await registerUser(app, 'Сыщик');
  const created = await call(app, master, 'POST', '/parties', {
    name: 'Ужас Данвича',
    setting: 'lovecraft',
    rules,
  });
  expect(created.statusCode).toBe(201);
  const partyId = created.json<{ id: string }>().id;
  const code = (await view(app, master, partyId)).inviteCode!;
  await call(app, master, 'POST', `/parties/${partyId}/session`);
  expect((await call(app, player, 'POST', `/invites/${code}/accept`)).statusCode).toBe(200);
  const masterHero = await saveHero(app, master, investigator('Профессор', 40));
  const playerHero = await saveHero(app, player, investigator('Репортёр', 60, 50));
  expect(
    (await call(app, master, 'POST', `/parties/${partyId}/heroes`, { characterId: masterHero.id }))
      .statusCode,
  ).toBe(201);
  expect(
    (await call(app, player, 'POST', `/parties/${partyId}/heroes`, { characterId: playerHero.id }))
      .statusCode,
  ).toBe(201);
  return { master, player, partyId };
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

  it('gives the turn back, into the round before from the first turn', () => {
    expect(previousTurn(entries, 'a')).toMatchObject({ previous: { id: 'c' }, wrapped: false });
    expect(previousTurn(entries, 'd')).toMatchObject({ previous: { id: 'b' }, wrapped: true });
    expect(previousTurn(entries, 'a', new Set(['c']))).toMatchObject({ previous: { id: 'd' }, wrapped: false });
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
    expect(asMaster.heroes.find((h) => h.characterId === playerHero.id)?.vitals).toMatchObject({
      currentHP: 18,
      maxHP: 22,
    });

    const lore = '## Пролог\nТуман над гаванью.';
    expect((await call(app, master, 'PATCH', `/parties/${partyId}`, { lore })).statusCode).toBe(204);
    const shown = asMaster.heroes.find((h) => h.characterId === masterHero.id)!.id;
    expect(
      (await call(app, master, 'PATCH', `/parties/${partyId}/heroes/${shown}`, { hidden: false })).statusCode,
    ).toBe(204);
    const asPlayer = await view(app, player, partyId);
    expect(asPlayer.role).toBe('player');
    expect(asPlayer.lore).toBe(lore);
    expect(
      (await call(app, player, 'PATCH', `/parties/${partyId}`, { lore: 'чужая правка' })).statusCode,
    ).toBe(403);
    expect(asPlayer.inviteCode).toBeNull();
    expect(asPlayer.npcs).toBeNull();
    expect(asPlayer.heroes.find((h) => h.characterId === masterHero.id)?.vitals).toBeNull();
    expect(asPlayer.heroes.find((h) => h.characterId === playerHero.id)?.vitals).not.toBeNull();

    const list = (await call(app, player, 'GET', '/parties')).json<PartyListItemDto[]>();
    expect(list).toMatchObject([
      { id: partyId, role: 'player', masterName: 'Мастер', memberCount: 2, heroCount: 2 },
    ]);
    expect(list[0]!.myCharacterIds).toEqual([playerHero.id]);
  });

  it('seats only heroes made by the rules of the table', async () => {
    const app = await ctx.app();
    const master = await registerUser(app, 'Хранитель');
    const created = await call(app, master, 'POST', '/parties', {
      name: 'Ужас Данвича',
      setting: 'lovecraft',
      rules: 'coc7',
    });
    expect(created.statusCode).toBe(201);
    const partyId = created.json<{ id: string }>().id;
    expect((await view(app, master, partyId)).rules).toBe('coc7');

    const ownRules = await saveHero(app, master, { name: 'Свой герой' });
    const refused = await call(app, master, 'POST', `/parties/${partyId}/heroes`, {
      characterId: ownRules.id,
    });
    expect(refused.statusCode).toBe(409);

    const investigator = await saveHero(app, master, {
      name: 'Сыщик',
      build: {
        ruleset: 'coc7',
        variant: 'classic',
        era: '1920s',
        occupation: 'professor',
        talents: [],
        age: 40,
      },
    });
    expect(
      (await call(app, master, 'POST', `/parties/${partyId}/heroes`, { characterId: investigator.id }))
        .statusCode,
    ).toBe(201);
  });

  it('seats the master and four players, no more', async () => {
    const app = await ctx.app();
    const { partyId, code } = await table(app);
    for (const name of ['Второй', 'Третий', 'Четвёртый']) {
      const guest = await registerUser(app, name);
      expect((await call(app, guest, 'POST', `/invites/${code}/accept`)).statusCode).toBe(200);
    }
    const sixth = await registerUser(app, 'Лишний');
    expect((await call(app, sixth, 'POST', `/invites/${code}/accept`)).statusCode).toBe(409);
    expect((await call(app, sixth, 'GET', `/parties/${partyId}`)).statusCode).toBe(404);
  });

  it('hides a party from strangers and stale codes', async () => {
    const app = await ctx.app();
    const { master, partyId, code } = await table(app);
    const stranger = await registerUser(app, 'Чужак');

    expect((await call(app, stranger, 'GET', `/parties/${partyId}`)).statusCode).toBe(404);
    expect((await call(app, stranger, 'GET', `/invites/${code}`)).json()).toMatchObject({
      name: 'Тени Ульдуара',
      member: false,
    });

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

    const other = (await call(app, player, 'POST', '/parties', { name: 'Своя', setting: 'sci-fi' })).json<{
      id: string;
    }>();
    const taken = await call(app, player, 'POST', `/parties/${other.id}/heroes`, {
      characterId: playerHero.id,
    });
    expect(taken.statusCode).toBe(409);

    // Nobody brings someone else's character.
    expect(
      (await call(app, master, 'POST', `/parties/${partyId}/heroes`, { characterId: playerHero.id }))
        .statusCode,
    ).toBe(404);
  });

  it('makes copies of an NPC, each its own, with conditions, attacks and notes', async () => {
    const app = await ctx.app();
    const { master, partyId } = await table(app);

    const created = await call(app, master, 'POST', `/parties/${partyId}/npcs`, {
      name: 'Гоблин',
      maxHP: 7,
      armorClass: 15,
      initiativeBonus: 2,
      attacks: [{ name: 'Скимитар', hitBonus: 4, damage: '1d6 + 2 рубящий' }],
      notes: 'Бегут при первой смерти',
      count: 3,
    });
    expect(created.statusCode).toBe(201);
    const { ids } = created.json<{ ids: string[] }>();
    expect(ids).toHaveLength(3);

    await call(app, master, 'PATCH', `/parties/${partyId}/npcs/${ids[1]}`, { currentHP: 2, conditions: ['prone'] });
    const npcs = (await view(app, master, partyId)).npcs!;
    expect(npcs.map((n) => [n.name, n.currentHP, n.conditions])).toEqual(
      expect.arrayContaining([
        ['Гоблин 1', 7, []],
        ['Гоблин 2', 2, ['prone']],
        ['Гоблин 3', 7, []],
      ]),
    );
    expect(npcs[0]).toMatchObject({ attacks: [{ name: 'Скимитар', hitBonus: 4 }], notes: 'Бегут при первой смерти' });
  });

  it('keeps the master’s notes and the heroes’ troubles to the master', async () => {
    const app = await ctx.app();
    const { master, player, partyId, playerHero } = await table(app);

    expect((await call(app, master, 'PATCH', `/parties/${partyId}`, { masterNotes: 'Предатель — трактирщик' })).statusCode).toBe(204);
    expect((await view(app, master, partyId)).masterNotes).toBe('Предатель — трактирщик');
    expect((await view(app, player, partyId)).masterNotes).toBeNull();

    // The hero falls: the master sees the death saves, the condition and the concentration lost.
    const fallen = await call(app, player, 'GET', `/characters/${playerHero.id}`);
    await saveHero(
      app,
      player,
      { ...playerHero, currentHP: 0, conditions: ['unconscious'], deathSaves: { successes: 1, failures: 2 } },
      fallen.json<{ revision: number }>().revision,
    );
    const seen = (await view(app, master, partyId)).heroes.find((h) => h.characterId === playerHero.id)!.vitals!;
    expect(seen).toMatchObject({ conditions: ['unconscious'], deathSaves: { successes: 1, failures: 2 } });
  });

  it('turns back to the one before, but not before the first turn of the fight', async () => {
    const app = await ctx.app();
    const { master, partyId } = await table(app);
    await call(app, master, 'POST', `/parties/${partyId}/npcs`, { name: 'Гуль', maxHP: 9, armorClass: 12, initiativeBonus: 0, count: 2 });
    const npcIds = (await view(app, master, partyId)).npcs!.map((n) => n.id);
    await call(app, master, 'POST', `/parties/${partyId}/combat`, { npcIds });
    await call(app, master, 'POST', `/parties/${partyId}/combat/roll-npcs`);
    await call(app, master, 'POST', `/parties/${partyId}/combat/begin`);
    const first = (await view(app, master, partyId)).combat!;
    expect((await call(app, master, 'POST', `/parties/${partyId}/combat/previous`, { from: first.currentCombatantId })).statusCode).toBe(409);
    await call(app, master, 'POST', `/parties/${partyId}/combat/next`, { from: first.currentCombatantId });
    const second = (await view(app, master, partyId)).combat!;
    expect(second.currentCombatantId).not.toBe(first.currentCombatantId);
    expect((await call(app, master, 'POST', `/parties/${partyId}/combat/previous`, { from: second.currentCombatantId })).statusCode).toBe(204);
    expect((await view(app, master, partyId)).combat!.currentCombatantId).toBe(first.currentCombatantId);
  });

  it('keeps NPCs to the master', async () => {
    const app = await ctx.app();
    const { master, player, partyId } = await table(app);

    const npc = { name: 'Гуль', maxHP: 22, armorClass: 13, initiativeBonus: 2 };
    expect((await call(app, player, 'POST', `/parties/${partyId}/npcs`, npc)).statusCode).toBe(403);
    const created = await call(app, master, 'POST', `/parties/${partyId}/npcs`, npc);
    expect(created.statusCode).toBe(201);
    const npcId = created.json<{ id: string }>().id;

    expect(
      (await call(app, master, 'PATCH', `/parties/${partyId}/npcs/${npcId}`, { currentHP: 9 })).statusCode,
    ).toBe(204);
    expect((await view(app, master, partyId)).npcs).toMatchObject([
      { name: 'Гуль', currentHP: 9, maxHP: 22, armorClass: 13 },
    ]);

    // Sides are seen by the whole table once the NPC fights; its numbers are not.
    const ally = await call(app, master, 'POST', `/parties/${partyId}/npcs`, {
      ...npc,
      name: 'Проводник',
      disposition: 'friendly',
    });
    const allyId = ally.json<{ id: string }>().id;
    await call(app, master, 'POST', `/parties/${partyId}/combat`, { npcIds: [npcId, allyId] });
    const sides = (await view(app, player, partyId)).combat!.combatants.map((c) => [
      c.name,
      c.hostile,
      c.vitals,
    ]);
    expect(sides).toEqual(
      expect.arrayContaining([
        ['Гуль', true, null],
        ['Проводник', false, null],
      ]),
    );
  });

  it('keeps the master’s heroes from the players until shown, but not out of a fight', async () => {
    const app = await ctx.app();
    const { master, player, partyId } = await table(app);
    const names = async (user: User) => (await view(app, user, partyId)).heroes.map((hero) => hero.name);
    const strangers = async () =>
      (await call(app, player, 'GET', '/parties')).json<PartyListItemDto[]>().find((p) => p.id === partyId)!
        .heroCount;

    expect(await names(master)).toEqual(['Страж', 'Охотник']);
    expect((await view(app, master, partyId)).heroes.map((hero) => hero.hidden)).toEqual([true, false]);
    expect(await names(player)).toEqual(['Охотник']);
    expect(await strangers()).toBe(1);

    const [guard, hunter] = (await view(app, master, partyId)).heroes;
    const reveal = (user: User, heroId: string, hidden: boolean) =>
      call(app, user, 'PATCH', `/parties/${partyId}/heroes/${heroId}`, { hidden });
    expect((await reveal(player, guard!.id, false)).statusCode).toBe(403);
    // Only the master's own heroes can be hidden.
    expect((await reveal(master, hunter!.id, true)).statusCode).toBe(404);

    expect((await reveal(master, guard!.id, false)).statusCode).toBe(204);
    expect(await names(player)).toEqual(['Страж', 'Охотник']);
    expect(await strangers()).toBe(2);

    // Hidden again, the hero still stands in the fight it was brought into.
    expect((await reveal(master, guard!.id, true)).statusCode).toBe(204);
    await call(app, master, 'POST', `/parties/${partyId}/combat`, { heroIds: [guard!.id, hunter!.id] });
    const seen = await view(app, player, partyId);
    expect(seen.heroes.map((hero) => hero.name)).toEqual(['Охотник']);
    expect(seen.combat!.combatants.map((c) => c.name).sort()).toEqual(['Охотник', 'Страж']);
  });

  it('runs a fight: initiative, turn order, turns passed once', async () => {
    const app = await ctx.app();
    const { master, player, partyId } = await table(app);
    const npcId = (
      await call(app, master, 'POST', `/parties/${partyId}/npcs`, {
        name: 'Гуль',
        maxHP: 22,
        armorClass: 13,
        initiativeBonus: 2,
      })
    ).json<{ id: string }>().id;
    const heroIds = (await view(app, master, partyId)).heroes.map((hero) => hero.id);

    expect(
      (await call(app, player, 'POST', `/parties/${partyId}/combat`, { heroIds, npcIds: [npcId] }))
        .statusCode,
    ).toBe(403);
    expect(
      (await call(app, master, 'POST', `/parties/${partyId}/combat`, { heroIds, npcIds: [npcId] }))
        .statusCode,
    ).toBe(204);
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
    expect(started.combatants.map((c) => c.initiative)).toEqual(
      [...started.combatants.map((c) => c.initiative)].sort((a, b) => b! - a!),
    );

    // Pass every turn of the round; the one whose turn it is (or the master) passes it.
    for (const [index, id] of order.entries()) {
      const actor = id === mine.id ? player : master;
      if (id !== mine.id)
        expect(
          (await call(app, player, 'POST', `/parties/${partyId}/combat/next`, { from: id })).statusCode,
        ).toBe(403);
      expect(
        (await call(app, actor, 'POST', `/parties/${partyId}/combat/next`, { from: id })).statusCode,
      ).toBe(204);
      // A second click with the same turn changes nothing.
      expect(
        (await call(app, master, 'POST', `/parties/${partyId}/combat/next`, { from: id })).statusCode,
      ).toBe(204);
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
    await call(app, master, 'PUT', `/parties/${partyId}/combat/combatants/${playerCombatant.id}/initiative`, {
      value: 25,
    });
    await call(app, master, 'POST', `/parties/${partyId}/combat/begin`);
    expect((await view(app, master, partyId)).combat!.currentCombatantId).toBe(playerCombatant.id);

    const socket = await app.injectWS('/api/ws');
    const messages: WsServerMessage[] = [];
    socket.on('message', (raw) => messages.push(JSON.parse(raw.toString()) as WsServerMessage));
    socket.send(JSON.stringify({ type: 'auth', token: master.accessToken }));
    await expect.poll(() => messages.some((m) => m.type === 'ready')).toBe(true);

    await saveHero(app, player, { ...playerHero, currentHP: 5 }, 1);
    await expect
      .poll(() => messages.some((m) => m.type === 'party.changed' && m.partyId === partyId))
      .toBe(true);
    await expect
      .poll(
        async () =>
          (await view(app, master, partyId)).heroes.find((h) => h.characterId === playerHero.id)?.vitals
            ?.currentHP,
      )
      .toBe(5);

    expect(
      (await call(app, player, 'DELETE', `/characters/${playerHero.id}?baseRevision=2`)).statusCode,
    ).toBe(200);
    const remaining = fight.combatants.find((c) => c.id !== playerCombatant.id)!.id;
    await expect
      .poll(async () => (await view(app, master, partyId)).combat!.currentCombatantId)
      .toBe(remaining);
    const after = await view(app, master, partyId);
    expect(after.heroes).toHaveLength(1);
    expect(after.combat!.combatants.map((c) => c.id)).toEqual([remaining]);
    socket.terminate();
  });

  it('lets players leave, the master remove them, and nobody remove the master', async () => {
    const app = await ctx.app();
    const { master, player, partyId } = await table(app);

    expect(
      (await call(app, player, 'DELETE', `/parties/${partyId}/members/${master.user.id}`)).statusCode,
    ).toBe(403);
    expect(
      (await call(app, master, 'DELETE', `/parties/${partyId}/members/${master.user.id}`)).statusCode,
    ).toBe(403);
    expect(
      (await call(app, player, 'DELETE', `/parties/${partyId}/members/${player.user.id}`)).statusCode,
    ).toBe(204);

    const party = await view(app, master, partyId);
    expect(party.members).toHaveLength(1);
    expect(party.heroes).toHaveLength(1);
    expect((await call(app, player, 'GET', `/parties/${partyId}`)).statusCode).toBe(404);

    expect((await call(app, player, 'DELETE', `/parties/${partyId}`)).statusCode).toBe(404);
    expect((await call(app, master, 'DELETE', `/parties/${partyId}`)).statusCode).toBe(204);
    expect((await call(app, master, 'GET', '/parties')).json()).toEqual([]);
  });
});

describe('Call of Cthulhu at the table', () => {
  it('runs a fight in DEX order: +50 with a firearm, ties to the better fighter, rolls only while rolling', async () => {
    const app = await ctx.app();
    const { master, player, partyId } = await cocTable(app, 'coc7');
    const npc = async (name: string, dex: number, coc: object | null) => {
      const created = await call(app, master, 'POST', `/parties/${partyId}/npcs`, {
        name,
        maxHP: 12,
        armorClass: 0,
        initiativeBonus: dex,
        coc,
      });
      expect(created.statusCode).toBe(201);
      return created.json<{ id: string }>().id;
    };
    const gunman = await npc('Бутлегер', 50, {
      firearmReady: true,
      attacks: [{ name: 'Револьвер', skill: 45, damage: '1D10' }],
    });
    const brute = await npc('Громила', 60, {
      armor: 1,
      build: 1,
      damageBonus: '+1D4',
      sanityLoss: '0/1D2',
      attacks: [{ name: 'Кастет', skill: 70, damage: '1D3+1+БУ' }],
    });
    const plain = await npc('Зевака', 30, null);
    expect((await view(app, master, partyId)).npcs!.find((n) => n.id === brute)!.coc).toEqual({
      armor: 1,
      build: 1,
      damageBonus: '+1D4',
      sanityLoss: '0/1D2',
      firearmReady: false,
      attacks: [{ name: 'Кастет', skill: 70, damage: '1D3+1+БУ' }],
    });

    const heroIds = (await view(app, master, partyId)).heroes.map((hero) => hero.id);
    expect(
      (
        await call(app, master, 'POST', `/parties/${partyId}/combat`, {
          heroIds,
          npcIds: [gunman, brute, plain],
        })
      ).statusCode,
    ).toBe(204);
    const fight = (await view(app, player, partyId)).combat!;
    const mine = fight.combatants.find((c) => c.controlled)!;
    const professor = fight.combatants.find((c) => c.name === 'Профессор')!;
    const roll = (user: User, id: string, value: number) =>
      call(app, user, 'PUT', `/parties/${partyId}/combat/combatants/${id}/initiative`, { value });

    // DEX 60: the order is 60, or 110 with a firearm ready — past the old cap of 99.
    expect((await roll(player, mine.id, 61)).statusCode).toBe(400);
    expect((await roll(player, mine.id, 110)).statusCode).toBe(204);
    expect((await roll(player, mine.id, 60)).statusCode).toBe(204);
    expect((await roll(master, professor.id, 40)).statusCode).toBe(204);
    expect((await call(app, master, 'POST', `/parties/${partyId}/combat/roll-npcs`)).statusCode).toBe(204);
    expect((await call(app, master, 'POST', `/parties/${partyId}/combat/begin`)).statusCode).toBe(204);

    // Same DEX 60: the brute's 70% beats the reporter's 50% brawl.
    expect((await view(app, master, partyId)).combat!.combatants.map((c) => [c.name, c.initiative])).toEqual([
      ['Бутлегер', 100],
      ['Громила', 60],
      ['Репортёр', 60],
      ['Профессор', 40],
      ['Зевака', 30],
    ]);

    // The round is under way: the order is the master's now.
    expect((await roll(player, mine.id, 110)).statusCode).toBe(409);
    expect((await roll(master, mine.id, 110)).statusCode).toBe(204);

    // Hit points of a Call of Cthulhu NPC stay between 0 and the maximum.
    const hp = (npcId: string, currentHP: number) =>
      call(app, master, 'PATCH', `/parties/${partyId}/npcs/${npcId}`, { currentHP });
    expect((await hp(brute, -3)).statusCode).toBe(400);
    expect((await hp(brute, 13)).statusCode).toBe(400);
    expect((await hp(brute, 0)).statusCode).toBe(204);
    expect((await hp(plain, -1)).statusCode).toBe(400);

    // The rules stay while the fight goes on, and fit the heroes at the table.
    const rules = (value: string | null) =>
      call(app, master, 'PATCH', `/parties/${partyId}`, { rules: value });
    expect((await rules('dnd2024')).statusCode).toBe(409);
    expect(
      (await call(app, master, 'PATCH', `/parties/${partyId}`, { rules: 'coc7', name: 'Ужас Данвича II' }))
        .statusCode,
    ).toBe(204);
    expect((await call(app, master, 'DELETE', `/parties/${partyId}/combat`)).statusCode).toBe(204);
    const refused = await rules('dnd2024');
    expect(refused.statusCode).toBe(409);
    expect(refused.json<{ message: string }>().message).toContain('Профессор');
    expect((await rules(null)).statusCode).toBe(204);
    expect((await rules('coc7')).statusCode).toBe(204);
  });

  it('fights by DEX at a table of any rules when every hero is an investigator', async () => {
    const app = await ctx.app();
    const { master, player, partyId } = await cocTable(app, null);
    const party = await view(app, master, partyId);
    expect(party).toMatchObject({ rules: null, combatRules: 'coc7' });
    expect(party.heroes.map((hero) => hero.rules)).toEqual(['coc7', 'coc7']);

    const cultist = (
      await call(app, master, 'POST', `/parties/${partyId}/npcs`, {
        name: 'Культист',
        maxHP: 10,
        armorClass: 0,
        initiativeBonus: 45,
        coc: { firearmReady: true },
      })
    ).json<{ id: string }>().id;
    await call(app, master, 'POST', `/parties/${partyId}/combat`, { npcIds: [cultist] });
    await call(app, master, 'POST', `/parties/${partyId}/combat/roll-npcs`);
    expect((await view(app, master, partyId)).combat!.combatants[0]!.initiative).toBe(95);
    await call(app, master, 'DELETE', `/parties/${partyId}/combat`);

    // A D&D hero at the table: back to d20, and its NPCs may go below zero again.
    const fighter = await saveHero(app, player, { name: 'Воин' });
    const seat = (await view(app, player, partyId)).heroes.find((hero) => hero.ownerId === player.user.id)!;
    expect((await call(app, player, 'DELETE', `/parties/${partyId}/heroes/${seat.id}`)).statusCode).toBe(204);
    expect(
      (await call(app, player, 'POST', `/parties/${partyId}/heroes`, { characterId: fighter.id })).statusCode,
    ).toBe(201);
    expect((await view(app, master, partyId)).combatRules).toBeNull();
    const orc = (
      await call(app, master, 'POST', `/parties/${partyId}/npcs`, {
        name: 'Орк',
        maxHP: 15,
        armorClass: 13,
        initiativeBonus: 1,
      })
    ).json<{ id: string }>().id;
    expect(
      (await call(app, master, 'PATCH', `/parties/${partyId}/npcs/${orc}`, { currentHP: -5 })).statusCode,
    ).toBe(204);
    expect((await call(app, master, 'PATCH', `/parties/${partyId}`, { rules: 'coc7' })).statusCode).toBe(409);
  });

  it('keeps the rules a fight started with when a hero of other rules sits down mid-fight', async () => {
    const app = await ctx.app();
    const { master, partyId } = await cocTable(app, null);
    const cultist = (
      await call(app, master, 'POST', `/parties/${partyId}/npcs`, {
        name: 'Культист',
        maxHP: 10,
        armorClass: 0,
        initiativeBonus: 45,
        coc: {},
      })
    ).json<{ id: string }>().id;
    expect(
      (await call(app, master, 'POST', `/parties/${partyId}/combat`, { npcIds: [cultist] })).statusCode,
    ).toBe(204);

    // A D&D hero joins the table: the running fight still goes by DEX.
    const fighter = await saveHero(app, master, { name: 'Воин' });
    expect(
      (await call(app, master, 'POST', `/parties/${partyId}/heroes`, { characterId: fighter.id })).statusCode,
    ).toBe(201);
    expect((await view(app, master, partyId)).combatRules).toBe('coc7');
    expect((await call(app, master, 'POST', `/parties/${partyId}/combat/roll-npcs`)).statusCode).toBe(204);
    expect(
      (await view(app, master, partyId)).combat!.combatants.find((c) => c.kind === 'npc')!.initiative,
    ).toBe(45);

    // A fight started before fights kept their rules goes by the table as it is now.
    await ctx.db.update(partyCombats).set({ rules: null });
    expect((await view(app, master, partyId)).combatRules).toBeNull();

    // Once it is over, the next one goes by the heroes at the table: d20.
    expect((await call(app, master, 'DELETE', `/parties/${partyId}/combat`)).statusCode).toBe(204);
    expect((await view(app, master, partyId)).combatRules).toBeNull();
    expect(
      (await call(app, master, 'POST', `/parties/${partyId}/combat`, { npcIds: [cultist] })).statusCode,
    ).toBe(204);
    const seat = (await view(app, master, partyId)).heroes.find((hero) => hero.name === 'Воин')!;
    expect((await call(app, master, 'DELETE', `/parties/${partyId}/heroes/${seat.id}`)).statusCode).toBe(204);
    expect((await view(app, master, partyId)).combatRules).toBeNull();
  });

  it('saves an NPC hurt below 0 before the Call of Cthulhu floor came, raising it to the floor', async () => {
    const app = await ctx.app();
    const { master, partyId } = await cocTable(app, null);
    const fighter = await saveHero(app, master, { name: 'Воин' });
    expect(
      (await call(app, master, 'POST', `/parties/${partyId}/heroes`, { characterId: fighter.id })).statusCode,
    ).toBe(201);
    const orc = (
      await call(app, master, 'POST', `/parties/${partyId}/npcs`, {
        name: 'Орк',
        maxHP: 15,
        armorClass: 13,
        initiativeBonus: 1,
      })
    ).json<{ id: string }>().id;
    const patch = (body: object) => call(app, master, 'PATCH', `/parties/${partyId}/npcs/${orc}`, body);
    expect((await patch({ currentHP: -3 })).statusCode).toBe(204);

    // The D&D hero leaves: every hero is an investigator, so the floor is 0 now.
    const seat = (await view(app, master, partyId)).heroes.find((hero) => hero.name === 'Воин')!;
    expect((await call(app, master, 'DELETE', `/parties/${partyId}/heroes/${seat.id}`)).statusCode).toBe(204);
    expect((await view(app, master, partyId)).combatRules).toBe('coc7');

    // A rename sends the hit points back as they were: saved, raised to the floor.
    expect((await patch({ name: 'Орк-вожак', currentHP: -3 })).statusCode).toBe(204);
    expect((await view(app, master, partyId)).npcs!.find((npc) => npc.id === orc)).toMatchObject({
      name: 'Орк-вожак',
      currentHP: 0,
    });
    // New hit points below the floor are still refused.
    expect((await patch({ currentHP: -2 })).statusCode).toBe(400);
  });
});

describe('character summaries', () => {
  it('are filled for sheets saved before they existed', async () => {
    const app = await ctx.app();
    const player = await registerUser(app);
    const hero = await saveHero(app, player, { currentHP: 7, maxHP: 12 });
    await ctx.db.update(characters).set({ summary: null });

    expect(await ctx.services.characters.backfillSummaries()).toBe(1);
    const [row] = await ctx.db
      .select({ summary: characters.summary })
      .from(characters)
      .where(eq(characters.id, hero.id));
    expect(row!.summary).toMatchObject({ currentHP: 7, maxHP: 12 });
    expect(await ctx.services.characters.backfillSummaries()).toBe(0);
  });
});

describe('table talk', () => {
  it('shows public messages to all and private ones to their two ends only', async () => {
    const app = await ctx.app();
    const { master, player, partyId, code } = await table(app);
    const other = await registerUser(app, 'Третий');
    await call(app, other, 'POST', `/invites/${code}/accept`);

    const socket = await app.injectWS('/api/ws');
    const received: WsServerMessage[] = [];
    socket.on('message', (raw) => received.push(JSON.parse(raw.toString()) as WsServerMessage));
    socket.send(JSON.stringify({ type: 'auth', token: other.accessToken }));
    await expect.poll(() => received.some((m) => m.type === 'ready')).toBe(true);

    const send = (user: User, body: string, recipientId: string | null = null) =>
      call(app, user, 'POST', `/parties/${partyId}/messages`, { body, recipientId });
    expect((await send(player, 'Кто-нибудь слышал колокол?')).statusCode).toBe(201);
    expect((await send(master, 'Ты чувствуешь запах соли.', player.user.id)).statusCode).toBe(201);
    expect((await send(player, 'Я отхожу к двери.', master.user.id)).statusCode).toBe(201);
    // A player whispers only to the master.
    expect((await send(player, 'Эй, Третий', other.user.id)).statusCode).toBe(403);

    const read = async (user: User) =>
      (await call(app, user, 'GET', `/parties/${partyId}/messages`))
        .json<PartyMessagesDto>()
        .items.map((m) => m.body);
    expect(await read(player)).toEqual([
      'Кто-нибудь слышал колокол?',
      'Ты чувствуешь запах соли.',
      'Я отхожу к двери.',
    ]);
    expect(await read(master)).toEqual([
      'Кто-нибудь слышал колокол?',
      'Ты чувствуешь запах соли.',
      'Я отхожу к двери.',
    ]);
    expect(await read(other)).toEqual(['Кто-нибудь слышал колокол?']);

    await expect.poll(() => received.filter((m) => m.type === 'party.message').length).toBe(1);
    socket.terminate();

    const stranger = await registerUser(app, 'Чужак');
    expect((await call(app, stranger, 'GET', `/parties/${partyId}/messages`)).statusCode).toBe(404);
  });

  it('pages back through older messages', async () => {
    const app = await ctx.app();
    const { master, partyId } = await table(app);
    for (let i = 1; i <= 5; i++)
      await call(app, master, 'POST', `/parties/${partyId}/messages`, { body: `#${i}` });
    const first = (
      await call(app, master, 'GET', `/parties/${partyId}/messages?limit=2`)
    ).json<PartyMessagesDto>();
    expect(first.items.map((m) => m.body)).toEqual(['#4', '#5']);
    expect(first.hasMore).toBe(true);
    const next = (
      await call(app, master, 'GET', `/parties/${partyId}/messages?limit=2&before=${first.items[0]!.id}`)
    ).json<PartyMessagesDto>();
    expect(next.items.map((m) => m.body)).toEqual(['#2', '#3']);
  });
});

describe('dice at the table', () => {
  it("shows a player's throws to all, the master's to whom they were meant, and logs them", async () => {
    const app = await ctx.app();
    const { master, player, partyId, code, playerHero, masterHero } = await table(app);
    const other = await registerUser(app, 'Третий');
    await call(app, other, 'POST', `/invites/${code}/accept`);
    const otherHero = await saveHero(app, other, { name: 'Бард' });
    await call(app, other, 'POST', `/parties/${partyId}/heroes`, { characterId: otherHero.id });

    const socket = await app.injectWS('/api/ws');
    const received: WsServerMessage[] = [];
    socket.on('message', (raw) => received.push(JSON.parse(raw.toString()) as WsServerMessage));
    socket.send(JSON.stringify({ type: 'auth', token: other.accessToken }));
    await expect.poll(() => received.some((m) => m.type === 'ready')).toBe(true);

    const roll = (user: User, body: object) => call(app, user, 'POST', `/parties/${partyId}/rolls`, body);
    const d20 = [{ sides: 20, value: 17 }];
    const first = await roll(player, { characterId: playerHero.id, dice: d20, label: 'Восприятие: 19' });
    expect(first.statusCode, first.body).toBe(204);
    // Someone else's hero, or the master's own throw by a player: refused.
    expect((await roll(other, { characterId: playerHero.id, dice: d20 })).statusCode).toBe(403);
    expect((await roll(player, { characterId: null, dice: d20 })).statusCode).toBe(403);

    const seats = (await view(app, master, partyId)).heroes;
    const hunter = seats.find((hero) => hero.name === 'Охотник')!;
    expect(
      (await roll(master, { characterId: null, dice: [{ sides: 6, value: 4 }], heroIds: [hunter.id] }))
        .statusCode,
    ).toBe(204);
    expect(
      (await roll(master, { characterId: null, dice: [{ sides: 100, value: 42 }], label: 'Всем' }))
        .statusCode,
    ).toBe(204);
    // The master's hero the players have not been shown throws for the master alone.
    expect((await roll(master, { characterId: masterHero.id, dice: d20 })).statusCode).toBe(204);

    const log = async (user: User) =>
      (await call(app, user, 'GET', `/parties/${partyId}/rolls`)).json<TableRollsDto>().items;
    expect((await log(player)).map((r) => [r.kind, r.heroName, r.dice[0]!.value])).toEqual([
      ['hero', 'Охотник', 17],
      ['master', null, 4],
      ['master', null, 42],
    ]);
    expect((await log(other)).map((r) => r.dice[0]!.value)).toEqual([17, 42]);
    const masterLog = await log(master);
    expect(masterLog.map((r) => r.dice[0]!.value)).toEqual([17, 4, 42, 17]);
    expect(masterLog[1]!.audienceNames).toEqual(['Охотник']);
    expect(masterLog[3]!.audienceNames).toEqual([]);
    expect(masterLog[0]).toMatchObject({ label: 'Восприятие: 19', audienceNames: null });

    // The third player's devices heard the throws meant for them only.
    await expect.poll(() => received.filter((m) => m.type === 'party.roll').length).toBe(2);
    socket.terminate();
  });

  it('shows nothing while the table is closed', async () => {
    const app = await ctx.app();
    const { master, player, partyId, playerHero } = await table(app);
    expect((await call(app, master, 'DELETE', `/parties/${partyId}/session`)).statusCode).toBe(204);
    const response = await call(app, player, 'POST', `/parties/${partyId}/rolls`, {
      characterId: playerHero.id,
      dice: [{ sides: 20, value: 3 }],
    });
    expect(response.statusCode).toBe(409);
  });
});

describe('sessions', () => {
  it('closes the table between sessions, keeping everything but the fight', async () => {
    const app = await ctx.app();
    const { master, player, partyId, code } = await table(app);
    const npcId = (
      await call(app, master, 'POST', `/parties/${partyId}/npcs`, {
        name: 'Тролль',
        maxHP: 84,
        armorClass: 15,
        initiativeBonus: -1,
      })
    ).json<{ id: string }>().id;
    await call(app, master, 'PATCH', `/parties/${partyId}/npcs/${npcId}`, { currentHP: 40 });
    await call(app, master, 'POST', `/parties/${partyId}/combat`, { npcIds: [npcId] });
    await call(app, player, 'POST', `/parties/${partyId}/messages`, { body: 'До встречи!' });

    expect((await call(app, player, 'DELETE', `/parties/${partyId}/session`)).statusCode).toBe(403);
    expect((await call(app, master, 'DELETE', `/parties/${partyId}/session`)).statusCode).toBe(204);

    // Players are out; the master keeps the table, its NPCs and the talk, but not the fight.
    const closed = await call(app, player, 'GET', `/parties/${partyId}`);
    expect(closed.statusCode).toBe(409);
    expect(closed.json()).toMatchObject({ error: 'session_closed' });
    expect((await call(app, player, 'GET', '/parties')).json<PartyListItemDto[]>()[0]).toMatchObject({
      inSession: false,
    });
    const asMaster = await view(app, master, partyId);
    expect(asMaster).toMatchObject({ sessionStartedAt: null, combat: null });
    expect(asMaster.npcs).toMatchObject([{ name: 'Тролль', currentHP: 40 }]);
    expect(
      (await call(app, master, 'GET', `/parties/${partyId}/messages`)).json<PartyMessagesDto>().items,
    ).toHaveLength(1);
    expect(
      (await call(app, player, 'POST', `/parties/${partyId}/messages`, { body: 'Эй?' })).statusCode,
    ).toBe(409);
    expect(
      (await call(app, master, 'POST', `/parties/${partyId}/combat`, { npcIds: [npcId] })).statusCode,
    ).toBe(409);

    // The code waits for the next session.
    const late = await registerUser(app, 'Опоздавший');
    expect((await call(app, late, 'GET', `/invites/${code}`)).statusCode).toBe(409);
    expect((await call(app, late, 'POST', `/invites/${code}/accept`)).statusCode).toBe(409);

    expect((await call(app, master, 'POST', `/parties/${partyId}/session`)).statusCode).toBe(204);
    expect((await view(app, player, partyId)).sessionStartedAt).not.toBeNull();
    expect((await call(app, late, 'POST', `/invites/${code}/accept`)).statusCode).toBe(200);
  });

  it('lets a player leave between sessions; their hero goes with them and keeps what happened to it', async () => {
    const app = await ctx.app();
    const { master, player, partyId, playerHero } = await table(app);
    await saveHero(app, player, { ...playerHero, currentHP: 3 }, 1);
    await call(app, master, 'DELETE', `/parties/${partyId}/session`);

    expect(
      (await call(app, player, 'DELETE', `/parties/${partyId}/members/${player.user.id}`)).statusCode,
    ).toBe(204);
    expect((await view(app, master, partyId)).heroes.map((hero) => hero.characterId)).not.toContain(
      playerHero.id,
    );
    const sheet = (await call(app, player, 'GET', `/characters/${playerHero.id}`)).json<{
      data: { currentHP: number };
    }>();
    expect(sheet.data.currentHP).toBe(3);
  });

  it('lets a player take their hero back between sessions, by the seat the list names', async () => {
    const app = await ctx.app();
    const { master, player, partyId, playerHero } = await table(app);
    await call(app, master, 'DELETE', `/parties/${partyId}/session`);

    const [listed] = (await call(app, player, 'GET', '/parties')).json<PartyListItemDto[]>();
    expect(listed).toMatchObject({ inSession: false, myCharacterIds: [playerHero.id] });
    expect(listed!.myHeroes).toEqual([{ id: expect.any(String), characterId: playerHero.id }]);

    expect(
      (await call(app, player, 'DELETE', `/parties/${partyId}/heroes/${listed!.myHeroes[0]!.id}`)).statusCode,
    ).toBe(204);
    const after = (await call(app, player, 'GET', '/parties')).json<PartyListItemDto[]>();
    expect(after[0]).toMatchObject({ myCharacterIds: [], myHeroes: [] });
    // Still at the table, without a hero, until they leave too.
    expect((await view(app, master, partyId)).members.map((m) => m.userId)).toContain(player.user.id);
  });
});
