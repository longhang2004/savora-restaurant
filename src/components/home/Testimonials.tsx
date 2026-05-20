'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Star, Quote } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { testimonials } from '@/data/testimonials';
import ScrollReveal from '../ui/ScrollReveal';
import Ornament from '../ui/Ornament';
import styles from './Testimonials.module.css';

export default function Testimonials() {
  const [current, setCurrent] = useState(0);

  const nextSlide = () => {
    setCurrent((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrent((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));
  };

  return (
    <section className={styles.section}>
      {/* Background Spotlight Gradient */}
      <div className={styles.spotlight} />

      <div className="container">
        {/* Section Header */}
        <div className={styles.header}>
          <ScrollReveal direction="up">
            <span className={styles.kicker}>Reviews</span>
          </ScrollReveal>
          <ScrollReveal direction="none" delay={0.05}>
            <Ornament />
          </ScrollReveal>
          <ScrollReveal direction="up" delay={0.1}>
            <h2 className={styles.title}>Guest Experiences</h2>
          </ScrollReveal>
        </div>

        {/* Carousel Container */}
        <div className={styles.carouselContainer}>
          <button
            onClick={prevSlide}
            className={`${styles.navBtn} ${styles.prevBtn}`}
            aria-label="Previous testimonial"
          >
            <ChevronLeft size={20} />
          </button>

          <div className={styles.sliderWrapper}>
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className={`${styles.slideCard} glassmorphism`}
              >
                <Quote className={styles.quoteIcon} />
                
                {/* Star rating */}
                <div className={styles.rating}>
                  {Array.from({ length: testimonials[current].rating }).map((_, i) => (
                    <Star key={i} size={16} className={styles.starIcon} fill="var(--accent-gold)" />
                  ))}
                </div>

                {/* Review Text */}
                <p className={styles.content}>"{testimonials[current].content}"</p>

                {/* Author Info */}
                <div className={styles.author}>
                  <div className={styles.avatarPlaceholder}>
                    {testimonials[current].name.charAt(0)}
                  </div>
                  <div className={styles.meta}>
                    <h4 className={styles.name}>{testimonials[current].name}</h4>
                    <span className={styles.role}>{testimonials[current].role}</span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <button
            onClick={nextSlide}
            className={`${styles.navBtn} ${styles.nextBtn}`}
            aria-label="Next testimonial"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Dots Indicator */}
        <div className={styles.dots}>
          {testimonials.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              className={`${styles.dot} ${idx === current ? styles.activeDot : ''}`}
              aria-label={`Go to testimonial ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
