import React from 'react';
import Link from 'next/link';
import { Banknote, ShoppingBag, CalendarDays, TrendingUp } from 'lucide-react';
import { requireAdminOrRedirect } from '@/lib/auth/guards';
import { getDashboardMetrics } from '@/features/admin/queries';
import { formatCents } from '@/lib/money';
import { utcToLocalDate, utcToLocalTime } from '@/lib/time';
import styles from '@/components/admin/admin.module.css';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  await requireAdminOrRedirect();
  const metrics = await getDashboardMetrics();

  const metricCards = [
    {
      label: "Today's Revenue",
      value: formatCents(metrics.revenueTodayCents),
      icon: Banknote,
    },
    { label: 'Paid Orders Today', value: String(metrics.paidOrdersToday), icon: ShoppingBag },
    { label: 'Reservations Today', value: String(metrics.reservationsToday), icon: CalendarDays },
    {
      label: 'Average Order Value',
      value: formatCents(metrics.averageOrderValueCents),
      icon: TrendingUp,
    },
  ];

  return (
    <div>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageSubtitle}>Today at Savora — {utcToLocalDate(new Date())}</p>
        </div>
      </header>

      <div className={styles.metricsGrid}>
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={styles.metricCard}>
              <span className={styles.metricLabel}>
                <Icon size={13} /> {card.label}
              </span>
              <div className={styles.metricValue}>{card.value}</div>
            </div>
          );
        })}
      </div>

      <div className={styles.twoCol}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <CalendarDays size={15} /> Today&apos;s Reservations
            <Link href="/admin/reservations" className={styles.link} style={{ marginLeft: 'auto', fontSize: '0.8rem' }}>
              View all →
            </Link>
          </h2>
          {metrics.todayReservations.length === 0 ? (
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
                </tr>
              </thead>
              <tbody>
                {metrics.todayReservations.map((r) => (
                  <tr key={r.id}>
                    <td>{utcToLocalTime(r.startsAt)}</td>
                    <td>{r.customerName}</td>
                    <td>{r.partySize}</td>
                    <td>{r.tables.map((t) => t.name).join(', ') || '—'}</td>
                    <td>
                      <span className={`${styles.pill} ${styles.pillGold}`}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <ShoppingBag size={15} /> Recent Orders
            <Link href="/admin/orders" className={styles.link} style={{ marginLeft: 'auto', fontSize: '0.8rem' }}>
              Open board →
            </Link>
          </h2>
          {metrics.recentOrders.length === 0 ? (
            <p className={styles.muted}>No orders yet.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Payment</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recentOrders.map(({ order }) => (
                  <tr key={order.id}>
                    <td>{order.publicCode}</td>
                    <td>{order.customerName}</td>
                    <td>{formatCents(order.totalCents, order.currency)}</td>
                    <td>
                      <span className={`${styles.pill} ${styles.pillBlue}`}>{order.status}</span>
                    </td>
                    <td>
                      <span className={`${styles.pill} ${order.paymentStatus === 'PAID' ? styles.pillGreen : styles.pillGray}`}>
                        {order.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
