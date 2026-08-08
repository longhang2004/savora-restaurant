'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, X } from 'lucide-react';
import { createStaffReservationAction } from '@/features/admin/actions';
import { restaurantConfig, RESTAURANT_TIMEZONE } from '@/config/restaurant';
import { getRestaurantToday } from '@/lib/time';
import styles from './admin.module.css';

/**
 * Staff-created bookings reuse the exact same allocation engine as the
 * online form (transactional availability + table assignment).
 */
export default function StaffReservationForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    partySize: '2',
    date: getRestaurantToday(),
    time: '18:30',
    notes: '',
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createStaffReservationAction({
        ...form,
        partySize: Number(form.partySize),
        source: 'staff',
      });
      if (result.ok) {
        setOpen(false);
        setForm({ ...form, name: '', email: '', phone: '', notes: '' });
        router.refresh();
      } else {
        setError(result.error.message);
      }
    });
  };

  if (!open) {
    return (
      <button className={styles.actionBtn} onClick={() => setOpen(true)}>
        <Plus size={13} /> Add Reservation
      </button>
    );
  }

  return (
    <div className={styles.card} style={{ borderColor: 'rgba(200,155,60,0.35)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 className={styles.cardTitle} style={{ margin: 0 }}>
          Staff Booking
        </h3>
        <button className={styles.actionBtn} onClick={() => setOpen(false)} aria-label="Close">
          <X size={13} />
        </button>
      </div>

      <form onSubmit={submit} className={styles.twoCol}>
        <label className={styles.field}>
          <span className={styles.label}>Full Name</span>
          <input
            className={styles.input}
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Email</span>
          <input
            type="email"
            className={styles.input}
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Phone</span>
          <input
            type="tel"
            className={styles.input}
            required
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Party Size</span>
          <select
            className={styles.input}
            value={form.partySize}
            onChange={(e) => setForm({ ...form, partySize: e.target.value })}
          >
            {Array.from({ length: restaurantConfig.reservation.maxOnlinePartySize }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Date ({RESTAURANT_TIMEZONE})</span>
          <input
            type="date"
            className={styles.input}
            required
            min={getRestaurantToday()}
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Time</span>
          <input
            type="time"
            className={styles.input}
            required
            value={form.time}
            onChange={(e) => setForm({ ...form, time: e.target.value })}
          />
        </label>
        <label className={styles.field} style={{ gridColumn: '1 / -1' }}>
          <span className={styles.label}>Notes</span>
          <textarea
            className={styles.input}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </label>

        {error && (
          <p className={styles.errorText} style={{ gridColumn: '1 / -1' }} role="alert">
            {error}
          </p>
        )}

        <button type="submit" className={styles.primaryBtn} disabled={pending} style={{ gridColumn: '1 / -1' }}>
          {pending ? <Loader2 size={15} className={styles.spinner} /> : 'Book Table'}
        </button>
      </form>
    </div>
  );
}
