import React from 'react';
import { requireAdminOrRedirect } from '@/lib/auth/guards';
import { getOrdersByStatus } from '@/features/admin/queries';
import { formatCents } from '@/lib/money';
import { utcToLocalDate, utcToLocalTime } from '@/lib/time';
import OrderActions from '@/components/admin/OrderActions';
import styles from '@/components/admin/admin.module.css';

export const dynamic = 'force-dynamic';

const SECTIONS: { title: string; statuses: ('NEW' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'PENDING' | 'CANCELLED')[] }[] = [
  { title: 'New (paid, awaiting kitchen)', statuses: ['NEW'] },
  { title: 'In Progress', statuses: ['ACCEPTED', 'PREPARING'] },
  { title: 'Ready / Completed', statuses: ['READY', 'COMPLETED'] },
  { title: 'Pending Payment', statuses: ['PENDING'] },
  { title: 'Cancelled', statuses: ['CANCELLED'] },
];

export default async function AdminOrdersPage() {
  await requireAdminOrRedirect();

  // Group per status to keep boards tidy.
  const grouped = await Promise.all(
    SECTIONS.map(async (section) => ({
      ...section,
      rows: (
        await Promise.all(
          section.statuses.map(async (status) => {
            const rows = await getOrdersByStatus([status]);
            return rows.map((row) => ({ ...row, status }));
          }),
        )
      ).flat(),
    })),
  );

  return (
    <div>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Order Board</h1>
          <p className={styles.pageSubtitle}>Fulfillment status · payment state tracked separately</p>
        </div>
      </header>

      {grouped.map((section) => (
        <section key={section.title} className={styles.card}>
          <h2 className={styles.cardTitle}>{section.title}</h2>
          {section.rows.length === 0 ? (
            <p className={styles.muted}>Nothing here.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Fulfillment</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {section.rows.map(({ order, items, status }) => (
                  <tr key={order.id}>
                    <td>
                      {order.publicCode}
                      <div className={styles.muted}>
                        {utcToLocalDate(order.createdAt)} {utcToLocalTime(order.createdAt)}
                      </div>
                    </td>
                    <td>
                      {order.fulfillmentType === 'delivery' ? 'Delivery' : 'Pickup'}
                      {order.scheduledFor && (
                        <div className={styles.muted}>
                          {utcToLocalDate(order.scheduledFor)} {utcToLocalTime(order.scheduledFor)}
                        </div>
                      )}
                      {order.deliveryAddress && (
                        <div className={styles.muted}>
                          {order.deliveryAddress.line1}, {order.deliveryAddress.district}
                        </div>
                      )}
                    </td>
                    <td>
                      {order.customerName}
                      <div className={styles.muted}>{order.customerPhone}</div>
                      {order.customerNotes && <div className={styles.muted}>“{order.customerNotes}”</div>}
                    </td>
                    <td>
                      {items.map((item) => (
                        <div key={item.id}>
                          <span style={{ color: 'var(--text-primary)' }}>
                            {item.quantity}× {item.itemName}
                          </span>
                          {item.modifiers.length > 0 && (
                            <div className={styles.muted}>
                              {item.modifiers.map((m) => m.optionName).join(', ')}
                            </div>
                          )}
                          {item.specialInstructions && (
                            <div className={styles.muted}>“{item.specialInstructions}”</div>
                          )}
                        </div>
                      ))}
                    </td>
                    <td>{formatCents(order.totalCents, order.currency)}</td>
                    <td>
                      <span
                        className={`${styles.pill} ${order.paymentStatus === 'PAID' ? styles.pillGreen : styles.pillGray}`}
                      >
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td>
                      <OrderActions orderId={order.id} status={status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ))}
    </div>
  );
}
