# Savora Hardening Pass Design

**Goal:** Preserve Savora’s existing single-restaurant architecture while closing verified correctness and safety gaps in archives, restaurant-local scheduling, checkout retries, Stripe payment truth, email rendering, and admin menu writes.

## Architecture

Keep the current Next.js App Router → server actions/route handlers → feature services → Drizzle/PostgreSQL flow. Restaurant-local wall-clock input will be converted on the server with the existing `Asia/Ho_Chi_Minh` helpers. Checkout will persist a canonical request fingerprint beside the existing unique checkout key so retries resume the same order and reject materially different payloads. Stripe Checkout will include every order charge, and signed webhook events will validate order identity, session identity, payment status, amount, and currency before calling the existing idempotent payment transition.

## Boundaries

- Keep discrete table allocation and its PostgreSQL table lock; add only validation and regression coverage around it.
- Keep Stripe-hosted Checkout and the demo sandbox; do not add a custom card form, refunds engine, accounts, or SaaS abstractions.
- Keep `CODEBASE_CONTEXT.md` and the README accurate to the final source of truth.
- Preserve all pre-existing worktree edits and do not commit or reset unrelated files.

## Correctness changes

1. Archive exclusions will explicitly cover secret environment filenames while continuing to include `.env.example`.
2. `localDayBounds` will return a true half-open `[startOfDay, startOfNextDay)` interval. Checkout scheduled values will remain restaurant-local until server conversion; reservation creation will validate calendar dates and public date-range rules.
3. Checkout will store a canonical fingerprint, find existing orders by checkout key, reject key reuse with different payloads, and resume the same sandbox/Stripe order. Stripe sessions will charge item lines, delivery, and tax.
4. Webhook processing will require `checkout.session.completed` with `payment_status=paid`, matching metadata/reference, tracked session, total amount, and currency. Invalid valid-signature events will not mutate orders; duplicate event ids remain safe no-ops. Card-only Checkout configuration keeps payment semantics simple.
5. Email template interpolation will escape dynamic text, including order line snapshots and contact content.
6. Modifier editing will run group, option, and link writes in one transaction; duplicate modifier ids will be rejected server-side. The unused legacy runtime menu data module will be removed.

## Testing and verification

Use focused failing tests before each behavior change, then run the complete unit, integration, build, lint, typecheck, and Playwright suites. Verify the generated archive contents directly without printing environment values. Update documentation only after the implementation and final checks are stable.
