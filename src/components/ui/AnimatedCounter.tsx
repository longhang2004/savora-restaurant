'use client';

import React, { useEffect, useRef } from 'react';
import { useInView, useMotionValue, useTransform, animate } from 'framer-motion';

interface AnimatedCounterProps {
  to: number;
  duration?: number;
  delay?: number;
  suffix?: string;
}

export default function AnimatedCounter({
  to,
  duration = 2,
  delay = 0,
  suffix = '',
}: AnimatedCounterProps) {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(nodeRef, { once: true, amount: 0.5 });
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    if (inView) {
      const controls = animate(count, to, {
        duration,
        delay,
        ease: 'easeOut',
      });
      return () => controls.stop();
    }
  }, [inView, count, to, duration, delay]);

  useEffect(() => {
    return rounded.on('change', (latest) => {
      if (nodeRef.current) {
        nodeRef.current.textContent = latest.toLocaleString() + suffix;
      }
    });
  }, [rounded, suffix]);

  return <span ref={nodeRef}>0{suffix}</span>;
}
