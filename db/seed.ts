/**
 * Seed script — populates a Savora database with demo data.
 *
 *   pnpm db:seed            # uses DATABASE_URL from the environment
 *   pnpm db:seed -- <url>   # or an explicit database URL
 *
 * Idempotent: truncates all tables and re-inserts. Never contains secrets.
 *
 * The public menu fixture preserves the original static showcase dataset —
 * same dishes, descriptions, prices and images.
 * Reservations and orders are generated relative to the current date so
 * the admin dashboard stays useful whenever the database is seeded.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from '../src/lib/db/schema';
import { localToUtc } from '../src/lib/time';
import { percentOfCents } from '../src/lib/money';
import { restaurantConfig, RESTAURANT_TIMEZONE } from '../src/config/restaurant';

const SEED_ADMIN_USER_ID = process.env.SEED_ADMIN_USER_ID;

/** Local wall-clock slot helper — mirrors the availability engine's periods. */
function localSlots(dateStr: string, times: string[]): { startsAt: Date; endsAt: Date }[] {
  const duration = restaurantConfig.reservation.durationMinutes;
  return times.map((time) => {
    const startsAt = localToUtc(dateStr, time);
    const endsAt = new Date(startsAt.getTime() + duration * 60_000);
    return { startsAt, endsAt };
  });
}

