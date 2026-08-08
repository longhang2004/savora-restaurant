#!/usr/bin/env bash
# Playwright webServer: boot the full stack (embedded PostgreSQL, migrated
# + seeded, then the production Next.js server) in one process.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export DATABASE_URL="postgresql://savora:savora@127.0.0.1:54329/savora"
# The E2E suite deliberately runs `next start` against the production build.
# This explicit local-only marker keeps the demo payment/auth flow available
# for the portfolio test while production deployments remain fail-closed.
export SAVORA_LOCAL_E2E=true

mkdir -p .local
(pnpm db:local > .local/e2e-db.log 2>&1) &
DB_PID=$!
trap 'kill $DB_PID 2>/dev/null || true' EXIT

for _ in $(seq 1 90); do
  if grep -q "Local PostgreSQL ready" .local/e2e-db.log 2>/dev/null; then
    break
  fi
  if ! kill -0 "$DB_PID" 2>/dev/null; then
    echo "embedded postgres exited early:" >&2
    tail -20 .local/e2e-db.log >&2
    exit 1
  fi
  sleep 1
done

# `pnpm test:e2e` must work from a fresh checkout where `.next` does not exist.
# Build after the database is ready so any future build-time data access has the
# same local environment as the server that Playwright will exercise.
pnpm build

exec pnpm start
