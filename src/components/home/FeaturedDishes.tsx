'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Sparkles } from 'lucide-react';
import { menuItems } from '@/data/menu';
import ScrollReveal from '../ui/ScrollReveal';
import Ornament from '../ui/Ornament';
import styles from './FeaturedDishes.module.css';

export default function FeaturedDishes() {
  // Select 3 chefChoice or popular items
  const featured = menuItems.filter((item) => item.chefChoice).slice(0, 3);

  return (
    <section id="featured" className={styles.section}>
      <div className="container">
        {/* Section Header */}
        <div className={styles.header}>
          <ScrollReveal direction="up">
            <span className={styles.kicker}>Chef's Masterpieces</span>
          </ScrollReveal>
          <ScrollReveal direction="none" delay={0.05}>
            <Ornament />
          </ScrollReveal>
          <ScrollReveal direction="up" delay={0.1}>
            <h2 className={styles.title}>Signature Gastronomy</h2>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={0.2}>
            <p className={styles.subtitle}>
              A curated selection of dishes that showcase our culinary philosophy: respecting traditional Vietnamese heritage while exploring modern techniques.
            </p>
          </ScrollReveal>
        </div>

        {/* Grid of Dishes */}
        <div className={styles.grid}>
          {featured.map((dish, index) => (
            <ScrollReveal
              key={dish.id}
              direction="up"
              delay={index * 0.15}
              className={styles.cardWrapper}
            >
              <div className={`${styles.card} glassmorphism card-hover-effect`}>
                <div className={styles.imgContainer}>
                  <Image
                    src={dish.image}
                    alt={dish.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className={styles.image}
                  />
                  {dish.chefChoice && (
                    <span className={styles.tag}>
                      <Sparkles size={12} />
                      <span>Signature</span>
                    </span>
                  )}
                </div>

                <div className={styles.cardContent}>
                  <div className={styles.meta}>
                    <span className={styles.category}>{dish.category}</span>
                    <span className={styles.price}>${dish.price}</span>
                  </div>
                  <h3 className={styles.dishName}>{dish.name}</h3>
                  <p className={styles.description}>{dish.description}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* View All CTA */}
        <div className={styles.ctaWrapper}>
          <ScrollReveal direction="up" delay={0.4}>
            <Link href="/menu" className={styles.ctaLink}>
              <span>View Full Experience Menu</span>
              <ArrowRight size={16} className={styles.arrow} />
            </Link>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