/** Restaurant-local date N days from today, as YYYY-MM-DD. */
function dateOffset(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: RESTAURANT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export async function seed(url: string) {
  const client = postgres(url, { max: 5 });
  const db = drizzle(client, { schema });

  try {
    // ── Full reset ────────────────────────────────────────────────────
    await db.execute(sql`TRUNCATE TABLE
      stripe_webhook_events, payments, order_item_modifiers, order_items,
      orders, newsletter_subscribers, contact_inquiries, reservation_tables,
      reservations, dining_tables, menu_item_modifier_groups, modifier_options,
      modifier_groups, menu_items, menu_categories, admin_profiles
      RESTART IDENTITY CASCADE`);

    // ── Menu categories ───────────────────────────────────────────────
    const categories = await db
      .insert(schema.menuCategories)
      .values([
        { name: 'Starters', slug: 'starters', description: 'To begin the journey', sortOrder: 10 },
        { name: 'Mains', slug: 'mains', description: 'Signature plates', sortOrder: 20 },
        { name: 'Desserts', slug: 'desserts', description: 'Sweet endings', sortOrder: 30 },
        { name: 'Drinks', slug: 'drinks', description: 'Crafted beverages', sortOrder: 40 },
      ])
      .returning();
    const categoryBySlug = Object.fromEntries(categories.map((c) => [c.slug, c]));

    // ── Menu items (deterministic showcase fixture) ───────────────────
    const rawItems = [
      { name: 'Foie Gras Spring Rolls', slug: 'foie-gras-spring-rolls', description: 'Crispy rice paper rolls stuffed with duck liver pate, wood ear mushrooms, and served with a tangy ginger-plum dipping sauce.', price: 18, category: 'starters', tags: ['Signature', 'Popular'], image: '/images/menu/foie-gras-rolls.png', chefChoice: true },
      { name: 'Truffle Rice Cakes (Bánh Bột Lọc)', slug: 'truffle-rice-cakes', description: 'Chewy tapioca dumplings filled with caramelized tiger prawns, served with a shaved black truffle fish sauce emulsion.', price: 16, category: 'starters', tags: ['Truffle', 'Seafood'], image: '/images/menu/truffle-dumplings.png' },
      { name: 'Lotus Root Salad (Gỏi Ngó Sen)', slug: 'lotus-root-salad', description: 'Crisp lotus rootlets, organic shredded chicken, fresh herbs, tossed in a passionfruit vinaigrette topped with roasted peanuts.', price: 14, category: 'starters', tags: ['Light', 'Gluten-Free'], image: '/images/menu/lotus-salad.png' },
      { name: 'Imperial Tofu Sticks', slug: 'imperial-tofu-sticks', description: 'Handmade organic tofu coated in crispy green sticky rice flakes, served with a chili-lemongrass soy reduction.', price: 12, category: 'starters', tags: ['Vegetarian', 'Gluten-Free'], image: '/images/menu/tofu-sticks.png', vegetarian: true },
      { name: 'A5 Wagyu Beef Phở', slug: 'a5-wagyu-beef-pho', description: 'Slow-simmered 36-hour bone broth infused with star anise and cinnamon, served with premium A5 Wagyu slices, fresh hand-cut rice noodles, and local herbs.', price: 42, category: 'mains', tags: ['Luxury', 'Must-Try'], image: '/images/menu/wagyu-pho.png', chefChoice: true },
      { name: 'Caramelized Black Cod (Cá Kho Tộ)', slug: 'caramelized-black-cod', description: 'Fresh cod fillet braised in a claypot with a rich coconut water glaze, black pepper, and served with organic jasmine rice.', price: 36, category: 'mains', tags: ['Seafood', 'Traditional Tech'], image: '/images/menu/black-cod.png' },
      { name: 'Lemongrass Lemousin Duck Leg', slug: 'lemongrass-duck-leg', description: 'Confit duck leg glazed with local honey and wild lemongrass, served on a bed of sweet potato purée and baby bok choy.', price: 32, category: 'mains', tags: ['Fusion', 'Rich'], image: '/images/menu/duck-leg.png' },
      { name: 'Claypot Lemongrass Portobello', slug: 'claypot-lemongrass-portobello', description: 'Meaty Portobello mushrooms simmered in a claypot with local vegetables, chili, lemongrass, and dynamic soy glaze.', price: 24, category: 'mains', tags: ['Vegetarian', 'Claypot'], image: '/images/menu/claypot-mushrooms.png', vegetarian: true },
      { name: 'Passionfruit Coconut Panna Cotta', slug: 'passionfruit-coconut-panna-cotta', description: 'Silky coconut milk panna cotta topped with a tangy passionfruit gelée, served with crushed sesame brittle.', price: 10, category: 'desserts', tags: ['Light', 'Tropical'], image: '/images/menu/coconut-pannacotta.png' },
      { name: 'Maro Chocolate Lava Cake', slug: 'maro-chocolate-lava-cake', description: 'Warm molten cake made with single-origin Vietnamese chocolate, infused with Dalat espresso, served with vanilla bean ice cream.', price: 12, category: 'desserts', tags: ['Decadent', 'Chocolate'], image: '/images/menu/chocolate-lava.png', chefChoice: true },
      { name: 'Ginger Lotus Seed Soup (Chè Sen)', slug: 'ginger-lotus-seed-soup', description: 'A comforting traditional sweet soup with lotus seeds, longan fruit, and a warm ginger syrup served chilled.', price: 8, category: 'desserts', tags: ['Traditional', 'Vegan'], image: '/images/menu/che-sen.png', vegetarian: true },
      { name: 'Egg Coffee Martini', slug: 'egg-coffee-martini', description: 'A luxurious blend of house espresso, premium vodka, coffee liqueur, topped with a rich, velvety whipped egg yolk foam.', price: 15, category: 'drinks', tags: ['Alcoholic', 'Vietnamese Coffee'], image: '/images/menu/egg-martini.png', chefChoice: true },
      { name: 'Kumquat Lemongrass Cooler', slug: 'kumquat-lemongrass-cooler', description: 'Refreshing muddle of fresh kumquats, lemongrass stalks, and sparkling mineral water with a hint of wild forest honey.', price: 8, category: 'drinks', tags: ['Non-Alcoholic', 'Mocktail'], image: '/images/menu/kumquat-cooler.png', vegetarian: true },
      { name: 'Lotus Tea (Trà Sen Tây Hồ)', slug: 'lotus-tea', description: 'Premium green tea leaves scented naturally in fresh lotus blossoms, brewed at high precision and served hot.', price: 6, category: 'drinks', tags: ['Hot Tea', 'Traditional'], image: '/images/menu/lotus-tea.png', vegetarian: true },
    ];

    const items = await db
      .insert(schema.menuItems)
      .values(
        rawItems.map((item, index) => ({
          name: item.name,
          slug: item.slug,
          description: item.description,
          priceCents: item.price * 100,
          imagePath: item.image,
          categoryId: categoryBySlug[item.category].id,
          dietaryTags: item.vegetarian ? ['Vegetarian'] : [],
          isFeatured: item.chefChoice ?? false,
          isAvailable: true,
          sortOrder: (index + 1) * 10,
        })),
      )
      .returning();
    const itemBySlug = Object.fromEntries(items.map((item) => [item.slug, item]));

    // Demo: one permanently sold-out item (Lotus Tea).
    await db
      .update(schema.menuItems)
      .set({ isAvailable: false })
      .where(sql`${schema.menuItems.slug} = ${'lotus-tea'}`);

    // ── Modifiers (subset of items, per product spec) ─────────────────
    const wagyuPho = itemBySlug['a5-wagyu-beef-pho'];
    const eggMartini = itemBySlug['egg-coffee-martini'];
    const lavaCake = itemBySlug['maro-chocolate-lava-cake'];

    const [phoSizeG, phoExtrasG, sweetnessG, iceG] = await db
      .insert(schema.modifierGroups)
      .values([
        { name: 'Size', minSelections: 1, maxSelections: 1, isRequired: true, sortOrder: 10 },
        { name: 'Extras', minSelections: 0, maxSelections: 3, isRequired: false, sortOrder: 20 },
        { name: 'Sweetness', minSelections: 1, maxSelections: 1, isRequired: true, sortOrder: 10 },
        { name: 'Ice Cream', minSelections: 1, maxSelections: 1, isRequired: true, sortOrder: 10 },
      ])
      .returning();

    await db
      .insert(schema.modifierOptions)
      .values([
        { modifierGroupId: phoSizeG.id, name: 'Regular', priceDeltaCents: 0, sortOrder: 10 },
        { modifierGroupId: phoSizeG.id, name: 'Large', priceDeltaCents: 800, sortOrder: 20 },
      ]);
    await db
      .insert(schema.modifierOptions)
      .values([
        { modifierGroupId: phoExtrasG.id, name: 'Extra Wagyu', priceDeltaCents: 1200, sortOrder: 10 },
        { modifierGroupId: phoExtrasG.id, name: 'Soft Egg', priceDeltaCents: 200, sortOrder: 20 },
        { modifierGroupId: phoExtrasG.id, name: 'Extra Noodles', priceDeltaCents: 300, sortOrder: 30 },
      ]);
    await db
      .insert(schema.modifierOptions)
      .values([
        { modifierGroupId: sweetnessG.id, name: '0% Sweetness', priceDeltaCents: 0, sortOrder: 10 },
        { modifierGroupId: sweetnessG.id, name: '50% Sweetness', priceDeltaCents: 0, sortOrder: 20 },
        { modifierGroupId: sweetnessG.id, name: '100% Sweetness', priceDeltaCents: 0, sortOrder: 30 },
      ]);
    await db
      .insert(schema.modifierOptions)
      .values([
        { modifierGroupId: iceG.id, name: '1 Scoop Vanilla', priceDeltaCents: 0, sortOrder: 10 },
        { modifierGroupId: iceG.id, name: '2 Scoops Vanilla', priceDeltaCents: 250, sortOrder: 20 },
      ]);

    await db.insert(schema.menuItemModifierGroups).values([
      { menuItemId: wagyuPho.id, modifierGroupId: phoSizeG.id },
      { menuItemId: wagyuPho.id, modifierGroupId: phoExtrasG.id },
      { menuItemId: eggMartini.id, modifierGroupId: sweetnessG.id },
      { menuItemId: lavaCake.id, modifierGroupId: iceG.id },
    ]);

    // ── Dining tables ─────────────────────────────────────────────────
    const tables = await db
      .insert(schema.diningTables)
      .values([
        { name: 'T01', capacity: 2, area: 'Main Dining', sortOrder: 10 },
        { name: 'T02', capacity: 2, area: 'Main Dining', sortOrder: 20 },
        { name: 'T03', capacity: 4, area: 'Main Dining', sortOrder: 30 },
        { name: 'T04', capacity: 4, area: 'Main Dining', sortOrder: 40 },
        { name: 'T05', capacity: 6, area: 'Main Dining', sortOrder: 50 },
        { name: 'P01', capacity: 8, area: 'Private Dining', isPrivate: true, sortOrder: 60 },
      ])
      .returning();
    const tableByCapacity = (capacity: number) =>
      tables.filter((t) => t.capacity === capacity).map((t) => t.id);

    // ── Reservations (relative to today, restaurant local time) ───────
    const today = dateOffset(0);
    const tomorrow = dateOffset(1);
    const yesterday = dateOffset(-1);

    const reservationSeeds: {
      code: string;
      name: string;
      email: string;
      phone: string;
      partySize: number;
      date: string;
      time: string;
      status: (typeof schema.reservationStatusEnum.enumValues)[number];
      source?: 'online' | 'staff';
      notes?: string;
      capacity: number; // which table capacity to assign
    }[] = [
      // Yesterday — historical records
      { code: 'SV-DEMO01', name: 'Anna Kim', email: 'anna@example.com', phone: '+84901234567', partySize: 2, date: yesterday, time: '18:00', status: 'COMPLETED', capacity: 2 },
      { code: 'SV-DEMO02', name: 'David Tran', email: 'david@example.com', phone: '+84902345678', partySize: 4, date: yesterday, time: '19:30', status: 'NO_SHOW', capacity: 4 },
      { code: 'SV-DEMO03', name: 'Mai Le', email: 'mai@example.com', phone: '+84903456789', partySize: 6, date: yesterday, time: '12:00', status: 'COMPLETED', capacity: 6 },
      { code: 'SV-DEMO04', name: 'Peter Vo', email: 'peter@example.com', phone: '+84904567890', partySize: 2, date: yesterday, time: '20:00', status: 'CANCELLED', capacity: 2 },
      // Today — live board
      { code: 'SV-DEMO05', name: 'Linh Pham', email: 'linh@example.com', phone: '+84905678901', partySize: 4, date: today, time: '12:00', status: 'COMPLETED', capacity: 4 },
      { code: 'SV-DEMO06', name: 'Hung Nguyen', email: 'hung@example.com', phone: '+84906789012', partySize: 2, date: today, time: '17:30', status: 'SEATED', capacity: 2, notes: 'Anniversary — window table preferred.' },
      { code: 'SV-DEMO07', name: 'Trang Do', email: 'trang@example.com', phone: '+84907890123', partySize: 4, date: today, time: '18:30', status: 'CONFIRMED', capacity: 4 },
      { code: 'SV-DEMO08', name: 'Marco Rossi', email: 'marco@example.com', phone: '+84908901234', partySize: 6, date: today, time: '19:00', status: 'CONFIRMED', capacity: 6, source: 'staff' },
      { code: 'SV-DEMO09', name: 'Nhu Hoang', email: 'nhu@example.com', phone: '+84909012345', partySize: 2, date: today, time: '20:00', status: 'CONFIRMED', capacity: 2 },
      // Tomorrow — upcoming
      { code: 'SV-DEMO10', name: 'Elena Volkova', email: 'elena@example.com', phone: '+84901235678', partySize: 8, date: tomorrow, time: '18:00', status: 'CONFIRMED', capacity: 8, notes: 'Private dining — birthday celebration.' },
      { code: 'SV-DEMO11', name: 'Khoa Bui', email: 'khoa@example.com', phone: '+84902346789', partySize: 4, date: tomorrow, time: '12:30', status: 'CONFIRMED', capacity: 4 },
      { code: 'SV-DEMO12', name: 'Sofia Anders', email: 'sofia@example.com', phone: '+84903457890', partySize: 2, date: tomorrow, time: '19:30', status: 'CONFIRMED', capacity: 2 },
    ];

    const usedTables = new Set<string>();
    for (const r of reservationSeeds) {
      const { startsAt, endsAt } = localSlots(r.date, [r.time])[0];
      const candidate = tableByCapacity(r.capacity).find((id) => !usedTables.has(id));
      const tableId = candidate ?? tableByCapacity(r.capacity)[0];
      usedTables.add(tableId);
      const [reservation] = await db
        .insert(schema.reservations)
        .values({
          confirmationCode: r.code,
          customerName: r.name,
          customerEmail: r.email,
          customerPhone: r.phone,
          partySize: r.partySize,
          startsAt,
          endsAt,
          status: r.status,
          source: r.source ?? 'online',
          notes: r.notes,
        })
        .returning();
      await db.insert(schema.reservationTables).values({ reservationId: reservation.id, tableId });
    }

    // ── Orders (relative dates, immutable snapshots) ──────────────────
    const wagyuPhoItem = itemBySlug['a5-wagyu-beef-pho'];
    const lavaItem = itemBySlug['maro-chocolate-lava-cake'];
    const eggMartiniItem = itemBySlug['egg-coffee-martini'];
    const tofuItem = itemBySlug['imperial-tofu-sticks'];
    const duckItem = itemBySlug['lemongrass-duck-leg'];

    interface SeedOrderItem {
      itemId: string;
      name: string;
      unitPriceCents: number;
      quantity: number;
      modifiers: { group: string; option: string; delta: number }[];
      instructions?: string;
    }

    function computeTotals(fulfillment: 'pickup' | 'delivery', lineItems: SeedOrderItem[]) {
      const subtotal = lineItems.reduce(
        (sum, line) =>
          sum +
          line.quantity *
            (line.unitPriceCents + line.modifiers.reduce((m, mod) => m + mod.delta, 0)),
        0,
      );
      const deliveryFeeCents =
        fulfillment === 'delivery' ? restaurantConfig.delivery.feeCents : 0;
      const taxCents = percentOfCents(subtotal, restaurantConfig.taxRateBps);
      return { subtotal, deliveryFeeCents, taxCents, total: subtotal + deliveryFeeCents + taxCents };
    }

    async function insertOrder(seed: {
      code: string;
      name: string;
      email: string;
      phone: string;
      fulfillment: 'pickup' | 'delivery';
      status: (typeof schema.orderStatusEnum.enumValues)[number];
      payment: (typeof schema.paymentStatusEnum.enumValues)[number];
      dayOffset: number;
      time?: string;
      address?: { line1: string; district: string; city: string; notes?: string };
      lines: SeedOrderItem[];
      notes?: string;
      stripePaid?: boolean;
    }) {
      const { subtotal, deliveryFeeCents, taxCents, total } = computeTotals(
        seed.fulfillment,
        seed.lines,
      );
      const scheduledFor =
        seed.time === undefined ? null : localToUtc(dateOffset(seed.dayOffset), seed.time);

      const [order] = await db
        .insert(schema.orders)
        .values({
          publicCode: seed.code,
          customerName: seed.name,
          customerEmail: seed.email,
          customerPhone: seed.phone,
          fulfillmentType: seed.fulfillment,
          scheduledFor,
          deliveryAddress: seed.address ?? null,
          status: seed.status,
          paymentStatus: seed.payment,
          currency: 'USD',
          subtotalCents: subtotal,
          deliveryFeeCents,
          taxCents,
          totalCents: total,
          customerNotes: seed.notes,
          checkoutKey: `seed-${seed.code.toLowerCase()}`,
          stripeCheckoutSessionId: seed.stripePaid ? `cs_seed_${seed.code.toLowerCase()}` : null,
          createdAt: localToUtc(dateOffset(seed.dayOffset), seed.time ?? '12:00'),
        })
        .returning();

      if (seed.stripePaid) {
        await db.insert(schema.payments).values({
          orderId: order.id,
          stripeSessionId: `cs_seed_${seed.code.toLowerCase()}`,
          amountCents: total,
          currency: 'USD',
          status: 'paid',
        });
      }

      for (const line of seed.lines) {
        const lineTotal =
          (line.unitPriceCents + line.modifiers.reduce((m, mod) => m + mod.delta, 0)) *
          line.quantity;
        const [orderItem] = await db
          .insert(schema.orderItems)
          .values({
            orderId: order.id,
            menuItemId: line.itemId,
            itemName: line.name,
            unitPriceCents: line.unitPriceCents,
            quantity: line.quantity,
            lineTotalCents: lineTotal,
            specialInstructions: line.instructions,
          })
          .returning();
        for (const mod of line.modifiers) {
          await db.insert(schema.orderItemModifiers).values({
            orderItemId: orderItem.id,
            groupName: mod.group,
            optionName: mod.option,
            priceDeltaCents: mod.delta,
          });
        }
      }
    }

    const todayOrders = [
      {
        code: 'SV-ORD-2401', name: 'Quynh Anh', email: 'quynh@example.com', phone: '+84901112233',
        fulfillment: 'pickup' as const, status: 'NEW' as const, payment: 'PAID' as const,
        dayOffset: 0, time: '18:15',
        lines: [
          { itemId: wagyuPhoItem.id, name: wagyuPhoItem.name, unitPriceCents: wagyuPhoItem.priceCents, quantity: 1, modifiers: [{ group: 'Size', option: 'Regular', delta: 0 }, { group: 'Extras', option: 'Extra Wagyu', delta: 1200 }], instructions: 'Broth on the side.' },
          { itemId: eggMartiniItem.id, name: eggMartiniItem.name, unitPriceCents: eggMartiniItem.priceCents, quantity: 2, modifiers: [{ group: 'Sweetness', option: '50% Sweetness', delta: 0 }] },
        ],
        notes: 'Ring the bell on arrival.',
        stripePaid: true,
      },
      {
        code: 'SV-ORD-2402', name: 'Huy Le', email: 'huy@example.com', phone: '+84902223344',
        fulfillment: 'delivery' as const, status: 'PREPARING' as const, payment: 'PAID' as const,
        dayOffset: 0, time: '19:00',
        address: { line1: '12 Nguyen Hue', district: 'District 1', city: 'Ho Chi Minh City' },
        lines: [
          { itemId: duckItem.id, name: duckItem.name, unitPriceCents: duckItem.priceCents, quantity: 2, modifiers: [] },
          { itemId: lavaItem.id, name: lavaItem.name, unitPriceCents: lavaItem.priceCents, quantity: 1, modifiers: [{ group: 'Ice Cream', option: '2 Scoops Vanilla', delta: 250 }] },
        ],
        stripePaid: true,
      },
      {
        code: 'SV-ORD-2403', name: 'Ngan Pham', email: 'ngan@example.com', phone: '+84903334455',
        fulfillment: 'pickup' as const, status: 'READY' as const, payment: 'PAID' as const,
        dayOffset: 0, time: '17:45',
        lines: [
          { itemId: tofuItem.id, name: tofuItem.name, unitPriceCents: tofuItem.priceCents, quantity: 1, modifiers: [] },
        ],
        stripePaid: true,
      },
      {
        code: 'SV-ORD-2404', name: 'Tom Baker', email: 'tom@example.com', phone: '+84904445566',
        fulfillment: 'pickup' as const, status: 'PENDING' as const, payment: 'UNPAID' as const,
        dayOffset: 0, time: '20:00',
        lines: [
          { itemId: wagyuPhoItem.id, name: wagyuPhoItem.name, unitPriceCents: wagyuPhoItem.priceCents, quantity: 1, modifiers: [{ group: 'Size', option: 'Large', delta: 800 }] },
        ],
        notes: 'Abandoned checkout demo.',
      },
      {
        code: 'SV-ORD-2405', name: 'Grace Liu', email: 'grace@example.com', phone: '+84905556677',
        fulfillment: 'delivery' as const, status: 'CANCELLED' as const, payment: 'UNPAID' as const,
        dayOffset: 0, time: '18:30',
        address: { line1: '88 Vo Van Tan', district: 'District 3', city: 'Ho Chi Minh City' },
        lines: [
          { itemId: tofuItem.id, name: tofuItem.name, unitPriceCents: tofuItem.priceCents, quantity: 2, modifiers: [] },
        ],
      },
    ];

    for (const o of todayOrders) await insertOrder(o);

    await insertOrder({
      code: 'SV-ORD-1901', name: 'Minh Chau', email: 'minh@example.com', phone: '+84906667788',
      fulfillment: 'pickup' as const, status: 'COMPLETED' as const, payment: 'PAID' as const,
      dayOffset: -1, time: '12:30',
      lines: [
        { itemId: wagyuPhoItem.id, name: wagyuPhoItem.name, unitPriceCents: wagyuPhoItem.priceCents, quantity: 2, modifiers: [{ group: 'Size', option: 'Regular', delta: 0 }, { group: 'Extras', option: 'Soft Egg', delta: 200 }, { group: 'Extras', option: 'Extra Noodles', delta: 300 }] },
      ],
      stripePaid: true,
    });
    await insertOrder({
      code: 'SV-ORD-1902', name: 'Oscar Diaz', email: 'oscar@example.com', phone: '+84907778899',
      fulfillment: 'delivery' as const, status: 'COMPLETED' as const, payment: 'PAID' as const,
      dayOffset: -1, time: '19:00',
      address: { line1: '5 Nguyen Du', district: 'District 1', city: 'Ho Chi Minh City', notes: 'Landmark 81 tower' },
      lines: [
        { itemId: duckItem.id, name: duckItem.name, unitPriceCents: duckItem.priceCents, quantity: 1, modifiers: [] },
        { itemId: eggMartiniItem.id, name: eggMartiniItem.name, unitPriceCents: eggMartiniItem.priceCents, quantity: 1, modifiers: [{ group: 'Sweetness', option: '100% Sweetness', delta: 0 }] },
      ],
      stripePaid: true,
    });

    // ── Contact inquiry + newsletter samples ──────────────────────────
    await db.insert(schema.contactInquiries).values({
      name: 'Sample Guest',
      email: 'guest@example.com',
      subject: 'Private dining inquiry',
      message: 'We would like to book the private room for 12 guests next month. Do you offer a set menu?',
    });
    await db.insert(schema.newsletterSubscribers).values({
      email: 'subscriber@example.com',
    });

    // ── Admin profile (only when an id is supplied explicitly) ────────
    if (SEED_ADMIN_USER_ID) {
      await db.insert(schema.adminProfiles).values({
        userId: SEED_ADMIN_USER_ID,
        displayName: 'Restaurant Manager',
        role: 'ADMIN',
      });
    }

    console.log(`Seeded ${url.split('@').pop()}: ${categories.length} categories, ${items.length} menu items, ${tables.length} tables, ${reservationSeeds.length} reservations, orders demo data.`);
  } finally {
    await client.end();
  }
}
