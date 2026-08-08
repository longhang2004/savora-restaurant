import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdminOrRedirect } from '@/lib/auth/guards';
import { getMenuForAdmin } from '@/features/admin/queries';
import MenuItemEditor from '@/components/admin/MenuItemEditor';
import styles from '@/components/admin/admin.module.css';

export const dynamic = 'force-dynamic';

export default async function AdminMenuItemPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  await requireAdminOrRedirect();
  const { itemId } = await params;

  const { categories, items } = await getMenuForAdmin();
  const item = items.find((i) => i.id === itemId);
  if (!item) notFound();

  return (
    <div>
      <header className={styles.pageHeader}>
        <div>
          <Link href="/admin/menu" className={styles.muted} style={{ textDecoration: 'none' }}>
            ← Back to menu
          </Link>
          <h1 className={styles.pageTitle}>{item.name}</h1>
        </div>
      </header>

      <MenuItemEditor item={item} categories={categories} />
    </div>
  );
}
