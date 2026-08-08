# Savora — Restaurant Commerce & Reservation Platform

A production-minded restaurant application built on a polished dark-luxury frontend:
**real reservations with a table-aware availability engine, server-authoritative
ecommerce with configurable products, Stripe payments with verified webhooks,
and a protected restaurant operations console.**

Built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**, **PostgreSQL**,
**Drizzle ORM**, **Zod**, **Stripe**, **Resend**, **Supabase Auth** (optional),
**Framer Motion**, and **CSS Modules**.

---

## Why this exists

Savora started as a static restaurant showcase. It is now a full-stack application
demonstrating freelance-grade skills:

- **Table-aware reservation engine** — real-time availability against discrete
  dining-table capacity, transactional table assignment that prevents double-booking
  under concurrency, legal status lifecycles.
- **Server-authoritative ecommerce** — prices, modifiers, availability and order
  totals are reloaded and recomputed on the server; orders store immutable
  order-time snapshots.
- **Reliable Stripe payment lifecycle** — Checkout Sessions, signature-verified
  webhooks, idempotent event processing; a success URL alone never marks an order paid.
  Cancelled Checkout returns resume the same token-verified pending order, while
  paid retries go straight to confirmation. Completed Stripe Sessions are never
  replaced while webhook state catches up; only expired Sessions can be retried.
- **Restaurant operations** — protected staff console for reservations, order
  fulfillment, menu editing and sold-out control, with a small dashboard.

---

## Architecture

```
src/
  app/                    # App Router: public pages, /admin, /api, /checkout
  components/             # UI (existing Savora design language preserved)
  config/
    restaurant.ts         # single source of truth: identity, hours, rules, delivery
    env.ts                # server-only env validation (Zod)
  features/
    reservations/         # slots, availability, transactional allocation, actions
    menu/                 # DB queries + server-side modifier validation
    orders/               # server pricing, status lifecycle
    checkout/             # validation + checkout orchestration
    payments/             # Stripe client, webhook processing, payment confirmation
    contact/              # inquiry persistence + notification
    newsletter/           # subscription persistence
    admin/                # read models + admin mutations (authorized)
  lib/
    db/                   # Drizzle schema + client
    auth/                 # session JWT, guards, Supabase + demo providers
    email/                # Resend client + templates
    time.ts               # timezone-safe helpers (Asia/Ho_Chi_Minh)
    errors.ts             # product error model + Zod bridge
db/
  migrations/             # SQL migrations (drizzle-kit)
  seed.ts                 # deterministic demo data (relative dates)
  local-db.ts             # embedded PostgreSQL for local dev/tests
tests/
  unit/                   # Vitest: slots, engine, modifiers, status, time, money
  integration/            # Vitest + real PostgreSQL: concurrency, checkout, Stripe
  e2e/                    # Playwright critical flows
```

Key design decisions:

- **Money** is integer cents everywhere (`*_cents`); tax uses basis points with
  integer rounding.
- **Timestamps** are `timestamptz` (UTC). Restaurant-local dates/times
  (`Asia/Ho_Chi_Minh`) are derived via timezone-aware helpers — never
  `new Date().toISOString().split('T')[0]`.
- **Double-booking protection**: allocation runs inside a transaction that takes
  `LOCK TABLE dining_tables IN SHARE ROW EXCLUSIVE MODE`, rechecks overlaps
  (statuses `CONFIRMED`/`SEATED` only), picks the smallest compatible free table,
  then inserts reservation + assignment. Verified by a concurrency test.
- **Server-authoritative pricing**: the cart stores only ids/quantities/option ids;
  checkout reloads products from the DB, validates every modifier (ownership,
  availability, min/max), and computes subtotal/tax/fee/total on the server.
- **Payment truth**: `markOrderPaid()` is the single idempotent confirmation path,
  triggered by the signed Stripe webhook (or the gated demo simulation). Duplicate
  webhook deliveries are deduplicated via a unique `stripe_webhook_events` PK.
- **Admin security**: middleware redirect is UX only; every admin page and
  mutation re-verifies a signed session JWT server-side. Admin URLs are
  `noindex` and disallowed in `robots.txt`.

---

## Prerequisites

- Node.js ≥ 20.9
- pnpm 10+
- No external services are required for local development — a real PostgreSQL
  server is started automatically via embedded binaries.

## Quick start (no accounts needed)

```bash
pnpm install

# 1. Environment (required values only; see .env.example for the rest)
cp .env.example .env.local
#   DATABASE_URL=postgresql://savora:savora@127.0.0.1:54329/savora
#   SESSION_SECRET=<openssl rand -hex 32>
#   DEMO_MODE=true
#   DEMO_ADMIN_EMAIL=admin@savora.vn
#   DEMO_ADMIN_PASSWORD=<your demo password>

# 2. Start the embedded database (migrates + seeds automatically)
pnpm db:local          # terminal 1 — keep running

# 3. Run the app
pnpm dev               # terminal 2 — http://localhost:3000
```

That is everything needed to demo the full product: reservations with real
availability, cart/checkout with sandbox payment, and the admin console.

### Local PostgreSQL notes

