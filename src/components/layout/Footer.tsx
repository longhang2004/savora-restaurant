'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUp, Mail, Phone, MapPin } from 'lucide-react';
import styles from './Footer.module.css';

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        {/* Top Grid */}
        <div className={styles.grid}>
          {/* Column 1: Brand Info */}
          <div className={styles.col}>
            <Link href="/" className={styles.logo}>
              SAVORA<span className={styles.logoDot}>.</span>
            </Link>
            <p className={styles.description}>
              Elevating traditional Vietnamese heritage through modern culinary artistry. An exquisite fusion of history and gastronomy.
            </p>
            <div className={styles.socials}>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className={styles.socialLink} aria-label="Instagram">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                </svg>
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className={styles.socialLink} aria-label="Facebook">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className={styles.col}>
            <h3 className={styles.colTitle}>Explore</h3>
            <ul className={styles.links}>
              <li><Link href="/" className={styles.link}>Home</Link></li>
              <li><Link href="/menu" className={styles.link}>Our Menu</Link></li>
              <li><Link href="/about" className={styles.link}>Our Story</Link></li>
              <li><Link href="/blog" className={styles.link}>Journal & Stories</Link></li>
              <li><Link href="/reservations" className={styles.link}>Book a Table</Link></li>
            </ul>
          </div>

          {/* Column 3: Contact Info */}
          <div className={styles.col}>
            <h3 className={styles.colTitle}>Contact</h3>
            <ul className={styles.contactInfo}>
              <li>
                <MapPin size={16} className={styles.contactIcon} />
                <span>120 Nguyen Van Ba, Thu Duc, HCMC, Vietnam</span>
              </li>
              <li>
                <Phone size={16} className={styles.contactIcon} />
                <span>+84 786 907 453</span>
              </li>
              <li>
                <Mail size={16} className={styles.contactIcon} />
                <span>nhutlong20112004@gmail.com</span>
              </li>
            </ul>
          </div>

          {/* Column 4: Opening Hours */}
          <div className={styles.col}>
            <h3 className={styles.colTitle}>Hours</h3>
            <ul className={styles.hours}>
              <li>
                <span className={styles.day}>Mon - Fri:</span>
                <span className={styles.time}>11:30 AM - 10:00 PM</span>
              </li>
              <li>
                <span className={styles.day}>Sat - Sun:</span>
                <span className={styles.time}>11:00 AM - 11:00 PM</span>
              </li>
              <li className={styles.hoursNote}>
                * Kitchen closes 45 minutes before closing
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <hr className={styles.divider} />

        {/* Bottom Bar */}
        <div className={styles.bottomBar}>
          <p className={styles.copyright}>
            © {new Date().getFullYear()} Savora. Designed for Freelance Showcase by{' '}
            <a href="https://linkedin.com/in/nh%E1%BB%B1t-long-h%C3%A0ng-0aa434325" target="_blank" rel="noopener noreferrer" className={styles.authorLink}>
              Hàng Nhựt Long
            </a>.
          </p>

          <button onClick={scrollToTop} className={styles.scrollUp} aria-label="Scroll to top">
            <ArrowUp size={16} />
          </button>
        </div>
      </div>
    </footer>
  );
}
