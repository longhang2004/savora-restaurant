import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Clock, User, ArrowRight } from 'lucide-react';
import { blogPosts } from '@/data/blog-posts';
import { generatePageMetadata } from '@/lib/metadata';
import ScrollReveal from '@/components/ui/ScrollReveal';
import styles from './page.module.css';

export const metadata = generatePageMetadata({
  title: 'Savora Journal | Food & Coffee Culture',
  description: 'Read the latest stories about Vietnamese culinary heritage, coffee brewing rituals, and sustainable farming behind Savora Restaurant.',
  path: '/blog',
  keywords: ['vietnamese food blog', 'saigon restaurant stories', 'pho history blog', 'vietnamese egg coffee article'],
});

export default function BlogPage() {
  return (
    <div className={styles.page}>
      <section className={styles.heroSection}>
        <div className="container">
          <ScrollReveal direction="up">
            <span className={styles.kicker}>The Savora Journal</span>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={0.1}>
            <h1 className={`${styles.title} text-gradient`}>Culinary Stories & Insights</h1>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={0.2}>
            <p className={styles.subtitle}>
              Delve into the histories, brewing rituals, and sustainable farming practices that shape our culinary worldview.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className={styles.blogSection}>
        <div className="container">
          {/* Main Grid */}
          <div className={styles.grid}>
            {blogPosts.map((post, index) => (
              <ScrollReveal
                key={post.id}
                direction="up"
                delay={index * 0.1}
                className={styles.cardWrapper}
              >
                <article className={`${styles.card} glassmorphism`}>
                  <div className={styles.imgWrapper}>
                    <Image
                      src={post.image}
                      alt={post.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className={styles.image}
                    />
                  </div>

                  <div className={styles.cardContent}>
                    <div className={styles.metaRow}>
                      <span className={styles.tag}>{post.tags[0]}</span>
                      <span className={styles.date}>{post.date}</span>
                    </div>

                    <h2 className={styles.postTitle}>
                      <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                    </h2>
                    
                    <p className={styles.description}>{post.description}</p>

                    <div className={styles.footerRow}>
                      <div className={styles.author}>
                        <User size={14} className={styles.authorIcon} />
                        <span>{post.author}</span>
                      </div>
                      <div className={styles.readingTime}>
                        <Clock size={14} className={styles.clockIcon} />
                        <span>{post.readingTime}</span>
                      </div>
                    </div>

                    <div className={styles.actionRow}>
                      <Link href={`/blog/${post.slug}`} className={styles.readMoreBtn}>
                        <span>Read Full Story</span>
                        <ArrowRight size={14} className={styles.arrow} />
                      </Link>
                    </div>
                  </div>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
