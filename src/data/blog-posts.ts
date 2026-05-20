export interface BlogPost {
  id: string;
  title: string;
  description: string;
  slug: string;
  date: string;
  author: string;
  readingTime: string;
  image: string;
  tags: string[];
  keywords: string[];
  content: string; // HTML-like string to render
}

export const blogPosts: BlogPost[] = [
  {
    id: 'b1',
    title: 'The Art of Vietnamese Phở: A 200-Year Gastronomic Journey',
    description: 'Explore the historical evolution of Vietnam’s national dish, from its humble origins in northern villages to modern Michelin-starred interpretations.',
    slug: 'art-of-vietnamese-pho',
    date: 'May 15, 2026',
    author: 'Chef Hoang Lam',
    readingTime: '5 min read',
    image: '/images/blog/pho-history.png',
    tags: ['Culinary History', 'Recipes', 'Tradition'],
    keywords: ['vietnamese pho history', 'origins of beef pho', 'traditional pho broth', 'vietnamese national dish', 'pho history'],
    content: `
      <p>Phở is more than just a soup; it is the culinary heartbeat of Vietnam. Respected worldwide as one of the ultimate comfort foods, the origins of this noodle soup are deeply tied to the cultural crossroads of northern Vietnam in the late 19th and early 20th centuries.</p>
      
      <h2>The Northern Origins (Nam Định & Hanoi)</h2>
      <p>Historians generally agree that Phở was born in the Nam Định province, south of Hanoi. It emerged as a street food during the French colonial era, blending Vietnamese rice noodles (bánh phở), French preferences for beef broth, and Chinese spices. Street vendors carried mobile kitchens on wooden poles called <i>gánh phở</i>, serving early morning workers with fragrant bowls of hot broth, beef, and flat rice noodles.</p>
      
      <h2>The Golden Ratio of Spices</h2>
      <p>What makes a great Phở? The secret lies entirely in the broth. At Savora, we simmer our beef marrow bones for over 36 hours. But bones alone do not create that iconic aroma. It requires a precise balance of charred aromatics and sweet spices:</p>
      <ul>
        <li>Charred ginger and shallots for earthy warmth</li>
        <li>Star anise, cinnamon bark, and cloves for sweetness</li>
        <li>Black cardamom (thảo quả) for smoky depth</li>
        <li>Coriander seeds and fennel for citrus-herb notes</li>
      </ul>
      
      <h2>The Great Divide: North vs. South</h2>
      <p>As Phở migrated south in 1954, it underwent a major transformation. In Hanoi (North), <b>Phở Bắc</b> remains minimalist, focusing on a clear, clean broth and minimal garnishes. In Saigon (South), <b>Phở Nam</b> became sweeter, served with a mountain of fresh herbs (thai basil, culantro, rice paddy herb), bean sprouts, and sweet hoisin and chili sauces.</p>
      
      <blockquote>
        "Phở represents the resilience of Vietnamese culinary culture—retaining its soul while adapting to new eras and global tastes."
      </blockquote>
      
      <h2>Savora's Modern Interpretation</h2>
      <p>At Savora, we honor this heritage by serving a 36-hour broth cooked with traditional spices, but we elevate it with paper-thin slices of A5 Wagyu beef. The intense marbling of the Wagyu melts directly into the steaming hot broth, releasing a rich flavor profile that marries historic roots with modern luxury. We invite you to experience this timeless masterpiece on your next visit.</p>
    `,
  },
  {
    id: 'b2',
    title: '5 Vietnamese Coffee Brewing Methods You Should Try',
    description: 'Beyond the traditional Phin filter—discover the diverse and rich world of Vietnamese coffee culture, from egg foam to salted recipes.',
    slug: 'vietnamese-coffee-brewing-methods',
    date: 'May 08, 2026',
    author: 'Barista Quynh Chi',
    readingTime: '4 min read',
    image: '/images/blog/coffee-brewing.png',
    tags: ['Coffee Culture', 'Beverages', 'How-To'],
    keywords: ['vietnamese coffee phin filter', 'vietnamese egg coffee recipe', 'salt coffee vietnam', 'robusta coffee bean', 'hanoi egg coffee'],
    content: `
      <p>Vietnam is the world's second-largest exporter of coffee, dominated by the robust Robusta bean. Over the decades, Vietnamese coffee culture has developed a highly distinct character, featuring slow brewing methods and indulgent additions like condensed milk, whipped egg, or salted cream.</p>
      
      <h2>1. The Traditional Phin Filter (Cà Phê Phin)</h2>
      <p>The Phin filter is a small metal chamber that sits directly on top of a glass. Coffee grinds are placed inside, pressed lightly with a gravity damper, and hot water is poured over. The coffee drips slowly—drop by drop—into condensed milk. This slow drip is a meditative ritual, prompting coffee drinkers to slow down and enjoy the passing time.</p>
      
      <h2>2. Hanoi Egg Coffee (Cà Phê Trứng)</h2>
      <p>Created in Hanoi in the 1940s during a milk shortage, egg coffee substitutes condensed milk with whipped egg yolks, sugar, and honey. The result is a thick, custard-like foam floating on top of strong black Robusta coffee. It is sweet, creamy, and resembles a coffee-infused tiramisu dessert.</p>
      
      <h2>3. Salt Coffee (Cà Phê Muối)</h2>
      <p>Originating from the historic city of Hue, Salt Coffee combines bold Vietnamese coffee, condensed milk, and a layer of lightly salted whipped cream. The salt plays an essential role: it cuts through the bitterness of the robusta beans and balances the heavy sweetness of the condensed milk, bringing out a smooth caramel-like flavor.</p>
      
      <h2>4. Coconut Coffee (Cà Phê Cốt Dừa)</h2>
      <p>A modern favorite, this drink features a slushy-like mixture of coconut cream, condensed milk, and ice, blended together and poured over a shot of strong Vietnamese coffee. It is the ultimate tropical refreshment for Saigon's hot afternoons.</p>
      
      <h2>5. Savora's Egg Coffee Martini</h2>
      <p>At Savora, we bring coffee culture into the evening. Our signature <b>Egg Coffee Martini</b> infuses cold-brewed Vietnamese Robusta with premium vodka and coffee liqueur, topped with a velvety, hand-whipped sweet egg yolk foam dusted with cacao. It is the perfect bridge between afternoon tradition and night-time sophistication.</p>
    `,
  },
  {
    id: 'b3',
    title: 'Farm-to-Table: How We Source Our Ingredients',
    description: 'Meet the local farmers and sustainable fisheries behind Savora’s premium ingredients, from Dalat Highlands to the Mekong Delta.',
    slug: 'farm-to-table-ingredient-sourcing',
    date: 'April 28, 2026',
    author: 'Chef Hoang Lam',
    readingTime: '6 min read',
    image: '/images/blog/farm-sourcing.png',
    tags: ['Sustainability', 'Farmers', 'Ingredients'],
    keywords: ['sustainable sourcing vietnam', 'farm to table restaurant saigon', 'dalat organic vegetables', 'mekong delta fish sourcing', 'savora ingredients'],
    content: `
      <p>The soul of Vietnamese cuisine is freshness. Without vibrant herbs, sweet local vegetables, and fresh seafood, the balance of sweet, sour, salty, bitter, and umami is lost. At Savora, we are committed to sustainable, local sourcing that supports Vietnamese farmers and protects our ecosystems.</p>
      
      <h2>Organic Produce from Dalat Highlands</h2>
      <p>Known as the 'City of Eternal Spring,' Dalat’s cool temperate climate and volcanic soils are ideal for growing crisp vegetables and sweet berries. We partner with small-scale, certified organic farms in Dalat to source our heirloom tomatoes, baby bok choy, lotus roots, and sweet potatoes. Delivered fresh every morning, these vegetables retain their natural sugars and crisp textures.</p>
      
      <h2>Line-Caught Seafood from Phu Quoc & Mekong Delta</h2>
      <p>Vietnam’s long coastline and river deltas offer a rich variety of seafood. To ensure sustainability, we source our black cod and tiger prawns exclusively from line-caught fisheries in Phu Quoc. Line-catching prevents the damage caused by trawling nets and guarantees that only mature fish are caught, preserving marine biodiversity for future generations.</p>
      
      <h2>Traditional Artisans: The Fish Sauce of Phu Quoc</h2>
      <p>No Vietnamese restaurant can claim quality without choosing the right fish sauce (nước mắm). We source our fish sauce from a traditional, family-owned barrel house in Phu Quoc. Made using only fresh anchovies and sea salt, aged in giant wooden barrels for 12 months, this sauce provides a clean, clear umami flavor without any chemical additives.</p>
      
      <blockquote>
        "Sustainable sourcing is not just a trend for us; it is a responsibility to our culinary heritage, our land, and our diners."
      </blockquote>
      
      <h2>Traceability on the Plate</h2>
      <p>When you dine at Savora, you can trace every ingredient. From the wild forest honey in our coolers to the organic green sticky rice flakes coating our tofu, we tell the story of Vietnam's farmers on every plate. Taste the difference that sustainability and passion make.</p>
    `,
  },
];
export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}
export function getAllBlogSlugs(): string[] {
  return blogPosts.map((post) => post.slug);
}
