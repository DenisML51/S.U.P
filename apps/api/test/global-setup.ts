import postgres from 'postgres';
import { connectDatabase, runMigrations } from '../src/db/client';
import { TEST_DATABASE_URL } from './env';

/** Creates the test database on the development Postgres (docker compose) and migrates it. */
export default async function setup() {
  const url = new URL(TEST_DATABASE_URL);
  const name = url.pathname.slice(1);
  const admin = postgres({ ...parse(url), database: 'postgres', max: 1, onnotice: () => {} });
  try {
    const exists = await admin`select 1 from pg_database where datname = ${name}`;
    if (exists.length === 0) await admin.unsafe(`create database "${name}"`);
  } catch (error) {
    throw new Error(
      `Cannot reach Postgres for tests at ${url.host}. Start it with "docker compose up -d postgres".\n${String(error)}`,
    );
  } finally {
    await admin.end();
  }

  const connection = connectDatabase(TEST_DATABASE_URL, 1);
  await runMigrations(connection.db);
  await connection.close();
}

const parse = (url: URL) => ({
  host: url.hostname,
  port: Number(url.port || 5432),
  username: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
});
