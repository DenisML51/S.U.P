import type { WsServerMessage } from '@itd/schema';
import type postgres from 'postgres';
import type { ChangeNotifier } from './hub';

const CHANNEL = 'itd_changes';

interface ChangeEvent {
  userIds: readonly string[];
  message: WsServerMessage;
}

/**
 * Publishes change notifications through Postgres NOTIFY, so every process connected to the
 * database (API replicas, the CLI) can announce changes and every API process can deliver them.
 */
export class PostgresChangeNotifier implements ChangeNotifier {
  constructor(
    private readonly sql: postgres.Sql,
    private readonly onError: (error: unknown) => void = () => {},
  ) {}

  publish(userIds: readonly string[], message: WsServerMessage): void {
    if (userIds.length === 0) return;
    const event: ChangeEvent = { userIds, message };
    this.sql`select pg_notify(${CHANNEL}, ${JSON.stringify(event)})`.catch(this.onError);
  }

  /** Delivers notifications from the database to `target` until the returned function is called. */
  async forwardTo(target: ChangeNotifier): Promise<() => Promise<void>> {
    const { unlisten } = await this.sql.listen(CHANNEL, (payload) => {
      try {
        const event = JSON.parse(payload) as ChangeEvent;
        target.publish(event.userIds, event.message);
      } catch (error) {
        this.onError(error);
      }
    });
    return unlisten;
  }
}
