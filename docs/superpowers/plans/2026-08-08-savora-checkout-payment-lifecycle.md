# Savora Checkout & Payment Lifecycle Hardening Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining checkout/payment lifecycle edge cases without redesigning Savora's stable systems.

**Architecture:** Keep the existing checkout service, order snapshots, Stripe handoff, HMAC access token, and localStorage cart. Move existing-order lookup ahead of live pricing, derive retry line items from persisted order snapshots, secure Stripe cancellation resume with the existing token, and clear the cart only from a server-verified paid confirmation.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Drizzle/PostgreSQL, Stripe, Vitest, Playwright, pnpm.

## Global Constraints

- New checkouts use current server-authoritative menu prices.
- Persisted orders are immutable payment sources for retries.
- A `PAID` order never creates another Stripe Checkout Session.
- Stripe cancel returns use the existing HMAC order-access token.
- No new product features, payment-state subsystem, or unrelated refactors.
- Preserve the dirty worktree and do not create commits.

### Task 1: Regression tests for retry authority

**Files:** `tests/integration/checkout-retry.test.ts`, `tests/integration/checkout.test.ts`, and existing Stripe tests.

- [x] Add failing coverage for paid retry, retry after menu price change, persisted retry amount, cancel URL token, and repeated same-key cancel/retry.
- [x] Run the focused integration tests and confirm failures are caused by the missing lifecycle invariants.

### Task 2: Immutable payment retry and paid-order guard

**Files:** `src/features/checkout/service.ts`, `src/features/payments/stripe.ts`, focused integration tests.

- [x] Move existing-order lookup/fingerprint validation before live menu pricing.
- [x] Return a tokenized success destination for paid existing orders without calling Stripe.
- [x] Build replacement/retry Stripe line items from persisted `order_items` snapshots and persisted order fees/tax.
- [x] Keep new checkout pricing and sold-out validation unchanged.
- [x] Run focused retry tests until green.

### Task 3: Secure Stripe cancellation resume

**Files:** `src/app/checkout/page.tsx`, `src/components/checkout/CheckoutForm.tsx`, `src/features/checkout/access.ts`, `src/features/checkout/resume.ts` if needed, `src/features/payments/stripe.ts`, focused tests.

- [x] Put the HMAC token in Stripe `cancel_url`.
- [x] Validate order/token server-side on cancellation return and pass the original checkout identity and verified form data back to the form.
- [x] Redirect paid returns to tokenized success and reject invalid/ineligible resume attempts without exposing order data.
- [x] Verify repeated cancel/retry keeps one logical order.

### Task 4: Verified paid cart clearing

**Files:** `src/app/checkout/success/page.tsx`, `src/components/checkout/ClearCartOnPaid.tsx`, `src/components/checkout/SandboxPage.tsx`, `tests/e2e/commerce.spec.ts`.

- [x] Add a small client component that clears the cart once when rendered by a token-verified paid success page.
- [x] Keep pending/invalid success visits from clearing the cart.
- [x] Make the E2E commerce flow assert pending cart retention and paid cart clearing.

### Task 5: Full verification and freeze audit

- [x] Re-run focused retry/cancel/cart tests and the existing Stripe/new-checkout regressions.
- [x] Run `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, `pnpm test:integration`, `pnpm build`, `pnpm test:e2e`, and `pnpm compress`.
- [x] Confirm archive env secrecy, optional build-cache exclusion, diff cleanliness, and the exact self-review questions from the brief.
- [x] Mark this plan complete and report `READY TO FREEZE ENGINEERING` only if all evidence is current.
