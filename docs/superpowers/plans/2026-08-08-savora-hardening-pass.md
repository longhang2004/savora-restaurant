# Savora Hardening Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Historical status:** This plan was executed during the preceding hardening
> pass. Its checklist is retained as an audit trail; all items below are
> complete. The follow-up privacy, scheduling, metrics, configuration, and E2E
> work is tracked in `2026-08-08-savora-final-hardening-pass.md`.

**Goal:** Harden the existing Savora Restaurant Commerce & Reservation Platform without rebuilding working features.

**Architecture:** Keep the App Router, server actions/route handlers, feature services, Drizzle ORM, and PostgreSQL. Make the server authoritative for local-time conversion, checkout identity, monetary totals, and Stripe payment confirmation.

**Tech Stack:** Next.js 16.2.6, React 19, TypeScript, Zod, Drizzle ORM, PostgreSQL, Stripe, Vitest, Playwright, pnpm.

## Global Constraints

- Restaurant timezone: `Asia/Ho_Chi_Minh`.
- Money remains integer minor units (`*_cents`).
- Do not add multi-tenancy, SaaS billing, accounts, refunds, microservices, Kafka, Redis, or AI features.
- Preserve existing user changes and avoid destructive git commands.
- Do not print or copy secret environment values.

---

### Task 1: Archive and runtime time safety

**Files:**
- Modify: `compress.sh`
- Modify: `src/lib/time.ts`
- Modify: `src/features/checkout/validation.ts`
- Modify: `src/features/checkout/service.ts`
- Modify: `src/components/checkout/CheckoutForm.tsx`
- Modify: `src/features/reservations/validation.ts`
- Modify: `src/features/reservations/service.ts`
- Test: `tests/unit/time.test.ts`
- Test: `tests/unit/reservations.test.ts`

**Interfaces:**
- Produce `localDateTimeToUtc(value: string): Date` for server-side `YYYY-MM-DDTHH:mm` conversion.
- `localDayBounds(date)` returns an exclusive next-local-day `end`.
- Checkout receives restaurant-local `scheduledFor` text and converts it in the service.

- [x] Write tests for local datetime conversion independent of process timezone, half-open day bounds, and invalid reservation calendar dates.
- [x] Run the focused tests and observe the expected failures.
- [x] Implement the helper, validation, server conversion, and archive exclusion patterns.
- [x] Run the focused tests, lint, and typecheck.
- [x] Run `pnpm compress` and inspect `unzip -l savora-restaurant.zip`; confirm secret `.env*` names are absent and `.env.example` is present.

### Task 2: Resumable checkout identity and Stripe charge completeness

**Files:**
- Modify: `src/lib/db/schema.ts`
- Create: generated migration under `db/migrations/`
- Modify: `src/features/checkout/service.ts`
- Create: `src/features/checkout/fingerprint.ts`
- Modify: `src/features/payments/stripe.ts`
- Modify: `db/seed.ts` only if the generated schema requires seed input
- Test: `tests/unit/checkout-fingerprint.test.ts`
- Test: `tests/integration/checkout.test.ts`

**Interfaces:**
- `createCheckoutFingerprint(input)` returns a deterministic string for equivalent normalized requests.
- Existing checkout keys resume the matching order and reject a different fingerprint.
- Stripe session creation accepts `taxCents` and includes it in Checkout line items.

- [x] Write a fingerprint unit test and integration tests for retry after payment handoff failure, same-key resume, and materially different payload rejection.
- [x] Run focused tests and observe failures.
- [x] Add the persisted fingerprint column/migration and canonical fingerprint calculation.
- [x] Make checkout lookup and unique-race recovery reuse the existing order; retrieve a reusable Stripe session or create the next session for the same order.
- [x] Add tax and configured currency to Stripe Checkout line items.
- [x] Run checkout integration tests and typecheck.

### Task 3: Stripe payment truth and webhook integrity

**Files:**
- Modify: `src/features/payments/webhook.ts`
- Modify: `src/features/payments/stripe.ts`
- Modify: `src/features/payments/service.ts`
- Modify: `src/config/env.ts`
- Test: `tests/integration/payments.test.ts`

**Interfaces:**
- `processStripeEvent` validates the signed event’s Checkout Session against the persisted order before calling `markOrderPaid`.
- Duplicate event ids remain persisted once; failed processing removes the marker for Stripe retry.
- Production cannot enable demo behavior through `DEMO_MODE=true`.

- [x] Write tests for unpaid completed sessions, mismatched order/session metadata, amount/currency mismatch, and valid paid events.
- [x] Run focused tests and observe failures.
- [x] Enforce card-only Checkout, `payment_status=paid`, metadata/reference/session/amount/currency checks, and reject unsafe production demo mode.
- [x] Run payment integration tests and route signature tests.

### Task 4: Safe HTML and transactional admin menu writes

**Files:**
- Create: `src/lib/email/html.ts`
- Modify: `src/lib/email/templates.ts`
- Modify: `src/features/payments/service.ts`
- Modify: `src/features/admin/actions.ts`
- Modify: `src/features/menu/modifiers.ts`
- Test: `tests/unit/email.test.ts`
- Test: `tests/unit/modifiers.test.ts`

**Interfaces:**
- `escapeHtml(value)` safely renders user/database text in email HTML.
- Modifier selection rejects duplicate option ids.
- Modifier group updates use one Drizzle transaction for group, option, and link changes.

- [x] Write failing escaping and duplicate-selection tests.
- [x] Run focused tests and observe failures.
- [x] Escape all dynamic email fields and order snapshot content, reject duplicate selections, and move modifier writes into a transaction.
- [x] Run focused tests, lint, and typecheck.

### Task 5: Remove dead menu source and refresh documentation

**Files:**
- Delete: `src/data/menu.ts`
- Modify: `CODEBASE_CONTEXT.md`
- Modify: `README.md` only where final behavior differs

- [x] Confirm no runtime import references the legacy menu module.
- [x] Remove the dead module without changing database seed content.
- [x] Regenerate/update context with actual routes, invariants, integrations, and test commands.
- [x] Re-read documentation for stale frontend-only or incorrect claims.

### Task 6: Full verification and final review

**Files:**
- Verify: repository-wide source, tests, archive, and docs

- [x] Run `pnpm lint`.
- [x] Run `pnpm typecheck`.
- [x] Run `pnpm test:unit`.
- [x] Run `pnpm test:integration`.
- [x] Run `pnpm build`.
- [x] Run `pnpm test:e2e`.
- [x] Recheck git diff/status, secret archive contents, final context accuracy, and the 30-item self-review from the brief.
