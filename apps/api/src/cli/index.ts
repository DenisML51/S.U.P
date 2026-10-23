import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import {
  CharacterMigrationError,
  DisplayNameSchema,
  EmailSchema,
  PasswordSchema,
  migrateCharacter,
} from '@itd/schema';
import { eq } from 'drizzle-orm';
import { createServices } from '../app';
import { loadConfig } from '../config';
import { connectDatabase, runMigrations, type Database } from '../db/client';
import { users } from '../db/schema';
import { AppError } from '../lib/errors';

const USAGE = `Использование:
  create-user --email <email> --name <имя> [--password <пароль>]
      Создаёт аккаунт (работает и при закрытой регистрации).
      Пароль можно передать через переменную окружения ITD_PASSWORD.

  import-characters --email <email> [--overwrite] <файл.json|папка>...
      Импортирует листы персонажей (в том числе из старой десктопной версии) в аккаунт.
      Файл может содержать одного персонажа или массив персонажей.
      Существующие персонажи пропускаются, если не указан --overwrite.`;

async function createUser(db: Database, args: string[]) {
  const { values } = parseArgs({
    args,
    options: { email: { type: 'string' }, name: { type: 'string' }, password: { type: 'string' } },
  });
  const email = EmailSchema.parse(values.email);
  const displayName = DisplayNameSchema.parse(values.name);
  const password = PasswordSchema.parse(values.password ?? process.env.ITD_PASSWORD);

  const { auth } = createServices(loadConfig(), db);
  const user = await auth.createUser({ email, password, displayName });
  console.log(`Создан пользователь ${user.email} (${user.id})`);
}

async function collectJsonFiles(target: string): Promise<string[]> {
  const stat = await fs.stat(target);
  if (stat.isFile()) return [target];
  const entries = await fs.readdir(target);
  return entries.filter((name) => name.toLowerCase().endsWith('.json')).map((name) => path.join(target, name));
}

async function importCharacters(db: Database, args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: { email: { type: 'string' }, overwrite: { type: 'boolean', default: false } },
  });
  const email = EmailSchema.parse(values.email);
  if (positionals.length === 0) throw new Error('Укажите файлы или папки для импорта');

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) throw new Error(`Пользователь ${email} не найден. Сначала создайте его.`);

  const { characters } = createServices(loadConfig(), db);
  const files = (await Promise.all(positionals.map(collectJsonFiles))).flat();
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of files) {
    const content: unknown = JSON.parse(await fs.readFile(file, 'utf8'));
    for (const raw of Array.isArray(content) ? content : [content]) {
      try {
        const character = migrateCharacter(raw);
        const existing = await characters.get(user.id, character.id).catch(() => null);
        if (existing && !values.overwrite) {
          console.log(`  пропущен  ${character.name} (${character.id}) — уже существует`);
          skipped += 1;
          continue;
        }
        await characters.put(user.id, character.id, { baseRevision: existing?.revision ?? null, data: character }, null);
        console.log(`  импортирован ${character.name} (${character.id})`);
        imported += 1;
      } catch (error) {
        const reason = error instanceof CharacterMigrationError || error instanceof AppError ? error.message : String(error);
        console.error(`  ошибка в ${path.basename(file)}: ${reason}`);
        failed += 1;
      }
    }
  }

  console.log(`Готово: импортировано ${imported}, пропущено ${skipped}, с ошибками ${failed}`);
  if (failed > 0) process.exitCode = 1;
}

const COMMANDS: Record<string, (db: Database, args: string[]) => Promise<void>> = {
  'create-user': createUser,
  'import-characters': importCharacters,
};

async function main() {
  const [command, ...args] = process.argv.slice(2);
  const run = command ? COMMANDS[command] : undefined;
  if (!run) {
    console.log(USAGE);
    process.exitCode = command ? 1 : 0;
    return;
  }

  const config = loadConfig();
  const database = connectDatabase(config.DATABASE_URL, 2);
  try {
    await runMigrations(database.db);
    await run(database.db, args);
  } finally {
    await database.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
