'use client';

import React, { useState } from 'react';
import { Calendar, Users, Clock, Mail, Phone, User, CheckCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import styles from './ReservationForm.module.css';

const timeSlots = [
  '11:30 AM', '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM',
  '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM'
];

interface FormState {
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  guests: string;
  notes: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  date?: string;
  time?: string;
  guests?: string;
}

export default function ReservationForm() {
  const [formData, setFormData] = useState<FormState>({
    name: '',
    email: '',
    phone: '',
    date: '',
    time: '',
    guests: '2',
    notes: '',
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

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[0-9+\s-]{8,15}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Invalid phone number';
    }

    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.time) newErrors.time = 'Time is required';
    if (!formData.guests) newErrors.guests = 'Party size is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
    }, 2000);
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`${styles.successCard} glassmorphism`}
      >
        <CheckCircle className={styles.successIcon} />
        <h3 className={styles.successTitle}>Reservation Requested!</h3>
        <p className={styles.successText}>
          Thank you, <strong>{formData.name}</strong>. We have received your booking request. Our team will verify table availability and send a confirmation to <strong>{formData.email}</strong> shortly.
        </p>

        <div className={styles.summaryTable}>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Guests:</span>
            <span className={styles.summaryVal}>{formData.guests} people</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Date:</span>
            <span className={styles.summaryVal}>{formData.date}</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Time:</span>
            <span className={styles.summaryVal}>{formData.time}</span>
          </div>
        </div>

        <button onClick={() => setSuccess(false)} className={styles.resetBtn}>
          Make Another Booking
        </button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`${styles.form} glassmorphism`}>
      {/* 2 Column Details */}
      <div className={styles.formGrid}>
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

        {/* Phone */}
        <div className={styles.formGroup}>
          <label htmlFor="phone" className={styles.label}>
            <Phone size={14} className={styles.labelIcon} />
            <span>Phone Number</span>
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="+84 786 907 453"
            className={`${styles.input} ${errors.phone ? styles.inputError : ''}`}
          />
          {errors.phone && <span className={styles.errorText}>{errors.phone}</span>}
        </div>

        {/* Party Size */}
        <div className={styles.formGroup}>
          <label htmlFor="guests" className={styles.label}>
            <Users size={14} className={styles.labelIcon} />
            <span>Party Size</span>
          </label>
          <select
            id="guests"
            name="guests"
            value={formData.guests}
            onChange={handleChange}
            className={styles.select}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
              <option key={num} value={num.toString()}>
                {num} {num === 1 ? 'Guest' : 'Guests'}
              </option>
            ))}
            <option value="9+">9+ Guests (Large Group)</option>
          </select>
        </div>

        {/* Date */}
        <div className={styles.formGroup}>
          <label htmlFor="date" className={styles.label}>
            <Calendar size={14} className={styles.labelIcon} />
            <span>Preferred Date</span>
          </label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            min={new Date().toISOString().split('T')[0]}
            className={`${styles.input} ${errors.date ? styles.inputError : ''}`}
          />
          {errors.date && <span className={styles.errorText}>{errors.date}</span>}
        </div>

        {/* Time */}
        <div className={styles.formGroup}>
          <label htmlFor="time" className={styles.label}>
            <Clock size={14} className={styles.labelIcon} />
            <span>Select Time</span>
          </label>
          <select
            id="time"
            name="time"
            value={formData.time}
            onChange={handleChange}
            className={`${styles.select} ${errors.time ? styles.inputError : ''}`}
          >
            <option value="">Choose slot...</option>
            {timeSlots.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>
          {errors.time && <span className={styles.errorText}>{errors.time}</span>}
        </div>
      </div>

      {/* Special Requests */}
      <div className={styles.formGroup} style={{ marginTop: '1.5rem' }}>
        <label htmlFor="notes" className={styles.label}>
          <span>Special Requests / Dietary Restrictions</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Let us know if you are celebrating a special occasion or have any food allergies (e.g. gluten-free, peanut allergy)..."
          rows={4}
          className={styles.textarea}
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className={styles.submitBtn}
      >
        {loading ? (
          <>
            <Loader2 size={16} className={styles.spinner} />
            <span>Processing booking request...</span>
          </>
        ) : (
          <span>Submit Reservation Request</span>
        )}
      </button>
    </form>
  );
}
