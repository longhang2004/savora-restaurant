'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Sparkles, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { menuItems } from '@/data/menu';
import { generateMenuSchema } from '@/lib/structured-data';
import ScrollReveal from '@/components/ui/ScrollReveal';
import styles from './MenuContainer.module.css';

const categories = [
  { id: 'all', label: 'Full Menu' },
  { id: 'starters', label: 'Starters' },
  { id: 'mains', label: 'Mains' },
  { id: 'desserts', label: 'Desserts' },
  { id: 'drinks', label: 'Drinks' },
];

export default function MenuContainer() {
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredItems = activeCategory === 'all'
    ? menuItems
    : menuItems.filter((item) => item.category === activeCategory);

  // Generate Menu JSON-LD Schema
  const menuSchema = generateMenuSchema(menuItems);

  return (
    <>
      {/* Inject Menu Schema dynamically */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(menuSchema) }}
      />

      <div className={styles.page}>
        {/* Page Header */}
        <section className={styles.heroSection}>
          <div className="container">
            <ScrollReveal direction="up">
              <span className={styles.kicker}>Taste the Art</span>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h1 className={`${styles.title} text-gradient`}>Our Culinary Canvas</h1>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.2}>
              <p className={styles.subtitle}>
                Each creation is a balanced dialogue between rich Vietnamese food heritage and modern gastrology, designed to trigger memory and excite the senses.
              </p>
            </ScrollReveal>
          </div>
        </section>

        {/* Categories Bar */}
        <section className={styles.menuSection}>
          <div className="container">
            <ScrollReveal direction="up" delay={0.3}>
              <div className={`${styles.tabs} glassmorphism`}>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`${styles.tabBtn} ${activeCategory === cat.id ? styles.activeTab : ''}`}
                  >
                    {cat.label}
                    {activeCategory === cat.id && (
                      <motion.span
                        layoutId="activeCategoryIndicator"
                        className={styles.activeTabIndicator}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </ScrollReveal>

            {/* Menu Grid */}
            <motion.div layout className={styles.menuGrid}>
              <AnimatePresence mode="wait">
                {filteredItems.map((item, index) => (
                  <motion.div
                    layout
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.35, delay: index * 0.05 }}
                    className={styles.gridItemWrapper}
                  >
                    <div className={`${styles.menuCard} glassmorphism card-hover-effect`}>
                      <div className={styles.imgWrapper}>
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className={styles.image}
                        />
                        {item.chefChoice && (
                          <span className={styles.chefBadge}>
                            <Sparkles size={10} />
                            <span>Signature</span>
                          </span>
                        )}
                        {item.vegetarian && (
                          <span className={styles.vegBadge}>
                            <span>Vegan</span>
                          </span>
                        )}
                      </div>

                      <div className={styles.cardContent}>
                        <div className={styles.titlePrice}>
                          <h3 className={styles.itemName}>{item.name}</h3>
                          <span className={styles.price}>${item.price}</span>
                        </div>
                        <p className={styles.description}>{item.description}</p>
                        
                        <div className={styles.tags}>
                          {item.tags.map((tag) => (
                            <span key={tag} className={styles.tag}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            {/* Note at bottom */}
            <ScrollReveal direction="up" className={styles.dietaryNote}>
              <Compass size={16} />
              <span>Please inform your server of any dietary allergies before ordering. Prices are subject to service charge and VAT.</span>
            </ScrollReveal>
          </div>
        </section>
      </div>
    </>
  );
}