`pnpm db:local` starts a real PostgreSQL (embedded binaries, no Docker) on port
`54329`, creates databases `savora` and `savora_test`, applies migrations and
seeds demo data. It wipes and reseeds on every start so demos are deterministic.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (Supabase works, SSL auto-detected) |
| `SESSION_SECRET` | ✅ | ≥32 chars; signs admin session JWTs |
| `DEMO_MODE` | — | `true` enables sandbox payment + demo admin sign-in (never in production) |
| `DEMO_ADMIN_EMAIL` / `DEMO_ADMIN_PASSWORD` | — | Demo-mode admin credentials |
| `STRIPE_SECRET_KEY` | — | Stripe test key; checkout uses real Checkout Sessions when set |
| `STRIPE_WEBHOOK_SECRET` | — | Verifies webhook signatures (`whsec_…`) |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | — | Transactional email; skipped (logged) when absent |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | — | Production admin auth (Supabase Auth) |
| `NEXT_PUBLIC_SITE_URL` | — | Defaults to `https://savora-restaurant.vercel.app` |

Never commit real credentials — secret `.env*` files are gitignored, while
`.env.example` is intentionally shareable. `pnpm compress` excludes secret env
files from the generated archive and retains the example template.

## Database

```bash
pnpm db:generate        # generate a migration from src/lib/db/schema.ts
pnpm db:migrate         # apply migrations to DATABASE_URL
pnpm db:seed            # wipe + seed demo data (DATABASE_URL or positional arg)
pnpm db:local           # start local Postgres, migrate + seed, keep running
pnpm db:studio          # Drizzle Studio
```

Main tables: `menu_categories`, `menu_items`, `modifier_groups`,
`modifier_options`, `menu_item_modifier_groups`, `dining_tables`, `reservations`,
`reservation_tables`, `orders`, `order_items`, `order_item_modifiers`, `payments`,
`stripe_webhook_events`, `contact_inquiries`, `newsletter_subscribers`,
`admin_profiles`.

Seed data: the original 14-dish menu (prices converted to cents), modifier groups
(Wagyu Phở size/extras, cocktail sweetness, lava-cake ice cream), one sold-out
item, 6 dining tables (T01–T05 + private P01), reservations/orders generated
relative to the current date, and sample contact/newsletter rows.

## Testing

```bash
pnpm test               # Vitest unit + integration suites (not browser E2E)
pnpm test:unit          # pure domain tests — slots, engine, modifiers, status…
pnpm test:integration   # real-PostgreSQL: concurrency double-booking, checkout,
                        # Stripe webhook (real signature verification, no network)
pnpm test:e2e           # Playwright critical flows (builds, boots DB + prod server)
pnpm test:e2e:install   # download the Chromium browser once
```

Integration tests need PostgreSQL — they reuse the embedded binaries when
`TEST_DATABASE_URL` is unset. The Playwright launcher builds the production
bundle itself, so `pnpm test:e2e` is reproducible from a fresh checkout.
For the complete local verification pass, run lint, typecheck, unit tests,
integration tests, `pnpm build`, and then `pnpm test:e2e`.

## Stripe webhook — local development

With the CLI:

```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# copy the whsec_… into STRIPE_WEBHOOK_SECRET in .env.local and restart
```

Set `STRIPE_SECRET_KEY` to a test key and checkout redirects to Stripe-hosted
Checkout. The server-side integration does not require a publishable key.
Without Stripe keys, `DEMO_MODE`
checkout uses the sandbox payment page, which runs the same server-side
confirmation path the webhook would (clearly labeled, production-gated). A
verified paid confirmation clears the browser cart; pending or invalid
confirmation URLs do not.

## Supabase setup (production admin auth)

1. Create a Supabase project; run `pnpm db:migrate` against its database URL.
2. Add the Supabase project URL and anon key. The application only uses the
   public Auth client capabilities needed for password sign-in; no service-role
   key is required at runtime.
3. Create a staff account in the Supabase dashboard (or through a separately
   secured Supabase admin workflow).
4. Insert an `admin_profiles` row for that user id (`role: 'ADMIN'`), or seed one:
   `SEED_ADMIN_USER_ID=<user id> pnpm db:seed`.
5. Sign in at `/admin/login`.

## Resend setup

Add `RESEND_API_KEY` and optionally `RESEND_FROM_EMAIL`. Emails: reservation
confirmation, order confirmation after paid, contact inquiry notification,
newsletter welcome. Missing keys are logged, never fatal.

## Demo flow (for a prospective client)

1. `pnpm db:local` + `pnpm dev`, open `/`.
2. **Reservations**: pick party size + date → see real **Available / Limited /
   Full** slots → book → real confirmation code (email logged if Resend unset).
3. **Commerce**: `/menu` → customize the Wagyu Phở (Large + Extra Wagyu) → cart →
   guest checkout → sandbox payment → order confirmation.
4. **Operations**: `/admin` (demo credentials) → dashboard metrics → reservations
   board (seat → complete) → order board → toggle a menu item sold out and watch
   the public menu update.
5. Inspect the data live in Drizzle Studio or `psql` to show real persistence.

## Deploy

Static pages render at build time; `/menu`, `/admin`, `/checkout` and the API
routes are server-rendered and require `DATABASE_URL` + `SESSION_SECRET` at
runtime. Standard Vercel deployment with the environment variables above.

---

Designed and developed by Hàng Nhựt Long as a freelance portfolio showcase of
full-stack Next.js commerce, booking, payments and restaurant operations.
