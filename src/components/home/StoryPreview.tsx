'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import ScrollReveal from '../ui/ScrollReveal';
import AnimatedCounter from '../ui/AnimatedCounter';
import styles from './StoryPreview.module.css';

export default function StoryPreview() {
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.grid}>
          {/* Left Column: Image collage/single featured image */}
          <ScrollReveal direction="left" className={styles.imgCol}>
            <div className={styles.imgWrapper}>
              <Image
                src="/images/restaurant-hero.png"
                alt="Savora Kitchen Prep"
                fill
                sizes="(max-width: 992px) 100vw, 50vw"
                className={styles.image}
              />
              <div className={`${styles.badge} glassmorphism`}>
                <span className={styles.badgeNum}>
                  <AnimatedCounter to={10} suffix="+" />
                </span>
                <span className={styles.badgeText}>Years of culinary refinement</span>
              </div>
            </div>
          </ScrollReveal>

          {/* Right Column: Text & Stats */}
          <div className={styles.textCol}>
            <ScrollReveal direction="up">
              <span className={styles.kicker}>Our Philosophy</span>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className={styles.title}>Preserving Roots, Redefining Boundaries</h2>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.2}>
              <p className={styles.paragraph}>
                Savora was born from a simple yet ambitious dream: to honor the complex depth of traditional Vietnamese home cooking while presenting it with the sophistication of international fine dining.
              </p>
              <p className={styles.paragraph}>
                We source our ingredients directly from local smallholders—organic vegetables from the highlands of Dalat, fresh seafood caught off the coast of Phu Quoc, and family-fermented fish sauce aged in wood barrels. Every ingredient has a story, and every dish is a chapter.
              </p>
            </ScrollReveal>

            {/* Stats Row */}
            <div className={styles.stats}>
              <ScrollReveal direction="up" delay={0.3} className={styles.statItem}>
                <span className={styles.statNum}>
                  <AnimatedCounter to={36} suffix="h" />
                </span>
                <span className={styles.statLabel}>Broth Simmer Time</span>
              </ScrollReveal>

              <ScrollReveal direction="up" delay={0.4} className={styles.statItem}>
                <span className={styles.statNum}>
                  <AnimatedCounter to={100} suffix="%" />
                </span>
                <span className={styles.statLabel}>Locally Sourced</span>
              </ScrollReveal>

              <ScrollReveal direction="up" delay={0.5} className={styles.statItem}>
                <span className={styles.statNum}>
                  <AnimatedCounter to={5} suffix="" />
                </span>
                <span className={styles.statLabel}>Star Experience</span>
              </ScrollReveal>
            </div>

            <ScrollReveal direction="up" delay={0.6} className={styles.ctaWrapper}>
              <Link href="/about" className={styles.ctaBtn}>
                <span>Discover Our Story</span>
                <ArrowRight size={16} />
              </Link>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
