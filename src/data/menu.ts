export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number; // in USD or VND (we will use USD for international freelance appeal)
  category: 'starters' | 'mains' | 'desserts' | 'drinks';
  tags: string[];
  image: string;
  spicy?: boolean;
  vegetarian?: boolean;
  chefChoice?: boolean;
}

export const menuItems: MenuItem[] = [
  // Starters
  {
    id: 's1',
    name: 'Foie Gras Spring Rolls',
    description: 'Crispy rice paper rolls stuffed with duck liver pate, wood ear mushrooms, and served with a tangy ginger-plum dipping sauce.',
    price: 18,
    category: 'starters',
    tags: ['Signature', 'Popular'],
    image: '/images/menu/foie-gras-rolls.png',
    chefChoice: true,
  },
  {
    id: 's2',
    name: 'Truffle Rice Cakes (Bánh Bột Lọc)',
    description: 'Chewy tapioca dumplings filled with caramelized tiger prawns, served with a shaved black truffle fish sauce emulsion.',
    price: 16,
    category: 'starters',
    tags: ['Truffle', 'Seafood'],
    image: '/images/menu/truffle-dumplings.png',
  },
  {
    id: 's3',
    name: 'Lotus Root Salad (Gỏi Ngó Sen)',
    description: 'Crisp lotus rootlets, organic shredded chicken, fresh herbs, tossed in a passionfruit vinaigrette topped with roasted peanuts.',
    price: 14,
    category: 'starters',
    tags: ['Light', 'Gluten-Free'],
    image: '/images/menu/lotus-salad.png',
    vegetarian: false,
  },
  {
    id: 's4',
    name: 'Imperial Tofu Sticks',
    description: 'Handmade organic tofu coated in crispy green sticky rice flakes, served with a chili-lemongrass soy reduction.',
    price: 12,
    category: 'starters',
    tags: ['Vegetarian', 'Gluten-Free'],
    image: '/images/menu/tofu-sticks.png',
    vegetarian: true,
  },

  // Mains
  {
    id: 'm1',
    name: 'A5 Wagyu Beef Phở',
    description: 'Slow-simmered 36-hour bone broth infused with star anise and cinnamon, served with premium A5 Wagyu slices, fresh hand-cut rice noodles, and local herbs.',
    price: 42,
    category: 'mains',
    tags: ['Luxury', 'Must-Try'],
    image: '/images/menu/wagyu-pho.png',
    chefChoice: true,
  },
  {
    id: 'm2',
    name: 'Caramelized Black Cod (Cá Kho Tộ)',
    description: 'Fresh cod fillet braised in a claypot with a rich coconut water glaze, black pepper, and served with organic jasmine rice.',
    price: 36,
    category: 'mains',
    tags: ['Seafood', 'Traditional Tech'],
    image: '/images/menu/black-cod.png',
  },
  {
    id: 'm3',
    name: 'Lemongrass Lemousin Duck Leg',
    description: 'Confit duck leg glazed with local honey and wild lemongrass, served on a bed of sweet potato purée and baby bok choy.',
    price: 32,
    category: 'mains',
    tags: ['Fusion', 'Rich'],
    image: '/images/menu/duck-leg.png',
  },
  {
    id: 'm4',
    name: 'Claypot Lemongrass Portobello',
    description: 'Meaty Portobello mushrooms simmered in a claypot with local vegetables, chili, lemongrass, and dynamic soy glaze.',
    price: 24,
    category: 'mains',
    tags: ['Vegetarian', 'Claypot'],
    image: '/images/menu/claypot-mushrooms.png',
    vegetarian: true,
  },

  // Desserts
  {
    id: 'd1',
    name: 'Passionfruit Coconut Panna Cotta',
    description: 'Silky coconut milk panna cotta topped with a tangy passionfruit gelée, served with crushed sesame brittle.',
    price: 10,
    category: 'desserts',
    tags: ['Light', 'Tropical'],
    image: '/images/menu/coconut-pannacotta.png',
  },
  {
    id: 'd2',
    name: 'Maro Chocolate Lava Cake',
    description: 'Warm molten cake made with single-origin Vietnamese chocolate, infused with Dalat espresso, served with vanilla bean ice cream.',
    price: 12,
    category: 'desserts',
    tags: ['Decadent', 'Chocolate'],
    image: '/images/menu/chocolate-lava.png',
    chefChoice: true,
  },
  {
    id: 'd3',
    name: 'Ginger Lotus Seed Soup (Chè Sen)',
    description: 'A comforting traditional sweet soup with lotus seeds, longan fruit, and a warm ginger syrup served chilled.',
    price: 8,
    category: 'desserts',
    tags: ['Traditional', 'Vegan'],
    image: '/images/menu/che-sen.png',
    vegetarian: true,
  },

  // Drinks
  {
    id: 'dr1',
    name: 'Egg Coffee Martini',
    description: 'A luxurious blend of house espresso, premium vodka, coffee liqueur, topped with a rich, velvety whipped egg yolk foam.',
    price: 15,
    category: 'drinks',
    tags: ['Alcoholic', 'Vietnamese Coffee'],
    image: '/images/menu/egg-martini.png',
    chefChoice: true,
  },
  {
    id: 'dr2',
    name: 'Kumquat Lemongrass Cooler',
    description: 'Refreshing muddle of fresh kumquats, lemongrass stalks, and sparkling mineral water with a hint of wild forest honey.',
    price: 8,
    category: 'drinks',
    tags: ['Non-Alcoholic', 'Mocktail'],
    image: '/images/menu/kumquat-cooler.png',
    vegetarian: true,
  },
  {
    id: 'dr3',
    name: 'Lotus Tea (Trà Sen Tây Hồ)',
    description: 'Premium green tea leaves scented naturally in fresh lotus blossoms, brewed at high precision and served hot.',
    price: 6,
    category: 'drinks',
    tags: ['Hot Tea', 'Traditional'],
    image: '/images/menu/lotus-tea.png',
    vegetarian: true,
  },
];
