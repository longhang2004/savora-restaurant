import React from 'react';
import Hero from '@/components/home/Hero';
import FeaturedDishes from '@/components/home/FeaturedDishes';
import StoryPreview from '@/components/home/StoryPreview';
import Testimonials from '@/components/home/Testimonials';
import ReservationCTA from '@/components/home/ReservationCTA';

export default function Home() {
  return (
    <>
      <Hero />
      <FeaturedDishes />
      <StoryPreview />
      <Testimonials />
      <ReservationCTA />
    </>
  );
}
