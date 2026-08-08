'use client';

import React, { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { transitionOrderAction } from '@/features/admin/actions';
import styles from './admin.module.css';

interface OrderActionsProps {
  orderId: string;
  status: 'PENDING' | 'NEW' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
}

const NEXT_ACTIONS: Record<OrderActionsProps['status'], { label: string; to: string }[]> = {
  PENDING: [{ label: 'Cancel', to: 'CANCELLED' }],
  NEW: [
    { label: 'Accept', to: 'ACCEPTED' },
    { label: 'Cancel', to: 'CANCELLED' },
  ],
  ACCEPTED: [
    { label: 'Start Preparing', to: 'PREPARING' },
    { label: 'Cancel', to: 'CANCELLED' },
  ],
  PREPARING: [
    { label: 'Mark Ready', to: 'READY' },
    { label: 'Cancel', to: 'CANCELLED' },
  ],
  READY: [{ label: 'Complete', to: 'COMPLETED' }],
  COMPLETED: [],
  CANCELLED: [],
};

export default function OrderActions({ orderId, status }: OrderActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const act = (toStatus: string) => {
    startTransition(async () => {
      const result = await transitionOrderAction({ orderId, toStatus });
      if (result.ok) router.refresh();
    });
  };

  const actions = NEXT_ACTIONS[status] ?? [];
  if (actions.length === 0) return <span className={styles.muted}>—</span>;

  return (
    <div className={styles.actionsRow}>
      {actions.map((action) => (
        <button
          key={action.to}
          className={`${styles.actionBtn} ${action.to === 'CANCELLED' ? styles.actionDanger : ''}`}
          disabled={pending}
          onClick={() => act(action.to)}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
