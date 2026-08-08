'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { subscribeNewsletterAction } from '@/features/contact/actions';
import styles from './NewsletterForm.module.css';

export default function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === 'loading') return;
    setState('loading');
    setMessage('');
    const result = await subscribeNewsletterAction({ email });
    if (result.ok) {
      setState('done');
      setMessage('Welcome to the Gazette — you are subscribed.');
    } else {
      setState('error');
      setMessage(result.error.message);
    }
  };

  if (state === 'done') {
    return (
      <p className={styles.done} role="status">
        {message}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <label htmlFor="newsletter-email" className={styles.label}>
        Email address
      </label>
      <div className={styles.row}>
        <input
          id="newsletter-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className={styles.input}
        />
        <button type="submit" disabled={state === 'loading'} className={styles.button}>
          {state === 'loading' ? <Loader2 size={14} className={styles.spinner} /> : 'Subscribe'}
        </button>
      </div>
      {state === 'error' && (
        <p className={styles.error} role="alert">
          {message}
        </p>
      )}
    </form>
  );
}
