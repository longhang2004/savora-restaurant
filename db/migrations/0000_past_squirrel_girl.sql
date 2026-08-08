CREATE TYPE "public"."admin_role" AS ENUM('ADMIN', 'STAFF');--> statement-breakpoint
CREATE TYPE "public"."fulfillment_type" AS ENUM('pickup', 'delivery');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('PENDING', 'NEW', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('UNPAID', 'PAID');--> statement-breakpoint
CREATE TYPE "public"."reservation_source" AS ENUM('online', 'staff');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');--> statement-breakpoint
CREATE TABLE "admin_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"display_name" text NOT NULL,
	"role" "admin_role" DEFAULT 'STAFF' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "contact_inquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dining_tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"capacity" integer NOT NULL,
	"area" text DEFAULT 'Main Dining' NOT NULL,
	"is_private" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "menu_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "menu_item_modifier_groups" (
	"menu_item_id" uuid NOT NULL,
	"modifier_group_id" uuid NOT NULL,
	CONSTRAINT "menu_item_modifier_groups_menu_item_id_modifier_group_id_pk" PRIMARY KEY("menu_item_id","modifier_group_id")
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"price_cents" integer NOT NULL,
	"image_path" text,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"dietary_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "menu_items_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "modifier_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"min_selections" integer DEFAULT 0 NOT NULL,
	"max_selections" integer DEFAULT 1 NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modifier_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"modifier_group_id" uuid NOT NULL,
	"name" text NOT NULL,
	"price_delta_cents" integer DEFAULT 0 NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "newsletter_subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "order_item_modifiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_item_id" uuid NOT NULL,
	"modifier_option_id" uuid,
	"group_name" text NOT NULL,
	"option_name" text NOT NULL,
	"price_delta_cents" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"menu_item_id" uuid,
	"item_name" text NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"quantity" integer NOT NULL,
	"line_total_cents" integer NOT NULL,
	"special_instructions" text
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_code" text NOT NULL,
	"customer_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"customer_phone" text NOT NULL,
	"fulfillment_type" "fulfillment_type" NOT NULL,
	"scheduled_for" timestamp with time zone,
	"delivery_address" jsonb,
	"status" "order_status" DEFAULT 'PENDING' NOT NULL,
	"payment_status" "payment_status" DEFAULT 'UNPAID' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"subtotal_cents" integer NOT NULL,
	"delivery_fee_cents" integer DEFAULT 0 NOT NULL,
	"tax_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer NOT NULL,
	"customer_notes" text,
	"checkout_key" text NOT NULL,
	"stripe_checkout_session_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_public_code_unique" UNIQUE("public_code"),
	CONSTRAINT "orders_checkout_key_unique" UNIQUE("checkout_key")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"stripe_session_id" text,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_stripe_session_id_unique" UNIQUE("stripe_session_id")
);
--> statement-breakpoint
CREATE TABLE "reservation_tables" (
	"reservation_id" uuid NOT NULL,
	"table_id" uuid NOT NULL,
	CONSTRAINT "reservation_tables_reservation_id_table_id_pk" PRIMARY KEY("reservation_id","table_id")
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"confirmation_code" text NOT NULL,
	"customer_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"customer_phone" text NOT NULL,
	"party_size" integer NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" "reservation_status" DEFAULT 'CONFIRMED' NOT NULL,
	"notes" text,
	"source" "reservation_source" DEFAULT 'online' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reservations_confirmation_code_unique" UNIQUE("confirmation_code")
);
--> statement-breakpoint
CREATE TABLE "stripe_webhook_events" (
	"stripe_event_id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "menu_item_modifier_groups" ADD CONSTRAINT "menu_item_modifier_groups_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_modifier_groups" ADD CONSTRAINT "menu_item_modifier_groups_modifier_group_id_modifier_groups_id_fk" FOREIGN KEY ("modifier_group_id") REFERENCES "public"."modifier_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_category_id_menu_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."menu_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modifier_options" ADD CONSTRAINT "modifier_options_modifier_group_id_modifier_groups_id_fk" FOREIGN KEY ("modifier_group_id") REFERENCES "public"."modifier_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_modifiers" ADD CONSTRAINT "order_item_modifiers_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_modifiers" ADD CONSTRAINT "order_item_modifiers_modifier_option_id_modifier_options_id_fk" FOREIGN KEY ("modifier_option_id") REFERENCES "public"."modifier_options"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation_tables" ADD CONSTRAINT "reservation_tables_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation_tables" ADD CONSTRAINT "reservation_tables_table_id_dining_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."dining_tables"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "menu_items_category_idx" ON "menu_items" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "menu_items_availability_idx" ON "menu_items" USING btree ("is_available");--> statement-breakpoint
CREATE INDEX "modifier_options_group_idx" ON "modifier_options" USING btree ("modifier_group_id");--> statement-breakpoint
CREATE INDEX "order_item_modifiers_item_idx" ON "order_item_modifiers" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_payment_status_idx" ON "orders" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "orders_public_code_idx" ON "orders" USING btree ("public_code");--> statement-breakpoint
CREATE INDEX "payments_order_idx" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "reservation_tables_table_idx" ON "reservation_tables" USING btree ("table_id");--> statement-breakpoint
CREATE INDEX "reservations_time_idx" ON "reservations" USING btree ("starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "reservations_status_idx" ON "reservations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "stripe_webhook_events_type_idx" ON "stripe_webhook_events" USING btree ("event_type");