'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import Ornament from '../ui/Ornament';
import styles from './Hero.module.css';

export default function Hero() {
  return (
    <section className={styles.hero}>
      {/* Background Image with slight scale & zoom on entrance */}
      <div className={styles.bgWrapper}>
        <Image
          src="/images/restaurant-hero.png"
          alt="Savora Dining Room"
          fill
          priority
          sizes="100vw"
          className={styles.bgImage}
        />
        <div className={styles.overlay} />
      </div>

      {/* Hero Content */}
      <div className={styles.content}>
        <motion.span
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className={styles.kicker}
        >
          Vietnamese Heritage Gastronomy
        </motion.span>

        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <Ornament />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4 }}
          className={styles.title}
        >
          Where Tradition Meets <br />
          <span className="text-gradient">Modern Artistry</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className={styles.tagline}
        >
          Embark on an exquisite culinary journey through flavors inspired by history, crafted for the contemporary palate.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className={styles.actions}
        >
          <Link href="/reservations" className={styles.primaryBtn}>
            <Calendar size={18} />
            <span>Reserve a Table</span>
          </Link>
          <Link href="/menu" className={styles.secondaryBtn}>
            <span>Explore Menu</span>
          </Link>
        </motion.div>
      </div>

      {/* Floating Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 1 }}
        className={styles.scrollDown}
      >
        <Link href="#featured">
          <span className={styles.scrollText}>Scroll to discover</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className={styles.scrollIcon}
          >
            <ChevronDown size={20} />
          </motion.div>
        </Link>
      </motion.div>
    </section>
  );
}
