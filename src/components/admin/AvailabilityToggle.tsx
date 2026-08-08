'use client';

import React, { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setMenuItemAvailabilityAction } from '@/features/admin/actions';
import styles from './admin.module.css';

export default function AvailabilityToggle({
  itemId,
  isAvailable,
}: {
  itemId: string;
  isAvailable: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    startTransition(async () => {
      await setMenuItemAvailabilityAction({ itemId, isAvailable: !isAvailable });
      router.refresh();
    });
  };

  return (
    <button
      className={styles.actionBtn}
      disabled={pending}
      onClick={toggle}
      aria-pressed={!isAvailable}
    >
      <span className={`${styles.pill} ${isAvailable ? styles.pillGreen : styles.pillRed}`} style={{ border: 'none', padding: 0, background: 'none' }}>
        {isAvailable ? 'Available' : 'Sold out'}
      </span>
    </button>
  );
}
