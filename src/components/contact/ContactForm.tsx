'use client';

import React, { useState } from 'react';
import { Mail, MessageSquare, User, CheckCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import styles from './ContactForm.module.css';

interface FormState {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

export default function ContactForm() {
  const [formData, setFormData] = useState<FormState>({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!formData.subject.trim()) newErrors.subject = 'Subject is required';
    if (!formData.message.trim()) newErrors.message = 'Message content is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    // Simulate API request
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
    }, 1500);
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`${styles.successCard} glassmorphism`}
      >
        <CheckCircle className={styles.successIcon} />
        <h3 className={styles.successTitle}>Message Sent!</h3>
        <p className={styles.successText}>
          Thank you, <strong>{formData.name}</strong>. We have received your inquiry and our guest relations team will get back to you at <strong>{formData.email}</strong> within 24 hours.
        </p>

        <button onClick={() => setSuccess(false)} className={styles.resetBtn}>
          Send Another Message
        </button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`${styles.form} glassmorphism`}>
      {/* Name */}
      <div className={styles.formGroup}>
        <label htmlFor="name" className={styles.label}>
          <User size={14} className={styles.labelIcon} />
          <span>Full Name</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="John Doe"
          className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
        />
        {errors.name && <span className={styles.errorText}>{errors.name}</span>}
      </div>

      {/* Email */}
      <div className={styles.formGroup}>
        <label htmlFor="email" className={styles.label}>
          <Mail size={14} className={styles.labelIcon} />
          <span>Email Address</span>
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="john@example.com"
          className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
        />
        {errors.email && <span className={styles.errorText}>{errors.email}</span>}
      </div>

      {/* Subject */}
      <div className={styles.formGroup}>
        <label htmlFor="subject" className={styles.label}>
          <MessageSquare size={14} className={styles.labelIcon} />
          <span>Subject</span>
        </label>
        <input
          type="text"
          id="subject"
          name="subject"
          value={formData.subject}
          onChange={handleChange}
          placeholder="General Inquiry, Private Events, Careers..."
          className={`${styles.input} ${errors.subject ? styles.inputError : ''}`}
        />
        {errors.subject && <span className={styles.errorText}>{errors.subject}</span>}
      </div>

      {/* Message */}
      <div className={styles.formGroup}>
        <label htmlFor="message" className={styles.label}>
          <span>Your Message</span>
        </label>
        <textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          placeholder="How can we help you?"
          rows={5}
          className={`${styles.textarea} ${errors.message ? styles.inputError : ''}`}
        />
        {errors.message && <span className={styles.errorText}>{errors.message}</span>}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className={styles.submitBtn}
      >
        {loading ? (
          <>
            <Loader2 size={16} className={styles.spinner} />
            <span>Sending Message...</span>
          </>
        ) : (
          <span>Send Message</span>
        )}
      </button>
    </form>
  );
}
