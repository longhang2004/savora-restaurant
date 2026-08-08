/**
 * Loads .env.local into the test environment before any test module is
 * imported. When the integration global setup has started a test
 * PostgreSQL, point DATABASE_URL at that test database so app modules
 * (db client, services) operate against isolated test data.
 */
import { config } from 'dotenv';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const envPath = path.resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  config({ path: envPath });
}

const urlFile = path.resolve(process.cwd(), '.local/test-db-url');
if (existsSync(urlFile)) {
  process.env.TEST_DATABASE_URL = readFileSync(urlFile, 'utf8');
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
