import { getAccessToken, getApiBaseUrl } from './client';
import type { CombatEventType, CombatState, LobbyMessage, LobbyStatePayload } from '../types/lobby';

type LobbyWsEvent =
  | { type: 'lobby.state'; payload: LobbyStatePayload | null }
  | { type: 'master.message'; payload: LobbyMessage }
  | { type: 'combat.state'; payload: CombatState }
  | { type: 'lobby.member_joined'; payload: { memberId: string; userId: string } }
  | { type: 'lobby.member_left'; payload: { memberId: string; userId: string } }
  | { type: 'ack'; payload: { clientEventId?: string } }
  | { type: 'error'; payload: { message: string } };

type LobbySocketOptions = {
  lobbyKey: string;
  onEvent: (event: LobbyWsEvent) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (errorMessage: string) => void;
};

const HEARTBEAT_MS = 15000;
const MAX_RECONNECT_ATTEMPTS = 8;

const isTokenExpired = (token: string): boolean => {
  try {
    const base64 = token.split('.')[1];
    if (!base64) return true;
    const payload = JSON.parse(atob(base64)) as { exp?: number };
    if (!payload.exp) return false;
    return payload.exp * 1000 <= Date.now() + 1000;
  } catch {
    return true;
  }
};

export class LobbySocketClient {
  private socket: WebSocket | null = null;
  private heartbeatId: number | null = null;
  private reconnectId: number | null = null;
  private reconnectAttempt = 0;
  private readonly options: LobbySocketOptions;
  private manuallyClosed = false;
  private allowReconnect = true;

  constructor(options: LobbySocketOptions) {
    this.options = options;
  }

  connect() {
    this.manuallyClosed = false;
    this.allowReconnect = true;
    const token = getAccessToken();
    if (!token) {
      this.options.onError?.('Missing access token');
      return;
    }
    if (isTokenExpired(token)) {
      this.allowReconnect = false;
      this.options.onError?.('Access token expired');
      return;
    }

    const base = getApiBaseUrl();
    const wsBase = base.startsWith('https://') ? base.replace('https://', 'wss://') : base.replace('http://', 'ws://');
    const url = `${wsBase}/ws/lobby?key=${encodeURIComponent(this.options.lobbyKey)}&token=${encodeURIComponent(token)}`;
    this.socket = new WebSocket(url);

    this.socket.addEventListener('open', () => {
      this.reconnectAttempt = 0;
      this.options.onOpen?.();
      this.sendRaw({
        type: 'lobby.join',
        payload: { lobbyKey: this.options.lobbyKey },
        clientEventId: this.makeEventId('join')
      });
      this.startHeartbeat();
    });

    this.socket.addEventListener('message', (event) => {
      try {
        const parsed = JSON.parse(event.data as string) as LobbyWsEvent;
        if (parsed.type === 'error') {
          this.options.onError?.(parsed.payload.message);
          if (
            parsed.payload.message.includes('Unauthorized') ||
            parsed.payload.message.includes('Forbidden') ||
            parsed.payload.message.includes('Lobby not found')
          ) {
            this.allowReconnect = false;
            this.manuallyClosed = true;
            this.socket?.close();
          }
        }
        this.options.onEvent(parsed);
      } catch {
        this.options.onError?.('Failed to parse websocket message');
      }
    });

    this.socket.addEventListener('error', () => {
      this.options.onError?.('WebSocket connection error');
    });

    this.socket.addEventListener('close', () => {
      this.stopHeartbeat();
      this.options.onClose?.();
      if (!this.manuallyClosed && this.allowReconnect) {
        this.scheduleReconnect();
      }
    });
  }

  disconnect() {
    this.manuallyClosed = true;
    this.stopHeartbeat();
    if (this.reconnectId !== null) {
      window.clearTimeout(this.reconnectId);
      this.reconnectId = null;
    }
    this.socket?.close();
    this.socket = null;
  }

  sendMasterMessage(text: string) {
    this.sendRaw({
      type: 'master.message.send',
      payload: { text },
      clientEventId: this.makeEventId('msg')
    });
  }

  sendCombatEvent(eventType: CombatEventType, payload: Record<string, unknown>) {
    this.sendRaw({
      type: 'combat.event',
      payload: { eventType, payload },
      clientEventId: this.makeEventId('combat')
    });
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatId = window.setInterval(() => {
      this.sendRaw({
        type: 'presence.ping',
        clientEventId: this.makeEventId('ping')
      });
    }, HEARTBEAT_MS);
  }

  private stopHeartbeat() {
    if (this.heartbeatId !== null) {
      window.clearInterval(this.heartbeatId);
      this.heartbeatId = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
      this.options.onError?.('Unable to reconnect to lobby socket');
      return;
    }
    const token = getAccessToken();
    if (!token || isTokenExpired(token)) {
      this.allowReconnect = false;
      this.options.onError?.('Access token expired');
      return;
    }
    const delay = Math.min(1000 * 2 ** this.reconnectAttempt, 20000);
    this.reconnectAttempt += 1;
    this.reconnectId = window.setTimeout(() => this.connect(), delay);
  }

  private sendRaw(payload: Record<string, unknown>) {
    const socket = this.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    socket.send(JSON.stringify(payload));
  }

  private makeEventId(prefix: string) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}
