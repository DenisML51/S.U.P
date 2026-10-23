import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from './schema';

export type Database = PostgresJsDatabase<typeof schema>;
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export interface DatabaseConnection {
  db: Database;
  close: () => Promise<void>;
}

export function connectDatabase(url: string, poolSize = 10): DatabaseConnection {
  const client = postgres(url, {
    max: poolSize,
    // bigint columns are read as strings by postgres.js; drizzle maps them to bigint.
    onnotice: () => {},
  });
  return {
    db: drizzle(client, { schema, casing: 'snake_case' }),
    close: () => client.end({ timeout: 5 }),
  };
}

/**
 * SQL migrations live in `drizzle/` next to the package in development and next to the bundle in
 * the production image (see Dockerfile).
 */
const defaultMigrationsFolder = () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return process.env.MIGRATIONS_DIR ?? path.resolve(here, here.endsWith('dist') ? '../drizzle' : '../../drizzle');
};

export async function runMigrations(db: Database, migrationsFolder = defaultMigrationsFolder()): Promise<void> {
  await migrate(db, { migrationsFolder });
}
