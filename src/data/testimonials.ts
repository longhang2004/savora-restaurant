export interface Testimonial {
  id: string;
  name: string;
  role: string;
  rating: number;
  content: string;
  image: string;
}

export const testimonials: Testimonial[] = [
  {
    id: 't1',
    name: 'Eleanor Vance',
    role: 'Global Gastronomy Critic',
    rating: 5,
    content: 'Savora completely redefines what Vietnamese cuisine can be. The Wagyu Phở broth has a depth of flavor that is truly legendary. The space is beautiful and the attention to detail is remarkable.',
    image: '/images/reviews/eleanor.png',
  },
  {
    id: 't2',
    name: 'Minh Nguyen',
    role: 'F&B Consultant & Writer',
    rating: 5,
    content: 'The Foie Gras Spring Rolls are absolute genius. I loved how they respected traditional Vietnamese culinary roots while introducing luxurious global ingredients. A must-visit in Saigon.',
    image: '/images/reviews/minh.png',
  },
  {
    id: 't3',
    name: 'Sarah Jenkins',
    role: 'Michelin Guide Reviewer',
    rating: 5,
    content: 'An extraordinary dining experience. From the floating glassmorphism design details to the flawless egg coffee martini, Savora delivers excellence on all fronts. Highly recommended.',
    image: '/images/reviews/sarah.png',
  },
];
