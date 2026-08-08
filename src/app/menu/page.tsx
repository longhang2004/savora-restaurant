import React from 'react';
import MenuContainer from '@/components/menu/MenuContainer';
import { getPublicMenu } from '@/features/menu/queries';
import { generatePageMetadata } from '@/lib/metadata';
import { generateMenuSchema } from '@/lib/structured-data';

export const metadata = generatePageMetadata({
  title: 'Culinary Menu',
  description:
    'Explore Savora’s premium Vietnamese-Fusion menu. Taste our signature Wagyu Beef Phở, Foie Gras Spring Rolls, and crafted cocktails.',
  path: '/menu',
  keywords: ['savora menu', 'vietnamese fusion menu', 'luxury pho saigon', 'egg coffee martini'],
});

// Menu comes from the database so sold-out states and prices stay live.
export const dynamic = 'force-dynamic';

export default async function MenuPage() {
  const menu = await getPublicMenu();
  const menuSchema = generateMenuSchema(menu.items);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(menuSchema) }}
      />
      <MenuContainer menu={menu} />
    </>
  );
}
