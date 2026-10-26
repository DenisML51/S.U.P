import 'fake-indexeddb/auto';
import { CharacterSchema, type Character } from '@itd/schema';
import { afterEach, describe, expect, it } from 'vitest';
import { CharacterRepository, normalizeCharacter } from '../src/data/local/characterRepository';
import { CharacterDatabase } from '../src/data/local/database';
import { SyncEngine } from '../src/data/sync/syncEngine';
import { FakeServer } from './fakeServer';

let deviceCounter = 0;
const devices: { repository: CharacterRepository; sync: SyncEngine }[] = [];

/** One browser profile: its own IndexedDB, repository and sync engine, talking to `server`. */
function device(server: FakeServer) {
  const name = `device-${++deviceCounter}`;
  const repository = new CharacterRepository(new CharacterDatabase(name), name);
  const sync = new SyncEngine(repository, server.characters, `lock-${name}`);
  devices.push({ repository, sync });
  return { repository, sync };
}

afterEach(() => {
  for (const { repository, sync } of devices.splice(0)) {
    sync.stop();
    repository.close();
  }
});

/** A hero as reads return it: parsed by the schema and brought up to the rules. */
const hero = (overrides: Partial<Character> = {}): Character =>
  normalizeCharacter(
    CharacterSchema.parse({
      schemaVersion: 1,
      id: 'eisenhorn',
      name: 'Эйзенхорн',
      attributes: { strength: 10, wisdom: 15 },
      currentHP: 20,
      sanity: 50,
      ...overrides,
    }),
  );

const item = (id: string, quantity = 1) => ({
  id,
  name: id,
  type: 'item' as const,
  equipped: false,
  weight: 0,
  cost: 0,
  description: '',
  quantity,
});

