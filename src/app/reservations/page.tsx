import React from 'react';
import { generatePageMetadata } from '@/lib/metadata';
import ReservationForm from '@/components/reservations/ReservationForm';
import ScrollReveal from '@/components/ui/ScrollReveal';
import Ornament from '@/components/ui/Ornament';
import { Mail, Phone, MapPin, Compass } from 'lucide-react';
import { restaurantConfig } from '@/config/restaurant';
import { getRestaurantToday, localToUtc, utcToLocalDate } from '@/lib/time';
import styles from './page.module.css';

export const metadata = generatePageMetadata({
  title: 'Table Reservations',
  description: 'Book your table at Savora. Make online reservations for fine dining, lunch services, corporate gatherings or private culinary events.',
  path: '/reservations',
  keywords: ['book table saigon', 'reserve dining table', 'savora booking', 'fine dining reservation'],
});

export default async function ReservationsPage() {
  // Restaurant-local dates (Asia/Ho_Chi_Minh), never client-UTC derived.
  const today = getRestaurantToday();
  const maxDate = utcToLocalDate(
    new Date(localToUtc(today, '00:00').getTime() + restaurantConfig.reservation.maxAdvanceDays * 86_400_000),
  );

  return (
    <div className={styles.page}>
      <div className="container">
        {/* Header */}
        <header className={styles.header}>
          <ScrollReveal direction="up">
            <span className={styles.kicker}>Join Our Table</span>
          </ScrollReveal>
          <ScrollReveal direction="none" delay={0.05}>
            <Ornament />
          </ScrollReveal>
          <ScrollReveal direction="up" delay={0.1}>
            <h1 className={`${styles.title} text-gradient`}>Make a Reservation</h1>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={0.2}>
            <p className={styles.subtitle}>
              Secure your place and experience a contemporary interpretation of traditional Vietnamese gastronomy.
            </p>
          </ScrollReveal>
        </header>

        {/* Layout */}
        <div className={styles.grid}>
          {/* Form Col */}
          <div className={styles.formCol}>
            <ScrollReveal direction="up" delay={0.3}>
              <ReservationForm minDate={today} maxDate={maxDate} />
            </ScrollReveal>
          </div>

          {/* Details Col */}
          <div className={styles.detailsCol}>
            <ScrollReveal direction="right" delay={0.4}>
              <div className={`${styles.infoCard} glassmorphism`}>
                <h3 className={styles.cardTitle}>Booking Policy</h3>
                <p className={styles.cardText}>
                  To ensure an optimal dining experience for all guests, please note our reservation policies:
                </p>

                <ul className={styles.policyList}>
                  <li>Reservations are held for a maximum of <strong>15 minutes</strong> past the scheduled time.</li>
                  <li>Our dining duration is restricted to <strong>2 hours</strong> for tables during peak dinner services.</li>
                  <li>For parties of <strong>{restaurantConfig.reservation.maxOnlinePartySize + 1} or more guests</strong>, please contact our events team directly via phone or email for customized banquet menus.</li>
                </ul>

                <h3 className={styles.cardTitle} style={{ marginTop: '2.5rem' }}>Direct Inquiries</h3>
                <div className={styles.contactList}>
                  <a href={`tel:${restaurantConfig.phone}`} className={styles.contactItem}>
                    <Phone size={16} className={styles.contactIcon} />
                    <div>
                      <span className={styles.contactLabel}>Phone Booking</span>
                      <span className={styles.contactVal}>{restaurantConfig.phoneDisplay}</span>
                    </div>
                  </a>
                  <a href={`mailto:${restaurantConfig.emails.reservations}`} className={styles.contactItem}>
                    <Mail size={16} className={styles.contactIcon} />
                    <div>
                      <span className={styles.contactLabel}>General Email</span>
                      <span className={styles.contactVal}>{restaurantConfig.emails.reservations}</span>
                    </div>
                  </a>
                  <div className={styles.contactItem}>
                    <MapPin size={16} className={styles.contactIcon} />
                    <div>
                      <span className={styles.contactLabel}>Address</span>
                      <span className={styles.contactVal}>{restaurantConfig.address.street}, {restaurantConfig.address.district}, {restaurantConfig.address.city}, Vietnam</span>
                    </div>
                  </div>
                </div>

                <div className={styles.badge}>
                  <Compass size={16} />
                  <span>Complimentary valet parking is available for all dining guests.</span>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </div>
  );
}
