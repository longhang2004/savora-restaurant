'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut } from 'lucide-react';
import { logoutAction } from '@/features/admin/auth-actions';
import styles from './admin.module.css';

export default function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  const handleLogout = async () => {
    setPending(true);
    await logoutAction();
    router.push('/admin/login');
    router.refresh();
  };

  return (
    <button className={styles.logoutBtn} onClick={handleLogout} disabled={pending}>
      {pending ? <Loader2 size={15} className={styles.spinner} /> : <LogOut size={15} />}
      <span>Sign out</span>
    </button>
  );
}