describe('sync engine', () => {
  it('uploads a character created offline once the server is reachable', async () => {
    const server = new FakeServer();
    const phone = device(server);
    server.offline = true;

    await phone.repository.create(hero());
    await phone.sync.sync();
    expect(phone.sync.getStatus()).toMatchObject({ state: 'offline', pending: 1 });

    server.offline = false;
    await phone.sync.sync();

    expect(server.stored('eisenhorn')?.revision).toBe(1);
    expect(phone.sync.getStatus()).toMatchObject({ state: 'idle', pending: 0 });
  });

  it('brings a second device up to date', async () => {
    const server = new FakeServer();
    const laptop = device(server);
    const phone = device(server);

    await laptop.repository.create(hero());
    await laptop.sync.sync();
    await phone.sync.sync();

    expect(await phone.repository.get('eisenhorn')).toEqual(hero());
  });

  it('merges edits made offline on two devices to different fields', async () => {
    const server = new FakeServer();
    const laptop = device(server);
    const phone = device(server);
    await laptop.repository.create(hero());
    await laptop.sync.sync();
    await phone.sync.sync();

    server.offline = true;
    await laptop.repository.update('eisenhorn', (c) => ({ ...c, currentHP: 5 }));
    await phone.repository.update('eisenhorn', (c) => ({ ...c, sanity: 30 }));
    server.offline = false;

    await laptop.sync.sync();
    await phone.sync.sync(); // conflicts with the laptop's write, merges, re-uploads
    await laptop.sync.sync();

    for (const { repository } of [laptop, phone]) {
      expect(await repository.get('eisenhorn')).toMatchObject({ currentHP: 5, sanity: 30 });
    }
    expect(server.stored('eisenhorn')?.data).toMatchObject({ currentHP: 5, sanity: 30 });
  });

  it('merges inventories item by item', async () => {
    const server = new FakeServer();
    const laptop = device(server);
    const phone = device(server);
    await laptop.repository.create(hero({ inventory: [item('rope'), item('ration', 3)] }));
    await laptop.sync.sync();
    await phone.sync.sync();

    await laptop.repository.update('eisenhorn', (c) => ({ ...c, inventory: [...c.inventory, item('lantern')] }));
    await phone.repository.update('eisenhorn', (c) => ({
      ...c,
      inventory: c.inventory.map((i) => (i.id === 'ration' ? { ...i, quantity: 1 } : i)),
    }));
    await laptop.sync.sync();
    await phone.sync.sync();
    await laptop.sync.sync();

    const inventory = (await laptop.repository.get('eisenhorn'))!.inventory;
    expect(inventory.map((i) => [i.id, i.quantity])).toEqual([
      ['rope', 1],
      ['ration', 1],
      ['lantern', 1],
    ]);
  });

  it('keeps a character that was edited on one device and deleted on another', async () => {
    const server = new FakeServer();
    const laptop = device(server);
    const phone = device(server);
    await laptop.repository.create(hero());
    await laptop.sync.sync();
    await phone.sync.sync();

    await laptop.repository.remove('eisenhorn');
    await phone.repository.update('eisenhorn', (c) => ({ ...c, currentHP: 1 }));
    await laptop.sync.sync(); // deletion reaches the server first
    await phone.sync.sync(); // the edit resurrects the character
    await laptop.sync.sync();

    expect(server.stored('eisenhorn')).toMatchObject({ deletedAt: null, data: { currentHP: 1 } });
    expect(await laptop.repository.get('eisenhorn')).toMatchObject({ currentHP: 1 });
  });

  it('propagates a deletion to devices without pending edits', async () => {
    const server = new FakeServer();
    const laptop = device(server);
    const phone = device(server);
    await laptop.repository.create(hero());
    await laptop.sync.sync();
    await phone.sync.sync();

    await laptop.repository.remove('eisenhorn');
    await laptop.sync.sync();
    await phone.sync.sync();

    expect(await phone.repository.get('eisenhorn')).toBeUndefined();
    expect(await laptop.repository.getStored('eisenhorn')).toBeUndefined();
  });

  it('a character deleted before it ever reached the server never reaches it', async () => {
    const server = new FakeServer();
    const phone = device(server);
    await phone.repository.create(hero());
    await phone.repository.remove('eisenhorn');
    await phone.sync.sync();

    expect(server.stored('eisenhorn')).toBeUndefined();
    expect(await phone.repository.getStored('eisenhorn')).toBeUndefined();
  });

  it('does not lose an edit made while its predecessor was being uploaded', async () => {
    const server = new FakeServer();
    const phone = device(server);
    await phone.repository.create(hero());
    server.beforePutResponse = async () => {
      server.beforePutResponse = null;
      await phone.repository.update('eisenhorn', (c) => ({ ...c, currentHP: 3 }));
    };

    await phone.sync.sync();

    // The first upload is acknowledged without clobbering the newer edit, which is sent right after.
    expect(server.stored('eisenhorn')).toMatchObject({ revision: 2, data: { currentHP: 3 } });
    expect(await phone.repository.get('eisenhorn')).toMatchObject({ currentHP: 3 });
    expect((await phone.repository.getStored('eisenhorn'))?.dirty).toBe(0);
  });

  it('parks a document the server refuses and retries after the next edit', async () => {
    const server = new FakeServer();
    const phone = device(server);
    await phone.repository.create(hero());
    const original = server.characters.put;
    server.characters.put = async () => {
      const { ApiError } = await import('../src/data/api/client');
      throw new ApiError(400, 'validation_error', 'Лист персонажа не прошёл проверку', {
        error: 'validation_error',
        message: 'Лист персонажа не прошёл проверку',
      });
    };

    await phone.sync.sync();
    expect(phone.sync.getStatus().rejected).toEqual([
      { id: 'eisenhorn', name: 'Эйзенхорн', reason: 'Лист персонажа не прошёл проверку' },
    ]);
    expect(await phone.repository.pending()).toEqual([]);

    server.characters.put = original;
    await phone.repository.update('eisenhorn', (c) => ({ ...c, currentHP: 19 }));
    await phone.sync.sync();
    expect(server.stored('eisenhorn')?.data).toMatchObject({ currentHP: 19 });
  });

  it('offers refused characters again when synced by hand', async () => {
    const server = new FakeServer();
    const phone = device(server);
    await phone.repository.create(hero());
    const original = server.characters.put;
    server.characters.put = async () => {
      const { ApiError } = await import('../src/data/api/client');
      throw new ApiError(400, 'validation_error', 'invalid', { error: 'validation_error', message: 'invalid' });
    };
    await phone.sync.sync();
    expect(phone.sync.getStatus().rejected).toHaveLength(1);

    // The rules changed (an update of the app): asked by hand, the sheet goes through.
    server.characters.put = original;
    await phone.sync.syncNow();
    expect(server.stored('eisenhorn')?.revision).toBe(1);
    expect(phone.sync.getStatus()).toMatchObject({ pending: 0, rejected: [] });
  });

  it('settles a copy that claims a later revision than the server has (another history)', async () => {
    const server = new FakeServer();
    const phone = device(server);
    await phone.repository.create(hero());
    await phone.sync.sync();

    // The copy was taken over from another account's history: its base and revision are not the
    // server's, and the player has edited it since.
    const other = hero({ name: 'Чужой Эйзенхорн', sanity: 5 });
    await phone.repository.applyRemote([{ ...server.stored('eisenhorn')!, revision: 30, data: other }]);
    await phone.repository.update('eisenhorn', (c) => ({ ...c, currentHP: 7 }));

    await phone.sync.sync();

    // The server's sheet with this device's own edit on it; nothing of the other history.
    expect(server.stored('eisenhorn')).toMatchObject({ revision: 2, data: { name: 'Эйзенхорн', sanity: 50, currentHP: 7 } });
    expect(phone.sync.getStatus()).toMatchObject({ state: 'idle', pending: 0, rejected: [] });
  });

  it('starts over when its cursor is past the account’s newest change', async () => {
    const server = new FakeServer();
    const laptop = device(server);
    const phone = device(server);
    await laptop.repository.create(hero());
    await laptop.sync.sync();
    await phone.sync.sync();

    // The phone's database got another account's records and cursor.
    await phone.repository.applyRemote([{ ...server.stored('eisenhorn')!, revision: 9, data: hero({ name: 'Чужой' }) }]);
    await phone.repository.setCursor('70');

    await laptop.repository.update('eisenhorn', (c) => ({ ...c, currentHP: 3 }));
    await laptop.sync.sync();
    await phone.sync.sync();

    expect(await phone.repository.get('eisenhorn')).toMatchObject({ name: 'Эйзенхорн', currentHP: 3 });
    expect(await phone.repository.getCursor()).toBe('2');
  });

  it('keeps trying a write that keeps conflicting instead of giving it up', async () => {
    const server = new FakeServer();
    const phone = device(server);
    await phone.repository.create(hero());
    await phone.sync.sync();
    await phone.repository.update('eisenhorn', (c) => ({ ...c, currentHP: 4 }));

    const original = server.characters.put;
    server.characters.put = async (id, _base, data) => {
      // Another device writes before every attempt of this one.
      await original(id, server.stored(id)!.revision, server.stored(id)!.data);
      return original(id, server.stored(id)!.revision - 1, data);
    };
    await phone.sync.sync();
    expect(phone.sync.getStatus()).toMatchObject({ state: 'error', rejected: [] });
    expect(await phone.repository.pending()).toHaveLength(1);

    server.characters.put = original;
    await phone.sync.sync();
    expect(server.stored('eisenhorn')?.data).toMatchObject({ currentHP: 4 });
  });

  it('applies no answer that arrives after it was stopped', async () => {
    const server = new FakeServer();
    const laptop = device(server);
    const phone = device(server);
    await laptop.repository.create(hero());
    await laptop.sync.sync();

    const original = server.characters.pull;
    server.characters.pull = async (since) => {
      phone.sync.stop(); // the account changed while the request was out
      return original(since);
    };
    await phone.sync.sync();

    expect(await phone.repository.get('eisenhorn')).toBeUndefined();
    expect(await phone.repository.getCursor()).toBe('0');
  });
});

