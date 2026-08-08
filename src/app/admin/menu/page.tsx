import React from 'react';
import Link from 'next/link';
import { requireAdminOrRedirect } from '@/lib/auth/guards';
import { getMenuForAdmin } from '@/features/admin/queries';
import { formatCents } from '@/lib/money';
import AvailabilityToggle from '@/components/admin/AvailabilityToggle';
import styles from '@/components/admin/admin.module.css';

export const dynamic = 'force-dynamic';

export default async function AdminMenuPage() {
  await requireAdminOrRedirect();
  const { categories, items } = await getMenuForAdmin();
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? '—';

  return (
    <div>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Menu</h1>
          <p className={styles.pageSubtitle}>
            {items.length} items · toggle availability to reflect sold-out states instantly
          </p>
        </div>
      </header>

      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Item</th>
              <th>Category</th>
              <th>Price</th>
              <th>Modifiers</th>
              <th>Signature</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{item.name}</span>
                  <div className={styles.muted}>{item.slug}</div>
                </td>
                <td>{categoryName(item.categoryId)}</td>
                <td>{formatCents(item.priceCents)}</td>
                <td>{item.modifierGroups.length}</td>
                <td>{item.isFeatured ? '★' : '—'}</td>
                <td>
                  <AvailabilityToggle itemId={item.id} isAvailable={item.isAvailable} />
                </td>
                <td>
                  <Link href={`/admin/menu/${item.id}`} className={styles.actionBtn}>
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
