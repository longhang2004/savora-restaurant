'use client';

import React, { useState } from 'react';
import { Send, CheckCircle, Loader2 } from 'lucide-react';
import { submitContactAction } from '@/features/contact/actions';
import type { AppErrorShape } from '@/lib/errors';
import styles from './ContactForm.module.css';

export default function ContactForm() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitError, setSubmitError] = useState<AppErrorShape | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) {
      setErrors((prev) => ({ ...prev, [e.target.name]: [] }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    setErrors({});

    const result = await submitContactAction(formData);

    setIsSubmitting(false);
    if (result.ok) {
      setSubmitted(true);
    } else {
      if (result.error.fieldErrors) {
        setErrors(result.error.fieldErrors);
      }
      setSubmitError(result.error);
    }
  };

  if (submitted) {
    return (
      <div className={`${styles.successCard} glassmorphism`}>
        <CheckCircle className={styles.successIcon} />
        <h3 className={styles.successTitle}>Message Sent!</h3>
        <p className={styles.successText}>
          Thank you for reaching out, <strong>{formData.name}</strong>. Our team has received
          your message and will get back to you shortly.
        </p>
        <button className={styles.resetBtn} onClick={() => setSubmitted(false)}>
          Send Another Message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`${styles.form} glassmorphism`} noValidate>
      <div className={styles.formGroup}>
        <label htmlFor="contact-name" className={styles.label}>
          Your Name
        </label>
        <input
          type="text"
          id="contact-name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="John Doe"
          required
          className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
        />
        {errors.name?.map((msg) => (
          <span key={msg} className={styles.errorText}>
            {msg}
          </span>
        ))}
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="contact-email" className={styles.label}>
          Email Address
        </label>
        <input
          type="email"
          id="contact-email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="john@example.com"
          required
          className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
        />
        {errors.email?.map((msg) => (
          <span key={msg} className={styles.errorText}>
            {msg}
          </span>
        ))}
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="contact-subject" className={styles.label}>
          Subject
        </label>
        <input
          type="text"
          id="contact-subject"
          name="subject"
          value={formData.subject}
          onChange={handleChange}
          placeholder="Private dining, event, general inquiry…"
          required
          className={`${styles.input} ${errors.subject ? styles.inputError : ''}`}
        />
        {errors.subject?.map((msg) => (
          <span key={msg} className={styles.errorText}>
            {msg}
          </span>
        ))}
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="contact-message" className={styles.label}>
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          placeholder="Tell us how we can help…"
          rows={5}
          required
          className={`${styles.textarea} ${errors.message ? styles.inputError : ''}`}
        />
        {errors.message?.map((msg) => (
          <span key={msg} className={styles.errorText}>
            {msg}
          </span>
        ))}
      </div>

      {submitError && !errors.name && !errors.email && !errors.subject && !errors.message && (
        <p className={styles.errorText} role="alert">
          {submitError.message}
        </p>
      )}

      <button type="submit" disabled={isSubmitting} className={styles.submitBtn}>
        {isSubmitting ? (
          <>
            <Loader2 size={16} className={styles.spinner} />
            <span>Sending…</span>
          </>
        ) : (
          <>
            <Send size={16} />
            <span>Send Message</span>
          </>
        )}
      </button>
    </form>
  );
}
