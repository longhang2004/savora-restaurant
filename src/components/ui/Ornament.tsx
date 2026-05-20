import React from 'react';
import styles from './Ornament.module.css';

interface OrnamentProps {
  className?: string;
}

export default function Ornament({ className = '' }: OrnamentProps) {
  return (
    <div className={`${styles.ornament} ${className}`}>
      <span className={styles.line} />
      <span className={styles.diamond} />
      <span className={styles.line} />
    </div>
  );
}
