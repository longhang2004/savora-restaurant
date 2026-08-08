'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Sparkles, Compass, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCents } from '@/lib/money';
import type { PublicMenu, PublicMenuItem } from '@/features/menu/queries';
import ScrollReveal from '@/components/ui/ScrollReveal';
import Ornament from '@/components/ui/Ornament';
import ModifierModal from './ModifierModal';
import styles from './MenuContainer.module.css';

const CATEGORY_FILTERS = [
  { id: 'all', label: 'Full Menu' },
  { id: 'starters', label: 'Starters' },
  { id: 'mains', label: 'Mains' },
  { id: 'desserts', label: 'Desserts' },
  { id: 'drinks', label: 'Drinks' },
];

interface MenuContainerProps {
  menu: PublicMenu;
}

export default function MenuContainer({ menu }: MenuContainerProps) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [configuring, setConfiguring] = useState<PublicMenuItem | null>(null);

  const filteredItems =
    activeCategory === 'all'
      ? menu.items
      : menu.items.filter((item) => item.category.slug === activeCategory);

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <section className={styles.heroSection}>
        <div className="container">
          <ScrollReveal direction="up">
            <span className={styles.kicker}>Taste the Art</span>
          </ScrollReveal>
          <ScrollReveal direction="none" delay={0.05}>
            <Ornament />
          </ScrollReveal>
          <ScrollReveal direction="up" delay={0.1}>
            <h1 className={`${styles.title} text-gradient`}>Our Culinary Canvas</h1>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={0.2}>
            <p className={styles.subtitle}>
              Each creation is a balanced dialogue between rich Vietnamese food heritage and
              modern gastrology, designed to trigger memory and excite the senses.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Categories Bar */}
      <section className={styles.menuSection}>
        <div className="container">
          <ScrollReveal direction="up" delay={0.3}>
            <div className={`${styles.tabs} glassmorphism`}>
              {CATEGORY_FILTERS.map((cat) => (
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
                  <div
                    className={`${styles.menuCard} glassmorphism card-hover-effect ${!item.isAvailable ? styles.soldOutCard : ''}`}
                  >
                    <div className={styles.imgWrapper}>
                      <Image
                        src={item.imagePath ?? '/images/restaurant-hero.png'}
                        alt={item.name}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className={styles.image}
                      />
                      {item.isFeatured && (
                        <span className={styles.chefBadge}>
                          <Sparkles size={10} />
                          <span>Signature</span>
                        </span>
                      )}
                      {item.dietaryTags.includes('Vegetarian') && (
                        <span className={styles.vegBadge}>
                          <span>Vegan</span>
                        </span>
                      )}
                      {!item.isAvailable && (
                        <span className={styles.soldOutBadge}>
                          <span>Sold Out</span>
                        </span>
                      )}
                    </div>

                    <div className={styles.cardContent}>
                      <div className={styles.titlePrice}>
                        <h3 className={styles.itemName}>{item.name}</h3>
                        <span className={styles.price}>{formatCents(item.priceCents)}</span>
                      </div>
                      <p className={styles.description}>{item.description}</p>

                      <div className={styles.tags}>
                        {item.dietaryTags.map((tag) => (
                          <span key={tag} className={styles.tag}>
                            {tag}
                          </span>
                        ))}
                      </div>

                      {item.isAvailable ? (
                        <button
                          type="button"
                          className={styles.addBtn}
                          onClick={() => setConfiguring(item)}
                          aria-label={`Add ${item.name} to cart`}
                        >
                          <Plus size={14} />
                          <span>{item.modifierGroups.length > 0 ? 'Customize & Add' : 'Add to Cart'}</span>
                        </button>
                      ) : (
                        <span className={styles.soldOutNote}>Currently unavailable</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Note at bottom */}
          <ScrollReveal direction="up" className={styles.dietaryNote}>
            <Compass size={16} />
            <span>
              Please inform your server of any dietary allergies before ordering. Prices are
              subject to service charge and VAT.
            </span>
          </ScrollReveal>
        </div>
      </section>

      {configuring && (
        <ModifierModal item={configuring} onClose={() => setConfiguring(null)} />
      )}
    </div>
  );
}
