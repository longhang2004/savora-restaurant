import React from 'react';
import { requireAdminOrRedirect } from '@/lib/auth/guards';
import { getReservationsForRange, getUpcomingReservations, getPastReservations } from '@/features/admin/queries';
import { localDayBounds } from '@/lib/time';
import { utcToLocalDate, utcToLocalTime } from '@/lib/time';
import ReservationActions from '@/components/admin/ReservationActions';
import StaffReservationForm from '@/components/admin/StaffReservationForm';
import styles from '@/components/admin/admin.module.css';

export const dynamic = 'force-dynamic';

const STATUS_PILL: Record<string, string> = {
  CONFIRMED: styles.pillGold,
  SEATED: styles.pillBlue,
  COMPLETED: styles.pillGreen,
  CANCELLED: styles.pillGray,
  NO_SHOW: styles.pillRed,
};

export default async function AdminReservationsPage() {
  await requireAdminOrRedirect();

  const { start, end } = localDayBounds(utcToLocalDate(new Date()));
  const [today, upcoming, past] = await Promise.all([
    getReservationsForRange(start, end),
    getUpcomingReservations(30),
    getPastReservations(20),
  ]);

  return (
    <div>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Reservations</h1>
          <p className={styles.pageSubtitle}>
            {utcToLocalDate(new Date())} · {today.length} today · {upcoming.length} upcoming
          </p>
        </div>
        <StaffReservationForm />
      </header>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Today</h2>
        {today.length === 0 ? (
          <p className={styles.muted}>No reservations today.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Time</th>
                <th>Guest</th>
                <th>Party</th>
                <th>Table</th>
                <th>Status</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {today.map((r) => (
                <tr key={r.id}>
                  <td>{utcToLocalTime(r.startsAt)}</td>
                  <td>
                    {r.customerName}
                    <div className={styles.muted}>{r.customerPhone}</div>
                  </td>
                  <td>{r.partySize}</td>
                  <td>{r.tables.map((t) => t.name).join(', ') || '—'}</td>
                  <td>
                    <span className={`${styles.pill} ${STATUS_PILL[r.status]}`}>{r.status}</span>
                  </td>
                  <td className={styles.muted}>{r.notes ?? '—'}</td>
                  <td>
                    <ReservationActions reservationId={r.id} status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className={styles.muted}>No upcoming reservations.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Guest</th>
                <th>Party</th>
                <th>Table</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map((r) => (
                <tr key={r.id}>
                  <td>{utcToLocalDate(r.startsAt)}</td>
                  <td>{utcToLocalTime(r.startsAt)}</td>
                  <td>
                    {r.customerName}
                    <div className={styles.muted}>{r.customerEmail}</div>
                  </td>
                  <td>{r.partySize}</td>
                  <td>{r.tables.map((t) => t.name).join(', ') || '—'}</td>
                  <td>
                    <span className={`${styles.pill} ${STATUS_PILL[r.status]}`}>{r.status}</span>
                  </td>
                  <td>
                    <ReservationActions reservationId={r.id} status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Past</h2>
        {past.length === 0 ? (
          <p className={styles.muted}>No past reservations.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Guest</th>
                <th>Party</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {past.map((r) => (
                <tr key={r.id}>
                  <td>{utcToLocalDate(r.startsAt)}</td>
                  <td>{utcToLocalTime(r.startsAt)}</td>
                  <td>{r.customerName}</td>
                  <td>{r.partySize}</td>
                  <td>
                    <span className={`${styles.pill} ${STATUS_PILL[r.status]}`}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
