/**
 * CLI entry: seed a database. Run with: pnpm db:seed [database-url]
 * Falls back to DATABASE_URL when no argument is given.
 */
import { seed } from './seed';

const url = process.argv[2] ?? process.env.DATABASE_URL;
if (!url) {
  console.error('Usage: pnpm db:seed [database-url]  (or set DATABASE_URL)');
  process.exit(1);
}
seed(url)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
