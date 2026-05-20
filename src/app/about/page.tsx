import React from 'react';
import Image from 'next/image';
import { generatePageMetadata } from '@/lib/metadata';
import ScrollReveal from '@/components/ui/ScrollReveal';
import AnimatedCounter from '@/components/ui/AnimatedCounter';
import styles from './page.module.css';

export const metadata = generatePageMetadata({
  title: 'Our Story & Philosophy',
  description: 'Learn about Savora’s origins, meet Executive Chef Hoang Lam, and discover our commitment to sustainable, locally sourced Vietnamese-fusion ingredients.',
  path: '/about',
  keywords: ['about savora', 'chef hoang lam', 'vietnamese cuisine heritage', 'sustainable restaurant saigon'],
});

const timelineEvents = [
  {
    year: '2016',
    title: 'The Seed of Inspiration',
    desc: 'Chef Hoang Lam spends a year traveling across Vietnam’s culinary regions, from northern hill tribes to southern floating markets, recording historic family recipes.',
  },
  {
    year: '2020',
    title: 'The Grand Opening',
    desc: 'Savora opens its doors in HCMC, introducing a unique dining experience where traditional flavors are elevated using contemporary techniques.',
  },
  {
    year: '2023',
    title: 'Michelin Recognition',
    desc: 'Honored with a Michelin guide recommendation, recognizing Savora’s contribution to preserving and modernizing Vietnamese gastronomy.',
  },
  {
    year: '2026',
    title: 'A Green Future',
    desc: 'We transition to a 100% traceably sourced menu, supporting local organic farms in Dalat and line-caught fisheries in Phu Quoc.',
  },
];

export default function AboutPage() {
  return (
    <div className={styles.page}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.bgWrapper}>
          <Image
            src="/images/restaurant-hero.png"
            alt="Savora Dining Area"
            fill
            sizes="100vw"
            priority
            className={styles.bgImage}
          />
          <div className={styles.overlay} />
        </div>
        <div className="container">
          <div className={styles.heroContent}>
            <ScrollReveal direction="up">
              <span className={styles.kicker}>The Savora Journal</span>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h1 className={`${styles.title} text-gradient`}>Our Story</h1>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.2}>
              <p className={styles.subtitle}>
                An ambitious dream to elevate the humble comforting flavors of Vietnam to the international culinary stage.
              </p>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Intro Split */}
      <section className={styles.introSection}>
        <div className="container">
          <div className={styles.introGrid}>
            <div className={styles.introText}>
              <ScrollReveal direction="up">
                <span className={styles.sectionKicker}>A Culinary Mission</span>
                <h2 className={styles.sectionTitle}>Honoring the Past, Creating the Future</h2>
                <p className={styles.paragraph}>
                  At Savora, we believe that food is a living archive of culture. Vietnamese cuisine is celebrated worldwide for its fresh herbs, balance of five taste elements, and comfort. However, we felt there was an opportunity to present these timeless flavors through a new lens.
                </p>
                <p className={styles.paragraph}>
                  By marrying traditional recipes with French-influenced preparation, Japanese precision, and modern texture styling, we create an experience that feels both familiar and surprising. Every dish is a dialogue between memory and innovation.
                </p>
              </ScrollReveal>
            </div>
            
            <ScrollReveal direction="right" className={styles.introImgCol}>
              <div className={styles.introImgWrapper}>
                <Image
                  src="/images/restaurant-hero.png"
                  alt="Savora Fine Food Detail"
                  fill
                  sizes="(max-width: 992px) 100vw, 50vw"
                  className={styles.introImage}
                />
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className={styles.timelineSection}>
        <div className="container">
          <div className={styles.timelineHeader}>
            <ScrollReveal direction="up">
              <span className={styles.sectionKicker}>Milestones</span>
              <h2 className={styles.sectionTitle}>Our Journey So Far</h2>
            </ScrollReveal>
          </div>

          <div className={styles.timeline}>
            <div className={styles.timelineLine} />
            {timelineEvents.map((event, index) => (
              <div key={event.year} className={`${styles.timelineItem} ${index % 2 === 0 ? styles.timelineLeft : styles.timelineRight}`}>
                <ScrollReveal direction={index % 2 === 0 ? 'left' : 'right'} delay={index * 0.1}>
                  <div className={`${styles.timelineContent} glassmorphism`}>
                    <span className={styles.timelineYear}>{event.year}</span>
                    <h3 className={styles.timelineEventTitle}>{event.title}</h3>
                    <p className={styles.timelineEventDesc}>{event.desc}</p>
                  </div>
                </ScrollReveal>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Chef Profile */}
      <section className={styles.chefSection}>
        <div className="container">
          <div className={styles.chefGrid}>
            <ScrollReveal direction="left" className={styles.chefImgCol}>
              <div className={styles.chefImgWrapper}>
                <Image
                  src="/images/restaurant-hero.png"
                  alt="Executive Chef Hoang Lam"
                  fill
                  sizes="(max-width: 992px) 100vw, 50vw"
                  className={styles.chefImage}
                />
              </div>
            </ScrollReveal>
            
            <div className={styles.chefText}>
              <ScrollReveal direction="up">
                <span className={styles.sectionKicker}>The Visionary</span>
                <h2 className={styles.sectionTitle}>Chef Hoàng Lâm</h2>
                <span className={styles.chefRole}>Executive Chef & Co-Founder</span>
                
                <p className={styles.paragraph}>
                  "The broth of Phở should tell the story of patience. My grandmother taught me that you cannot rush a broth—it absorbs the warmth of the fire, the history of the spices, and the care of the chef."
                </p>
                <p className={styles.paragraph}>
                  Chef Hoàng Lâm has spent over two decades in Michelin-starred kitchens across Paris and Tokyo. Returning to Vietnam, he integrated European confit methods and Japanese flavor balancing with the street-cooking heritage of his youth, resulting in Savora’s unique gastronomical style.
                </p>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
