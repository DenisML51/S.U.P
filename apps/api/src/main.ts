import { buildApp } from './app';
import { loadConfig } from './config';
import { connectDatabase, runMigrations } from './db/client';

const SHUTDOWN_TIMEOUT_MS = 10_000;

async function main() {
  const config = loadConfig();
  const database = connectDatabase(config.DATABASE_URL, config.DATABASE_POOL_SIZE);
  await runMigrations(database.db);

  const app = await buildApp(config, database);

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    app.log.info({ signal }, 'shutting down');
    const timer = setTimeout(() => {
      app.log.error('shutdown timed out, exiting');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    timer.unref();
    try {
      await app.close();
      await database.close();
      process.exit(0);
    } catch (error) {
      app.log.error({ err: error }, 'error during shutdown');
      process.exit(1);
    }
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  await app.listen({ host: config.HOST, port: config.PORT });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
