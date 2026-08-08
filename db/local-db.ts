/**
 * Local development / test PostgreSQL server powered by embedded-postgres.
 *
 * Provides a real PostgreSQL (no Docker, no system install) for local
 * development, integration tests and Playwright E2E runs. Databases:
 *
 *   savora      — main app database (migrated + seeded)
 *   savora_test — integration test database (migrated, seeded per-test)
 *
 * Usage:
 *   pnpm db:local            # start server + migrate + seed, keep running
 *   pnpm db:local:reset      # wipe data dir, recreate from scratch
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import fs from 'node:fs';
import path from 'node:path';

async function loadEmbeddedPostgres() {
  // embedded-postgres is ESM-only; dynamic import keeps this file usable
  // from both ESM (vitest) and CJS (tsx) contexts.
  return (await import('embedded-postgres')).default;
}

export const LOCAL_PG_PORT = Number(process.env.LOCAL_PG_PORT ?? 54329);
export const LOCAL_PG_USER = 'savora';
export const LOCAL_PG_PASSWORD = 'savora';
export const LOCAL_PG_DATA_DIR = path.resolve(process.cwd(), '.local/postgres-data');
export const APP_DB = 'savora';
export const TEST_DB = 'savora_test';
const MIGRATIONS_FOLDER = path.resolve(process.cwd(), 'db/migrations');

function adminUrl(port: number): string {
  return `postgresql://${LOCAL_PG_USER}:${LOCAL_PG_PASSWORD}@127.0.0.1:${port}/postgres`;
}

export function dbUrl(port: number, database: string): string {
  return `postgresql://${LOCAL_PG_USER}:${LOCAL_PG_PASSWORD}@127.0.0.1:${port}/${database}`;
}

export async function startLocalPostgres(port: number = LOCAL_PG_PORT) {
  // Deterministic local dev server: wipe and re-initialise on every start.
  // The seed script repopulates all demo data.
  fs.rmSync(LOCAL_PG_DATA_DIR, { recursive: true, force: true });
  fs.mkdirSync(LOCAL_PG_DATA_DIR, { recursive: true });
  const EmbeddedPostgres = await loadEmbeddedPostgres();
  const pg = new EmbeddedPostgres({
    databaseDir: LOCAL_PG_DATA_DIR,
    user: LOCAL_PG_USER,
    password: LOCAL_PG_PASSWORD,
    port,
    persistent: false,
  });

  await pg.initialise();
  await pg.start();

  const admin = postgres(adminUrl(port), { max: 1 });
  try {
    for (const dbName of [APP_DB, TEST_DB]) {
      const exists = await admin`SELECT 1 FROM pg_database WHERE datname = ${dbName}`;
      if (exists.length === 0) {
        await admin`CREATE DATABASE ${admin(dbName)}`;
      }
    }
  } finally {
    await admin.end();
  }

  return { port, appUrl: dbUrl(port, APP_DB), testUrl: dbUrl(port, TEST_DB), stop: () => pg.stop() };
}

/** Apply all migrations to the given database URL. */
export async function runMigrations(url: string) {
  const client = postgres(url, { max: 1 });
  try {
    await migrate(drizzle(client), { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    await client.end();
  }
}

/** Seed a database (idempotent — wipes and re-inserts demo data). */
export async function seedDatabase(url: string) {
  const { seed } = await import('./seed');
  await seed(url);
}