describe('repository', () => {
  it('applies an edit to the latest stored version, not to a stale copy', async () => {
    const server = new FakeServer();
    const phone = device(server);
    await phone.repository.create(hero());
    await phone.sync.sync();

    // A remote change lands while the UI still shows the old document.
    await phone.repository.applyRemote([
      {
        ...server.stored('eisenhorn')!,
        revision: 2,
        data: hero({ sanity: 10 }),
      },
    ]);
    await phone.repository.update('eisenhorn', (c) => ({ ...c, currentHP: 1 }));

    expect(await phone.repository.get('eisenhorn')).toMatchObject({ currentHP: 1, sanity: 10 });
  });

  it('announces changes to subscribers with their source', async () => {
    const server = new FakeServer();
    const phone = device(server);
    const seen: string[] = [];
    phone.repository.subscribe((change) => seen.push(`${change.source}:${change.ids.join(',')}`));

    await phone.repository.create(hero());
    await phone.repository.applyRemote([
      { id: 'other', revision: 1, createdAt: '', updatedAt: '', deletedAt: null, data: hero({ id: 'other' }) },
    ]);

    expect(seen).toEqual(['local:eisenhorn', 'remote:other']);
  });

  it('lists characters in creation order without deleted ones', async () => {
    const server = new FakeServer();
    const phone = device(server);
    await phone.repository.create(hero({ id: 'first', name: 'Первый' }));
    await phone.repository.create(hero({ id: 'second', name: 'Второй' }));
    await phone.sync.sync();
    await phone.repository.remove('first');

    expect((await phone.repository.list()).map((c) => c.id)).toEqual(['second']);
  });

  it('brings a stored sheet up to the current rules on read and before an edit', async () => {
    const server = new FakeServer();
    const phone = device(server);
    const stored = CharacterSchema.parse({
      ...hero(),
      maxSanityBonus: undefined,
      sanity: 90,
      limbs: [{ id: 'head', name: 'Голова', currentHP: -1049, maxHP: 60, ac: 0 }],
    });
    await phone.repository.create(stored);

    expect(await phone.repository.get('eisenhorn')).toMatchObject({ sanity: 90, limbs: [{ currentHP: -10 }] });
    const edited = await phone.repository.update('eisenhorn', (c) => c);
    expect(edited?.limbs[0]?.currentHP).toBe(-10);
    expect(edited?.maxSanityBonus).toBeGreaterThan(0);
  });
});
