import React from 'react';
import Hero from '@/components/home/Hero';
import FeaturedDishes from '@/components/home/FeaturedDishes';
import StoryPreview from '@/components/home/StoryPreview';
import Testimonials from '@/components/home/Testimonials';
import ReservationCTA from '@/components/home/ReservationCTA';
import { getFeaturedMenuItems } from '@/features/menu/queries';

// Featured dishes are database-backed (is_featured + is_available).
export const dynamic = 'force-dynamic';

export default async function Home() {
  const featuredItems = await getFeaturedMenuItems(3);

  return (
    <>
      <Hero />
      <FeaturedDishes items={featuredItems} />
      <StoryPreview />
      <Testimonials />
      <ReservationCTA />
    </>
  );
}
