import React from 'react';
import { generatePageMetadata } from '@/lib/metadata';
import ContactForm from '@/components/contact/ContactForm';
import ScrollReveal from '@/components/ui/ScrollReveal';
import Ornament from '@/components/ui/Ornament';
import { Mail, Phone, MapPin, Clock, Compass } from 'lucide-react';
import { restaurantConfig } from '@/config/restaurant';
import styles from './page.module.css';

export const metadata = generatePageMetadata({
  title: 'Contact Us',
  description: 'Get in touch with Savora Restaurant. Find our address in District 1 HCMC, contact numbers, email addresses and submit inquiries.',
  path: '/contact',
  keywords: ['savora contact', 'vietnamese restaurant address saigon', 'district 1 fine dining', 'savora email'],
});

function formatHours12(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export default function ContactPage() {
  return (    <div className={styles.page}>
      <div className="container">
        {/* Header */}
        <header className={styles.header}>
          <ScrollReveal direction="up">
            <span className={styles.kicker}>Connect With Us</span>
          </ScrollReveal>
          <ScrollReveal direction="none" delay={0.05}>
            <Ornament />
          </ScrollReveal>
          <ScrollReveal direction="up" delay={0.1}>
            <h1 className={`${styles.title} text-gradient`}>Contact Savora</h1>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={0.2}>
            <p className={styles.subtitle}>
              For reservations, private dinners, press inquiries, or careers, feel free to drop us a message.
            </p>
          </ScrollReveal>
        </header>

        {/* Grid Layout */}
        <div className={styles.grid}>
          {/* Info Side */}
          <div className={styles.infoCol}>
            <ScrollReveal direction="left" delay={0.3}>
              <div className={`${styles.infoCard} glassmorphism`}>
                <h3 className={styles.cardTitle}>Guest Relations</h3>
                
                <div className={styles.contactList}>
                  <div className={styles.contactItem}>
                    <MapPin size={18} className={styles.contactIcon} />
                    <div>
                      <span className={styles.contactLabel}>Address</span>
                      <span className={styles.contactVal}>{restaurantConfig.address.street}, {restaurantConfig.address.district}, {restaurantConfig.address.city}, Vietnam</span>
                    </div>
                  </div>
                  
                  <a href={`tel:${restaurantConfig.phone}`} className={styles.contactItem}>
                    <Phone size={18} className={styles.contactIcon} />
                    <div>
                      <span className={styles.contactLabel}>Phone</span>
                      <span className={styles.contactVal}>{restaurantConfig.phoneDisplay}</span>
                    </div>
                  </a>

                  <a href={`mailto:${restaurantConfig.emails.general}`} className={styles.contactItem}>
                    <Mail size={18} className={styles.contactIcon} />
                    <div>
                      <span className={styles.contactLabel}>General Email</span>
                      <span className={styles.contactVal}>{restaurantConfig.emails.general}</span>
                    </div>
                  </a>

                  <div className={styles.contactItem}>
                    <Clock size={18} className={styles.contactIcon} />
                    <div>
                      <span className={styles.contactLabel}>Opening Hours</span>
                      <span className={styles.contactVal}>
                        Mon - Fri: {formatHours12(restaurantConfig.openingHours.weekdays.open)} - {formatHours12(restaurantConfig.openingHours.weekdays.close)} <br />
                        Sat - Sun: {formatHours12(restaurantConfig.openingHours.weekends.open)} - {formatHours12(restaurantConfig.openingHours.weekends.close)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Abstract visual mockup of map */}
                <div className={styles.mapMockup}>
                  <div className={styles.mapOverlay}>
                    <Compass size={24} className={styles.compassIcon} />
                    <span className={styles.mapOverlayText}>Savora Saigon</span>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* Form Side */}
          <div className={styles.formCol}>
            <ScrollReveal direction="right" delay={0.4}>
              <ContactForm />
            </ScrollReveal>
          </div>
        </div>
      </div>
    </div>
  );
}
