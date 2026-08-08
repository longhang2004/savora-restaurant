'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { loginAction } from '@/features/admin/auth-actions';
import type { AppErrorShape } from '@/lib/errors';
import styles from './admin.module.css';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<AppErrorShape | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const result = await loginAction({ email, password });
    setSubmitting(false);
    if (result.ok) {
      router.push('/admin');
      router.refresh();
    } else {
      setError(result.error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`${styles.loginCard} glassmorphism`}>
      <h1 className={styles.loginTitle}>Staff Sign In</h1>
      <p className={styles.loginSubtitle}>Restaurant operations console</p>

      <label className={styles.field}>
        <span className={styles.label}>Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@savora.vn"
          required
          className={styles.input}
          autoComplete="email"
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Password</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className={styles.input}
          autoComplete="current-password"
        />
      </label>

      {error && (
        <p className={styles.errorText} role="alert">
          {error.message}
        </p>
      )}

      <button type="submit" disabled={submitting} className={styles.primaryBtn}>
        {submitting ? (
          <>
            <Loader2 size={15} className={styles.spinner} /> Signing in…
          </>
        ) : (
          'Sign In'
        )}
      </button>
    </form>
  );
}
