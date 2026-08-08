# Savora Final Hardening Pass Implementation Plan

> **For agentic workers:** Execute this plan inline in the current working tree. Preserve existing user changes and do not create commits unless explicitly requested.

**Goal:** Close the remaining privacy, scheduling, metric, least-privilege, reproducibility, and documentation gaps without expanding Savora's product scope.

**Architecture:** Keep the existing Next.js server-action/feature-service/Drizzle/PostgreSQL shape. Add a deterministic HMAC customer-access token, a small restaurant-local scheduling validator, payment-time dashboard queries, and a build-aware Playwright launcher.

**Tech Stack:** Next.js 16.2.6, TypeScript, Zod, Drizzle ORM, PostgreSQL, Stripe, Supabase Auth, Vitest, Playwright, pnpm.

## Global Constraints

- Restaurant timezone remains `Asia/Ho_Chi_Minh`.
- Money remains integer minor units (`*_cents`).
- No customer accounts, multi-tenancy, refunds, inventory, new integrations, or unrelated UI features.
- No secret values may be printed or copied into source, tests, docs, or logs.
- Existing checkout, Stripe, reservation, pricing, archive, and admin invariants must remain green.

### Task 1: Order confirmation privacy

Files: `src/features/checkout/access.ts`, checkout service/actions/routes/components, focused token tests, and checkout integration coverage.

- [x] Write tests for valid, missing, invalid, and cross-order access tokens.
- [x] Implement a server-only HMAC token bound to order id and public code.
- [x] Include the token in Stripe/demo success URLs and require it for confirmation and sandbox payment.
- [x] Run focused unit/integration tests.

### Task 2: Scheduling and dashboard semantics

Files: `src/features/checkout/scheduling.ts`, `src/config/restaurant.ts`, checkout service/UI, `src/features/admin/queries.ts`, and focused unit/integration tests.

- [x] Write tests for open/closed/past/too-far scheduled times and restaurant-local conversion.
- [x] Enforce configured service periods and a centralized maximum scheduling horizon on the server.
- [x] Make dashboard paid metrics use successful payment timestamps and define AOV as today's revenue divided by today's paid orders.
- [x] Run focused tests.

### Task 3: Configuration and E2E hygiene

Files: `src/config/env.ts`, `src/lib/auth/providers.ts`, `scripts/e2e-server.sh`, `.env.example`, `README.md`, and `CODEBASE_CONTEXT.md`.

- [x] Remove unused Supabase service-role and Stripe publishable-key runtime configuration.
- [x] Make the documented E2E command build the production bundle itself.
- [x] Update testing, environment, demo, and auth documentation accurately.

### Task 4: Regression and final verification

- [x] Mark the prior hardening plan as historical/completed.
- [x] Recheck checkout retry, Stripe payment truth, reservation concurrency, server pricing, snapshots, and archive contents.
- [x] Run lint, typecheck, unit tests, integration tests, build, and E2E from the documented workflow.
- [x] Perform a requirement-by-requirement self-review before reporting completion.
