import React from 'react';
import MenuContainer from '@/components/menu/MenuContainer';
import { generatePageMetadata } from '@/lib/metadata';

export const metadata = generatePageMetadata({
  title: 'Culinary Menu',
  description: 'Explore Savora’s premium Vietnamese-Fusion menu. Taste our signature Wagyu Beef Phở, Foie Gras Spring Rolls, and crafted cocktails.',
  path: '/menu',
  keywords: ['savora menu', 'vietnamese fusion menu', 'luxury pho saigon', 'egg coffee martini'],
});

export default function MenuPage() {
  return <MenuContainer />;
}
