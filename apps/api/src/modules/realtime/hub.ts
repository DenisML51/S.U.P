import type { WsServerMessage } from '@itd/schema';

/** What services need from realtime: tell a user's devices that something changed. */
export interface ChangeNotifier {
  publish(userId: string, message: WsServerMessage): void;
}

export interface RealtimeConnection {
  send(message: WsServerMessage): void;
  close(code: number, reason: string): void;
}

/**
 * In-process registry of authenticated sockets per user. A single API instance is enough for this
 * project; running several replicas would put a pub/sub (e.g. Postgres LISTEN/NOTIFY) behind the
 * same interface.
 */
export class RealtimeHub implements ChangeNotifier {
  private readonly connections = new Map<string, Set<RealtimeConnection>>();

  add(userId: string, connection: RealtimeConnection): () => void {
    const set = this.connections.get(userId) ?? new Set();
    set.add(connection);
    this.connections.set(userId, set);
    return () => {
      set.delete(connection);
      if (set.size === 0) this.connections.delete(userId);
    };
  }

  publish(userId: string, message: WsServerMessage): void {
    for (const connection of this.connections.get(userId) ?? []) connection.send(message);
  }

  /** Closes every socket of a user, e.g. after a password change. */
  disconnectUser(userId: string, reason: string): void {
    for (const connection of this.connections.get(userId) ?? []) connection.close(4001, reason);
  }

  closeAll(): void {
    for (const set of this.connections.values()) {
      for (const connection of set) connection.close(1001, 'Сервер перезапускается');
    }
    this.connections.clear();
  }

  get connectionCount(): number {
    let count = 0;
    for (const set of this.connections.values()) count += set.size;
    return count;
  }
}
