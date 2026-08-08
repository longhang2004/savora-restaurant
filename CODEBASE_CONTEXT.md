# CODEBASE_CONTEXT — Savora Restaurant

Current handoff context for the full-stack Savora working tree. The source,
schema, migrations, tests, and configuration are authoritative; this file is a
summary for future agents and is not a generated API contract.

## Product and stack

Savora is a single-restaurant Vietnamese-fusion commerce and reservation
application. It is intentionally pragmatic: no multi-tenancy, organizations,
subscriptions, enterprise inventory, or microservices.

- Next.js 16.2.6 App Router, React 19.2.4, TypeScript in strict mode.
- PostgreSQL with Drizzle ORM; migrations and deterministic seed data live in
  `db/`.
- Zod validates server inputs. Money is integer cents; the configured currency
  is USD and tax is configured in basis points.
- Stripe Checkout and webhook support are optional integrations. Resend is an
  optional transactional-email provider. Supabase Auth is the production admin
  provider; a gated demo credential provider supports local demos.
- CSS Modules plus the existing dark-luxury Savora design system; Framer Motion
  powers selected client interactions.
- Vitest covers unit and PostgreSQL integration behavior. Playwright covers the
  critical browser flows.

## Repository shape

```text
src/app/                 App Router pages, admin screens, API route handlers
src/components/          Public, cart/checkout, and admin UI
src/config/              Restaurant constants and server environment parsing
src/features/            Reservation, menu, orders, checkout, payment, contact,
                         newsletter, and admin domain services/actions
src/lib/db/              Drizzle client and schema
src/lib/auth/            Signed session cookie, guards, Supabase/demo providers
src/lib/email/           Resend adapter, HTML escaping, and templates
db/                      SQL migrations, local embedded PostgreSQL, seed data
tests/                    Unit, integration, and E2E tests
public/images/            Savora imagery and static assets
```

The old static menu module was removed. The menu is database-backed; `db/seed.ts`
contains the deterministic showcase menu fixture. Static blog posts and
testimonials remain under `src/data/`.

## Routes and user journeys

Public pages: `/`, `/menu`, `/about`, `/blog`, `/blog/[slug]`, `/contact`, and
`/reservations`.

Commerce pages: `/cart`, `/checkout`, `/checkout/sandbox`, and
`/checkout/success`. The browser stores only cart identity/quantity/modifier
selection; checkout reloads authoritative menu data on the server.

Admin pages: `/admin`, `/admin/login`, `/admin/reservations`, `/admin/orders`,
`/admin/menu`, and `/admin/menu/[itemId]`.

API routes: `GET /api/reservations/availability` and
`POST /api/webhooks/stripe`. The webhook route verifies the raw Stripe body
signature before calling the payment service.

Metadata routes include `/sitemap.xml` and `/robots.txt`; admin routes are
protected and marked `noindex`.

## Configuration and time

`src/config/restaurant.ts` is the business configuration source of truth:

- timezone: `Asia/Ho_Chi_Minh`;
- restaurant identity, address, contact details, social links;
- weekday/weekend hours and lunch/dinner service periods;
- 30-minute reservation interval, 120-minute duration, online party-size and
  advance-booking limits;
- scheduled pickup/delivery orders are accepted only in configured service
  periods and up to 30 days ahead;
- supported delivery districts, delivery fee, USD currency, and 5% tax.

Database timestamps are UTC `timestamptz`. Restaurant-local dates and wall-clock
times are converted with `src/lib/time.ts`. In particular, a checkout
`datetime-local` value such as `18:30` is interpreted as 18:30 in Ho Chi Minh
City on the server, independent of the customer's browser timezone. Local-day
queries use half-open `[startOfDay, startOfNextDay)` bounds.

Server environment parsing is in `src/config/env.ts`. `DATABASE_URL` and a
32-character `SESSION_SECRET` are required. Stripe, Resend, Supabase, and demo
variables are optional. `DEMO_MODE=true` is ignored by production runtimes;
the Playwright harness has a separate loopback-only marker so it can test the
production build with local demo data. Supabase login uses only the project URL
and anon key; the application does not require a service-role key.

## Persistence model

The schema in `src/lib/db/schema.ts` contains:

- `menu_categories`, `menu_items`, `modifier_groups`, `modifier_options`, and
  `menu_item_modifier_groups`;
- `dining_tables`, `reservations`, and `reservation_tables`;
- `orders`, `order_items`, `order_item_modifiers`, and `payments`;
- `stripe_webhook_events`, `contact_inquiries`, `newsletter_subscribers`, and
  `admin_profiles`.

Migrations currently include the initial schema (`0000`) and the checkout
fingerprint column (`0001`). Seed data creates four menu categories, fourteen
menu items, modifier groups/options, six tables, relative-date reservations,
demo orders, and sample contact/newsletter records.

