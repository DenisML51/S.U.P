import type { WsServerMessage } from '@itd/schema';

/** What services need from realtime: tell users' devices that something changed. */
export interface ChangeNotifier {
  publish(userIds: readonly string[], message: WsServerMessage): void;
}

export interface RealtimeConnection {
  send(message: WsServerMessage): void;
  close(code: number, reason: string): void;
}

/**
 * Registry of this process's authenticated sockets per user. Changes reach it through Postgres
 * (see pgNotifier), so writes from other API replicas or the CLI are delivered too.
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

  publish(userIds: readonly string[], message: WsServerMessage): void {
    for (const userId of userIds) {
      for (const connection of this.connections.get(userId) ?? []) connection.send(message);
    }
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
