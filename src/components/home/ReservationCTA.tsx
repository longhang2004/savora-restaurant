'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Phone } from 'lucide-react';
import { restaurantConfig } from '@/config/restaurant';
import ScrollReveal from '../ui/ScrollReveal';
import styles from './ReservationCTA.module.css';

function formatHours(hours: { open: string; close: string }): string {
  const to12 = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
  };
  return `${to12(hours.open)} - ${to12(hours.close)}`;
}

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
              {restaurantConfig.servicePeriods.map((period) => (
                <div key={period.id} className={styles.hoursRow}>
                  <span className={styles.day}>{period.label} Service</span>
                  <span className={styles.time}>{formatHours({ open: period.start, close: period.end })}</span>
                </div>
              ))}
              <div className={styles.hoursRow}>
                <span className={styles.day}>Weekends</span>
                <span className={styles.time}>{formatHours(restaurantConfig.openingHours.weekends)}</span>
              </div>
            </div>

            <div className={styles.actions}>
              <Link href="/reservations" className={styles.primaryBtn}>
                <Calendar size={18} />
                <span>Book Table Online</span>
              </Link>

              <a href={`tel:${restaurantConfig.phone}`} className={styles.secondaryBtn}>
                <Phone size={18} />
                <span>Call {restaurantConfig.phoneDisplay}</span>
              </a>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
