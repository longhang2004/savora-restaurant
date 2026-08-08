import React from 'react';
import Link from 'next/link';
import { LayoutDashboard, CalendarDays, ShoppingBag, UtensilsCrossed, ChefHat } from 'lucide-react';
import { getSession } from '@/lib/auth/guards';
import LogoutButton from '@/components/admin/LogoutButton';
import styles from '@/components/admin/admin.module.css';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  // No valid session (e.g. the login screen): render the page bare.
  // Protection is enforced by the middleware redirect plus per-page and
  // per-mutation requireAdmin() checks.
  if (!session) {
    return <>{children}</>;
  }

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { href: '/admin/reservations', label: 'Reservations', icon: CalendarDays },
    { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
    { href: '/admin/menu', label: 'Menu', icon: UtensilsCrossed },
  ];

  return (
    <div className={styles.adminShell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <ChefHat size={22} className={styles.brandIcon} />
          <span>
            Savora <em>Ops</em>
          </span>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={styles.navLink}>
                <Icon size={17} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.adminInfo}>
            <span className={styles.adminName}>{session.displayName}</span>
            <span className={styles.adminRole}>
              {session.role} · {session.mode === 'demo' ? 'demo' : 'staff'}
            </span>
          </div>
          <LogoutButton />
        </div>
      </aside>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
