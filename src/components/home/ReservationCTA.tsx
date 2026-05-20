'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Phone } from 'lucide-react';
import ScrollReveal from '../ui/ScrollReveal';
import styles from './ReservationCTA.module.css';

export default function ReservationCTA() {
  return (
    <section className={styles.section}>
      {/* Background Image Wrapper */}
      <div className={styles.bgWrapper}>
        <Image
          src="/images/restaurant-hero.png"
          alt="Savora Dining Table setting"
          fill
          sizes="100vw"
          className={styles.image}
        />
        <div className={styles.overlay} />
      </div>

      <div className={`${styles.container} container`}>
        <div className={styles.cardCol}>
          <ScrollReveal direction="up" className={`${styles.ctaCard} glassmorphism`}>
            <span className={styles.kicker}>Secure Your Table</span>
            <h2 className={styles.title}>Experience Gastronomy</h2>
            <p className={styles.description}>
              We recommend reserving tables at least 3 days in advance to secure your preferred date and time. Walk-ins are subject to availability.
            </p>

            <div className={styles.hoursTable}>
              <div className={styles.hoursRow}>
                <span className={styles.day}>Lunch Service</span>
                <span className={styles.time}>11:30 AM - 2:30 PM</span>
              </div>
              <div className={styles.hoursRow}>
                <span className={styles.day}>Dinner Service</span>
                <span className={styles.time}>5:30 PM - 10:00 PM</span>
              </div>
              <div className={styles.hoursRow}>
                <span className={styles.day}>Weekends</span>
                <span className={styles.time}>11:00 AM - 11:00 PM</span>
              </div>
            </div>

            <div className={styles.actions}>
              <Link href="/reservations" className={styles.primaryBtn}>
                <Calendar size={18} />
                <span>Book Table Online</span>
              </Link>
              
              <a href="tel:+84786907453" className={styles.secondaryBtn}>
                <Phone size={18} />
                <span>Call +84 786 907 453</span>
              </a>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
