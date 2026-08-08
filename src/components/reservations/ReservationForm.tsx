'use client';

/**
 * Real reservation flow:
 *   party size + date → server-computed availability (available/limited/full)
 *   → slot selection → customer details → transactional booking
 *   → real confirmation with code.
 */
import React, { useState } from 'react';
import { Calendar, Users, Mail, Phone, User, CheckCircle, Loader2, RefreshCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { restaurantConfig, RESTAURANT_TIMEZONE } from '@/config/restaurant';
import {
  createReservationAction,
} from '@/features/reservations/actions';
import type { AppErrorShape } from '@/lib/errors';
import styles from './ReservationForm.module.css';

interface AvailabilitySlot {
  time: string;
  periodId: string;
  periodLabel: string;
  status: 'available' | 'limited' | 'full';
  startsAtISO: string;
}

interface ReservationResult {
  confirmationCode: string;
  customerName: string;
  partySize: number;
  startsAtISO: string;
  tableName: string;
  tableArea: string;
}

const MAX_PARTY = restaurantConfig.reservation.maxOnlinePartySize;

interface ReservationFormProps {
  minDate: string;
  maxDate: string;
}

export default function ReservationForm({ minDate, maxDate }: ReservationFormProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [partySize, setPartySize] = useState('2');
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<AvailabilitySlot[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<AppErrorShape | null>(null);
  const [result, setResult] = useState<ReservationResult | null>(null);

  const loadAvailability = async () => {
    if (!date) return;
    setLoadingSlots(true);
    setSlotError(null);
    setSelectedTime(null);
    setSlots(null);
    try {
      const res = await fetch(
        `/api/reservations/availability?date=${encodeURIComponent(date)}&partySize=${encodeURIComponent(partySize)}`,
      );
      const body = await res.json();
      if (!res.ok) {
        setSlotError(body.error?.message ?? 'Could not load availability.');
        return;
      }
      setSlots(body.slots);
      setStep(2);
    } catch {
      setSlotError('Could not reach the server. Please try again.');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTime || submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    const res = await createReservationAction({
      date,
      time: selectedTime,
      partySize: Number(partySize),
      name,
      email,
      phone,
      notes: notes || '',
      source: 'online',
    });

    setSubmitting(false);
    if (res.ok) {
      setResult(res.data);
      setStep(3);
    } else {
      setSubmitError(res.error);
    }
  };

  // ── Step 3: real confirmation ──────────────────────────────────────
  if (step === 3 && result) {
    const local = new Date(result.startsAtISO);
    const dateLabel = local.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: RESTAURANT_TIMEZONE,
    });
    const timeLabel = local.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: RESTAURANT_TIMEZONE,
    });

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`${styles.successCard} glassmorphism`}
      >
        <CheckCircle className={styles.successIcon} />
        <h3 className={styles.successTitle}>Reservation Confirmed!</h3>
        <p className={styles.successText}>
          Thank you, <strong>{result.customerName}</strong>. Your table at{' '}
          <strong>{result.tableName}</strong> ({result.tableArea}) is reserved for{' '}
          <strong>{result.partySize}</strong> {result.partySize === 1 ? 'guest' : 'guests'} on{' '}
          {dateLabel} at {timeLabel}.
        </p>

        <div className={styles.codeBox}>
          <span className={styles.codeLabel}>Confirmation code</span>
          <span className={styles.codeValue}>{result.confirmationCode}</span>
          <span className={styles.codeHint}>
            A confirmation email is on its way. Please show this code when you arrive.
          </span>
        </div>

        <button
          onClick={() => {
            setStep(1);
            setResult(null);
            setSlots(null);
            setSelectedTime(null);
          }}
          className={styles.resetBtn}
        >
          Make Another Booking
        </button>
      </motion.div>
    );
  }

  // ── Step 2: slot selection + details ───────────────────────────────
  if (step === 2 && slots) {
    return (
      <form onSubmit={handleSubmit} className={`${styles.form} glassmorphism`}>
        <button
          type="button"
          className={styles.backLink}
          onClick={() => {
            setStep(1);
            setSlots(null);
          }}
        >
          ← Change date or party size
        </button>

        <div className={styles.slotsHeader}>
          <h3 className={styles.slotsTitle}>Available times</h3>
          <p className={styles.slotsMeta}>
            {new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}{' '}
            · {partySize} {partySize === '1' ? 'guest' : 'guests'}
          </p>
        </div>

        {slotError && (
          <div className={styles.errorBox} role="alert">
            {slotError}
            <button type="button" className={styles.retryBtn} onClick={loadAvailability}>
              <RefreshCcw size={13} /> Try again
            </button>
          </div>
        )}

        {slots.length === 0 && !slotError && (
          <p className={styles.noSlots}>
            No bookable slots on this date. Please try another day or contact us for large
            parties.
          </p>
        )}

        <div className={styles.periodGroups}>
          {['lunch', 'dinner'].map((periodId) => {
            const periodSlots = slots.filter((s) => s.periodId === periodId);
            if (periodSlots.length === 0) return null;
            return (
              <div key={periodId} className={styles.periodGroup}>
                <span className={styles.periodLabel}>
                  {periodSlots[0].periodLabel}
                </span>
                <div className={styles.slotGrid}>
                  {periodSlots.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={slot.status === 'full'}
                      onClick={() => setSelectedTime(slot.time)}
                      className={`${styles.slotBtn} ${
                        selectedTime === slot.time ? styles.slotSelected : ''
                      } ${slot.status === 'full' ? styles.slotFull : ''}`}
                    >
                      <span className={styles.slotTime}>{slot.time}</span>
                      <span className={styles.slotStatus}>
                        {slot.status === 'available' && 'Available'}
                        {slot.status === 'limited' && 'Limited'}
                        {slot.status === 'full' && 'Full'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {submitError && (
          <div className={styles.errorBox} role="alert">
            {submitError.message}
            {submitError.code === 'RESERVATION_SLOT_UNAVAILABLE' && (
              <button type="button" className={styles.retryBtn} onClick={loadAvailability}>
                <RefreshCcw size={13} /> Reload availability
              </button>
            )}
          </div>
        )}

        <div className={styles.divider} />

        <h3 className={styles.slotsTitle}>Your details</h3>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label htmlFor="res-name" className={styles.label}>
              <User size={14} className={styles.labelIcon} />
              <span>Full Name</span>
            </label>
            <input
              type="text"
              id="res-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="res-email" className={styles.label}>
              <Mail size={14} className={styles.labelIcon} />
              <span>Email Address</span>
            </label>
            <input
              type="email"
              id="res-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              required
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="res-phone" className={styles.label}>
              <Phone size={14} className={styles.labelIcon} />
              <span>Phone Number</span>
            </label>
            <input
              type="tel"
              id="res-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+84 786 907 453"
              required
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="res-notes" className={styles.label}>
            <span>Special Requests / Dietary Restrictions</span>
          </label>
          <textarea
            id="res-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Celebrations, allergies, seating preferences…"
            rows={3}
            maxLength={500}
            className={styles.textarea}
          />
        </div>

        <button type="submit" disabled={!selectedTime || submitting} className={styles.submitBtn}>
          {submitting ? (
            <>
              <Loader2 size={16} className={styles.spinner} />
              <span>Confirming your table…</span>
            </>
          ) : (
            <span>Confirm Reservation</span>
          )}
        </button>
      </form>
    );
  }

  // ── Step 1: party size + date ──────────────────────────────────────
  return (
    <div className={`${styles.form} glassmorphism`}>
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label htmlFor="res-guests" className={styles.label}>
            <Users size={14} className={styles.labelIcon} />
            <span>Party Size</span>
          </label>
          <select
            id="res-guests"
            value={partySize}
            onChange={(e) => setPartySize(e.target.value)}
            className={styles.select}
          >
            {Array.from({ length: MAX_PARTY }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? 'Guest' : 'Guests'}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="res-date" className={styles.label}>
            <Calendar size={14} className={styles.labelIcon} />
            <span>Date</span>
          </label>
          <input
            type="date"
            id="res-date"
            value={date}
            min={minDate}
            max={maxDate}
            onChange={(e) => setDate(e.target.value)}
            required
            className={styles.input}
          />
        </div>
      </div>

      {slotError && (
        <div className={styles.errorBox} role="alert">
          {slotError}
        </div>
      )}

      <button
        type="button"
        disabled={!date || loadingSlots}
        onClick={loadAvailability}
        className={styles.submitBtn}
      >
        {loadingSlots ? (
          <>
            <Loader2 size={16} className={styles.spinner} />
            <span>Checking availability…</span>
          </>
        ) : (
          <span>Check Availability</span>
        )}
      </button>

      <p className={styles.largePartyNote}>
        Hosting more than {MAX_PARTY} guests?{' '}
        <a href="/contact" className={styles.largePartyLink}>
          Contact our events team
        </a>{' '}
        for private dining.
      </p>
    </div>
  );
}