Orders preserve immutable item and modifier snapshots. `checkout_key` is unique
and `checkout_fingerprint` binds a retry key to the customer, fulfillment,
schedule, address/notes, and normalized line contents.

## Reservation invariants

- Zod and domain validation reject impossible calendar dates, past dates,
  over-advance dates, invalid party sizes, and unavailable slots.
- Slots derive from configured service periods and are emitted only when the
  reservation duration finishes within the period.
- Availability considers discrete compatible tables, not aggregate seats, and
  classifies slots as `available`, `limited`, or `full` without exposing table
  ids.
- Conflicts use `existing.startsAt < candidate.endsAt` and
  `existing.endsAt > candidate.startsAt`; boundary-touching intervals do not
  overlap. Only `CONFIRMED` and `SEATED` reservations occupy capacity.
- Allocation runs in a PostgreSQL transaction with a dining-table lock, then
  rechecks conflicts and selects the smallest compatible free table. The
  integration suite exercises concurrent independent allocation attempts.
- Reservation transitions are explicit: `CONFIRMED → SEATED → COMPLETED`, or
  `CANCELLED`/`NO_SHOW` terminal paths. Staff-created reservations reuse the
  same allocation service.

## Commerce and payment invariants

`src/features/orders/pricing.ts` reloads menu items and modifiers and validates
existence, availability, ownership, option availability, required groups,
min/max counts, duplicate selections, quantities, and instruction length. It
recomputes unit prices, line totals, subtotal, tax, delivery fee, and total on
the server.

`src/features/checkout/service.ts` creates a pending order and its snapshots in
a transaction. Matching retries resume the existing order; a reused key with a
different fingerprint is rejected. Restaurant-local scheduled times are stored
as UTC instants and are validated against the service periods and 30-day
horizon. Stripe line items include item prices, delivery fee, and tax; Stripe
retry handoff reuses an open session or creates a deterministic retry session
after an expired/failed handoff. A completed Stripe Session is terminal for
payment-attempt creation even if the webhook has not updated the DB yet; the
retry goes to the tokenized success destination instead. Existing retries load
immutable `order_items` snapshots and persisted fees/tax instead of repricing
the live menu; a DB-paid retry also returns the tokenized success destination
without creating another Stripe Session.
Stripe success and cancellation returns carry the same server-derived HMAC
token bound to the order id and public code; a valid cancellation return
prefills/resumes the original checkout identity, while public order code alone
cannot resume payment or access order data.

`markOrderPaid()` in `src/features/payments/service.ts` is the only payment
confirmation path. Its atomic guard is idempotent and only permits unpaid,
active orders to become paid. A signed Stripe `checkout.session.completed`
webhook also validates order/public-code identity, session identity, customer
email when supplied, payment status, amount, and currency before marking paid.
The demo sandbox calls the same confirmation service and is disabled in
production.

Dashboard revenue, paid-order count, and AOV use successful `payments` rows and
restaurant-local payment-day boundaries. AOV is today's payment revenue divided
by today's paid-order count.

The verified paid success page mounts a small client-side cart-clear effect.
Pending or invalid confirmation visits do not clear localStorage cart state.

## Admin and security

`requireAdmin()` verifies the signed session cookie in every admin page and
mutation. Middleware is only a redirect convenience. Production login uses
Supabase Auth plus an `admin_profiles` row; local demo login is enabled only
when demo mode and demo credentials are configured.

Admin order and reservation mutations use explicit state-transition maps.
Menu edits validate identifiers and fields, and modifier group replacement is
transactional across the group, option, and link tables. HTML email templates
escape user/database text before interpolation.

## Verification commands

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm build
pnpm test:e2e
pnpm compress
```

The integration harness starts an embedded PostgreSQL instance when
`TEST_DATABASE_URL` is unset. Run database-backed Vitest commands sequentially
because they share the local test database directory. The E2E harness runs the
production server against its own seeded local database and builds that
production bundle itself.

## Local setup and external services

Copy `.env.example` to `.env.local`, provide local `DATABASE_URL` and
`SESSION_SECRET`, and set demo values for a no-account walkthrough. `pnpm
db:local` starts embedded PostgreSQL, applies migrations, and seeds demo data;
`pnpm dev` serves the app.

Production requires a managed PostgreSQL connection and session secret. Stripe
keys plus a webhook secret enable real payments; Supabase variables plus a
staff profile enable production admin login; Resend variables enable email
delivery. Without those external integrations, the local demo still exercises
the core reservation, order, payment-sandbox, and admin flows.

## Deliberate limitations

Savora is single-restaurant and single-currency. The repository tests do not
make live Stripe, Supabase, or Resend calls. There is no refund/chargeback,
multi-location inventory, or customer account/order-history subsystem. Blog
article HTML is static repository content and must be sanitized before any CMS
or user-authored content is introduced.
