/**
 * CLI entry: start the local embedded PostgreSQL, migrate and seed it,
 * then keep running for `pnpm dev`. Run with: pnpm db:local
 */
import { startLocalPostgres, runMigrations, seedDatabase } from './local-db';

async function main() {
  const { appUrl, testUrl, stop } = await startLocalPostgres();
  await runMigrations(appUrl);
  await runMigrations(testUrl);
  await seedDatabase(appUrl);
  await seedDatabase(testUrl);

  console.log(`\nLocal PostgreSQL ready:
  app  → ${appUrl}
  test → ${testUrl}
Add to .env.local:  DATABASE_URL=${appUrl}`);
  console.log('Press Ctrl+C to stop.\n');

  const keepAlive = setInterval(() => {}, 60_000);
  const shutdown = async () => {
    clearInterval(keepAlive);
    await stop().catch(() => {});
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Failed to start local PostgreSQL:', err);
  process.exit(1);
});
