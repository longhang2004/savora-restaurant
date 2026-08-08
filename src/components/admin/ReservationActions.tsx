'use client';

import React, { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { transitionReservationAction } from '@/features/reservations/actions';
import styles from './admin.module.css';

interface ReservationActionsProps {
  reservationId: string;
  status: 'CONFIRMED' | 'SEATED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
}

/** Legal action buttons for a reservation row. */
export default function ReservationActions({ reservationId, status }: ReservationActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const act = (toStatus: string) => {
    startTransition(async () => {
      const result = await transitionReservationAction({ reservationId, toStatus });
      if (result.ok) router.refresh();
    });
  };

  if (status === 'CONFIRMED') {
    return (
      <div className={styles.actionsRow}>
        <button className={styles.actionBtn} disabled={pending} onClick={() => act('SEATED')}>
          Seat
        </button>
        <button className={styles.actionBtn} disabled={pending} onClick={() => act('NO_SHOW')}>
          No-show
        </button>
        <button
          className={`${styles.actionBtn} ${styles.actionDanger}`}
          disabled={pending}
          onClick={() => act('CANCELLED')}
        >
          Cancel
        </button>
      </div>
    );
  }

  if (status === 'SEATED') {
    return (
      <div className={styles.actionsRow}>
        <button className={styles.actionBtn} disabled={pending} onClick={() => act('COMPLETED')}>
          Complete
        </button>
      </div>
    );
  }

  return <span className={styles.muted}>—</span>;
}
