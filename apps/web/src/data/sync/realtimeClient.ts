import type { WsClientMessage, WsServerMessage } from '@itd/schema';
import { API_BASE, CLIENT_SESSION_ID } from '../api/client';

const PING_INTERVAL_MS = 25_000;
const MIN_RECONNECT_MS = 1_000;
const MAX_RECONNECT_MS = 30_000;

export interface RealtimeHandlers {
  /** Another device (or tab) changed characters: time to pull. */
  onCharactersChanged: () => void;
  /** (Re)connected: changes may have been missed while disconnected. */
  onConnected: () => void;
}

const socketUrl = (): string => {
  const base = new URL(API_BASE, window.location.href);
  base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
  base.pathname = `${base.pathname.replace(/\/$/, '')}/ws`;
  return base.toString();
};

/**
 * Keeps a WebSocket open to receive change notifications. Reconnects with exponential backoff and
 * jitter; authenticates with a fresh access token on every connect.
 */
export class RealtimeClient {
  private socket: WebSocket | null = null;
  private pingTimer: ReturnType<typeof setInterval> | undefined;
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  private attempt = 0;
  private stopped = true;

  constructor(
    private readonly getToken: () => Promise<string | null>,
    private readonly handlers: RealtimeHandlers,
  ) {}

  start(): void {
    if (!this.stopped) return;
    this.stopped = false;
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    clearTimeout(this.reconnectTimer);
    clearInterval(this.pingTimer);
    this.socket?.close(1000, 'client stopped');
    this.socket = null;
  }

  /** Reconnect right away, e.g. when the browser reports it is back online. */
  reconnectNow(): void {
    if (this.stopped || this.socket?.readyState === WebSocket.OPEN) return;
    clearTimeout(this.reconnectTimer);
    this.attempt = 0;
    this.connect();
  }

  private connect(): void {
    if (this.stopped) return;
    const socket = new WebSocket(socketUrl());
    this.socket = socket;

    const send = (message: WsClientMessage) => {
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
    };

    socket.onopen = async () => {
      const token = await this.getToken();
      if (!token) return socket.close(1000, 'no session');
      send({ type: 'auth', token });
      clearInterval(this.pingTimer);
      this.pingTimer = setInterval(() => send({ type: 'ping' }), PING_INTERVAL_MS);
    };

    socket.onmessage = (event: MessageEvent<string>) => {
      let message: WsServerMessage;
      try {
        message = JSON.parse(event.data) as WsServerMessage;
      } catch {
        return;
      }
      if (message.type === 'ready') {
        this.attempt = 0;
        this.handlers.onConnected();
      } else if (message.type === 'characters.changed' && message.originSessionId !== CLIENT_SESSION_ID) {
        this.handlers.onCharactersChanged();
      }
    };

    socket.onclose = () => {
      clearInterval(this.pingTimer);
      if (this.socket === socket) this.socket = null;
      this.scheduleReconnect();
    };
    // Errors are followed by `close`; reconnection is handled there.
    socket.onerror = () => {};
  }

  private scheduleReconnect(): void {
    if (this.stopped) return;
    const ceiling = Math.min(MAX_RECONNECT_MS, MIN_RECONNECT_MS * 2 ** this.attempt);
    const delay = ceiling / 2 + Math.random() * (ceiling / 2);
    this.attempt += 1;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }
}
