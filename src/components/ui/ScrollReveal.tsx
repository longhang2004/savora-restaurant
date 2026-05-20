'use client';

import React from 'react';
import { motion } from 'framer-motion';

type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

interface ScrollRevealProps {
  children: React.ReactNode;
  direction?: Direction;
  delay?: number;
  duration?: number;
  distance?: number;
  threshold?: number;
  className?: string;
}

export default function ScrollReveal({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.6,
  distance = 50,
  threshold = 0.15,
  className = '',
}: ScrollRevealProps) {
  const getDirections = () => {
    switch (direction) {
      case 'up':
        return { hidden: { y: distance, opacity: 0 }, visible: { y: 0, opacity: 1 } };
      case 'down':
        return { hidden: { y: -distance, opacity: 0 }, visible: { y: 0, opacity: 1 } };
      case 'left':
        return { hidden: { x: distance, opacity: 0 }, visible: { x: 0, opacity: 1 } };
      case 'right':
        return { hidden: { x: -distance, opacity: 0 }, visible: { x: 0, opacity: 1 } };
      case 'none':
      default:
        return { hidden: { opacity: 0 }, visible: { opacity: 1 } };
    }
  };

  const variants = getDirections();

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: threshold }}
      transition={{
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1], // Custom cubic-bezier for premium feel
      }}
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
}
