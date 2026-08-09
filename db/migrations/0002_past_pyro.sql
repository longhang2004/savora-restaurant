CREATE TABLE "payos_webhook_events" (
	"event_key" text PRIMARY KEY NOT NULL,
	"payment_link_id" text NOT NULL,
	"reference" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Convert the legacy USD-cent catalog and immutable order snapshots to VND.
-- Rate pinned from the live USD/VND reference on 2026-08-08: 26,186.832633.
-- Menu prices are rounded to 1,000₫; order snapshot arithmetic remains exact.
UPDATE "menu_items"
SET "price_cents" = (ROUND(("price_cents" * 26186.832633 / 100) / 1000) * 1000)::integer;
--> statement-breakpoint
UPDATE "modifier_options"
SET "price_delta_cents" = (ROUND(("price_delta_cents" * 26186.832633 / 100) / 1000) * 1000)::integer;
--> statement-breakpoint
UPDATE "order_item_modifiers"
SET "price_delta_cents" = (ROUND(("price_delta_cents" * 26186.832633 / 100) / 1000) * 1000)::integer;
--> statement-breakpoint
UPDATE "order_items"
SET
  "unit_price_cents" = (ROUND(("unit_price_cents" * 26186.832633 / 100) / 1000) * 1000)::integer,
  "line_total_cents" = ((ROUND(("unit_price_cents" * 26186.832633 / 100) / 1000) * 1000)::integer * "quantity");
--> statement-breakpoint
UPDATE "orders"
SET "delivery_fee_cents" = (ROUND(("delivery_fee_cents" * 26186.832633 / 100) / 1000) * 1000)::integer
WHERE "currency" = 'USD';
--> statement-breakpoint
UPDATE "orders" AS o
SET
  "subtotal_cents" = totals."subtotal_cents",
  "tax_cents" = ROUND(totals."subtotal_cents" * 0.05)::integer,
  "total_cents" = totals."subtotal_cents" + o."delivery_fee_cents" + ROUND(totals."subtotal_cents" * 0.05)::integer,
  "currency" = 'VND'
FROM (
  SELECT "order_id", SUM("line_total_cents")::integer AS "subtotal_cents"
  FROM "order_items"
  GROUP BY "order_id"
) AS totals
WHERE o."id" = totals."order_id" AND o."currency" = 'USD';
--> statement-breakpoint
-- A malformed legacy order without item snapshots still receives a coherent
-- one-time currency conversion rather than remaining payable in USD.
UPDATE "orders"
SET
  "subtotal_cents" = (ROUND(("subtotal_cents" * 26186.832633 / 100) / 1000) * 1000)::integer,
  "tax_cents" = (ROUND(("tax_cents" * 26186.832633 / 100) / 1000) * 1000)::integer,
  "total_cents" = (ROUND(("total_cents" * 26186.832633 / 100) / 1000) * 1000)::integer,
  "currency" = 'VND'
WHERE "currency" = 'USD';
--> statement-breakpoint
UPDATE "payments" AS p
SET "amount_cents" = o."total_cents", "currency" = 'VND'
FROM "orders" AS o
WHERE p."order_id" = o."id" AND o."currency" = 'VND';
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "currency" SET DEFAULT 'VND';--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "currency" SET DEFAULT 'VND';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payos_order_code" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payos_payment_link_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payos_checkout_url" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "payos_payment_link_id" text;--> statement-breakpoint
CREATE INDEX "payos_webhook_events_link_idx" ON "payos_webhook_events" USING btree ("payment_link_id");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_payos_order_code_unique" UNIQUE("payos_order_code");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_payos_payment_link_id_unique" UNIQUE("payos_payment_link_id");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_payos_payment_link_id_unique" UNIQUE("payos_payment_link_id");
