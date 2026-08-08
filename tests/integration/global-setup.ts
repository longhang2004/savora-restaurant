/**
 * Integration-test database: starts the embedded PostgreSQL (unless
 * TEST_DATABASE_URL is provided), creates the test database, migrates it
 * and seeds it, then exposes the URL to workers via a file.
 */
import { existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import type { TestProject } from 'vitest/node';

const URL_FILE = path.resolve(process.cwd(), '.local/test-db-url');

export default async function setup(_project: TestProject) {
  void _project;
  if (process.env.TEST_DATABASE_URL) {
    writeFileSync(URL_FILE, process.env.TEST_DATABASE_URL);
    return;
  }

  const { startLocalPostgres, runMigrations, seedDatabase } = await import('../../db/local-db');
  // Separate port from the dev database to avoid conflicts.
  const { port, testUrl, stop } = await startLocalPostgres(
    Number(process.env.LOCAL_PG_PORT ?? 54329) + 1,
  );
  void port;
  await runMigrations(testUrl);
  await seedDatabase(testUrl);
  writeFileSync(URL_FILE, testUrl);

  return async () => {
    try {
      rmSync(URL_FILE);
    } catch {
      /* already gone */
    }
    await stop();
  };
}

export function readTestDbUrl(): string {
  if (!existsSync(URL_FILE)) {
    throw new Error(
      `Test database URL file missing (${URL_FILE}). Integration tests need a running PostgreSQL.`,
    );
  }
  return readFileSync(URL_FILE, 'utf8');
}
