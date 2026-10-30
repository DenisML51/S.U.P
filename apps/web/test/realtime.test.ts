import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeClient } from '../src/data/sync/realtimeClient';

/** A browser WebSocket the test opens and closes by hand. */
class FakeSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  static all: FakeSocket[] = [];

  readyState = FakeSocket.CONNECTING;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(readonly url: string) {
    FakeSocket.all.push(this);
  }
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    if (this.readyState === FakeSocket.CLOSED) return;
    this.readyState = FakeSocket.CLOSED;
    this.onclose?.();
  }
  open() {
    this.readyState = FakeSocket.OPEN;
    this.onopen?.();
  }
  get live() {
    return this.readyState !== FakeSocket.CLOSED;
  }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const handlers = () => ({
  onCharactersChanged: vi.fn(),
  onConnected: vi.fn(),
  onPartyChanged: vi.fn(),
  onPartyMessage: vi.fn(),
  onPartyRoll: vi.fn(),
  onPartyRollCall: vi.fn(),
});

beforeEach(() => {
  FakeSocket.all = [];
  vi.stubGlobal('WebSocket', FakeSocket);
  vi.stubGlobal('window', { location: { href: 'http://localhost:3000/' } });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('realtime client', () => {
  it('keeps one socket when told to reconnect while the socket is still opening', async () => {
    const client = new RealtimeClient(async () => 'token', handlers());
    client.start();
    client.reconnectNow();
    client.reconnectNow();
    expect(FakeSocket.all).toHaveLength(1);

    FakeSocket.all[0]!.open();
    await flush();
    expect(FakeSocket.all[0]!.sent.map((m) => JSON.parse(m).type)).toEqual(['auth']);
    client.stop();
  });

  it('lets a replaced socket go without stopping the pings or starting another reconnect', async () => {
    vi.useFakeTimers();
    const client = new RealtimeClient(async () => 'token', handlers());
    client.start();
    const first = FakeSocket.all[0]!;
    first.readyState = FakeSocket.CLOSED; // the browser lost it without telling yet
    client.reconnectNow();
    const second = FakeSocket.all[1]!;
    second.open();
    await vi.advanceTimersByTimeAsync(0);

    // The lost socket's close arrives late: nothing may change.
    first.onclose?.();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(FakeSocket.all).toHaveLength(2);
    expect(second.sent.filter((m) => JSON.parse(m).type === 'ping').length).toBeGreaterThanOrEqual(2);
    client.stop();
  });

  it('closes a socket that opens after the client was stopped', async () => {
    const client = new RealtimeClient(async () => 'token', handlers());
    client.start();
    const socket = FakeSocket.all[0]!;
    client.stop();
    socket.readyState = FakeSocket.CONNECTING;
    socket.open();
    await flush();
    expect(socket.live).toBe(false);
    expect(socket.sent).toEqual([]);
  });
});
